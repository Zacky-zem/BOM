import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import pool from '@/lib/db';
import fs from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';

function formatMonth(periode: string): string {
  const [y, m] = periode.split('-').map(Number);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[m - 1]} ${y}`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const periode = url.searchParams.get('periode');
  const dari = url.searchParams.get('dari');
  const sampai = url.searchParams.get('sampai');
  const assyFilter = url.searchParams.get('assy_codes');
  const search = url.searchParams.get('search') || '';

  const isGabungan = !periode && !!dari && !!sampai;

  if (!isGabungan && !periode) {
    return NextResponse.json(
      { error: 'Parameter periode atau dari+sampai wajib diisi' },
      { status: 400 }
    );
  }

  const assyParams = assyFilter
    ? assyFilter.split(',').map(a => a.trim()).filter(Boolean)
    : [];
  const hasAssyFilter = assyParams.length > 0;
  const hasSearch = search.trim().length > 0;
  const searchParam = hasSearch ? `%${search.trim()}%` : null;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let connection;
      try {
        connection = await pool.connect();
        
        const sendEvent = (event: any) => {
          const data = JSON.stringify(event);
          const message = `data: ${data}\n\n`;
          controller.enqueue(encoder.encode(message));
        };

        sendEvent({ progress: 5, status: 'Mempersiapkan data...' });

        // Get period list
        let periodeList: string[] = [];
        if (isGabungan) {
          const periodeResult = await connection.query(
            `SELECT DISTINCT periode FROM bom WHERE periode >= $1 AND periode <= $2 ORDER BY periode`,
            [dari, sampai]
          );
          periodeList = periodeResult.rows.map(r => r.periode);
        } else {
          periodeList = [periode as string];
        }

        if (periodeList.length === 0) {
          sendEvent({ error: 'Tidak ada data periode yang ditemukan' });
          controller.close();
          return;
        }

        sendEvent({ progress: 8, status: `Ditemukan ${periodeList.length} periode` });

        // Create workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Report');

        // Setup headers
        const headers = ['PART NO', 'PART NO AS400', 'SUPPLIER', 'PART NAME', 'UNIT', ...periodeList.map(p => formatMonth(p)), 'TOTAL', 'TOTAL USAGE'];
        const headerRow = worksheet.addRow(headers);
        
        // Style header row
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1f2937' } };
        headerRow.alignment = { horizontal: 'center', vertical: 'center' };
        headerRow.height = 20;

        // Setup columns
        worksheet.columns = [
          { width: 15 },
          { width: 15 },
          { width: 20 },
          { width: 25 },
          { width: 10 },
          ...periodeList.map(() => ({ width: 12 })),
          { width: 12 },
          { width: 15 }
        ];

        sendEvent({ progress: 10, status: 'Mengambil data dari database...' });

        // Build WHERE clause parameters
        let paramIndex = 1;
        const params: any[] = [];
        let whereClause = '1=1';

        if (isGabungan) {
          whereClause += ` AND q.periode >= $${paramIndex} AND q.periode <= $${paramIndex + 1}`;
          params.push(dari, sampai);
          paramIndex += 2;
        } else {
          whereClause += ` AND q.periode = $${paramIndex}`;
          params.push(periode);
          paramIndex += 1;
        }

        if (hasSearch) {
          whereClause += ` AND (p.part_no ILIKE $${paramIndex} OR p.part_name ILIKE $${paramIndex})`;
          params.push(searchParam);
          paramIndex += 1;
        }

        if (hasAssyFilter) {
          const placeholders = assyParams.map(() => `$${paramIndex++}`).join(',');
          whereClause += ` AND p.id IN (SELECT part_id FROM part_assy WHERE assy_code IN (${placeholders}))`;
          params.push(...assyParams);
        }

        // Simple, fast query without aggregation
        const query = `
          SELECT 
            p.part_no,
            p.part_no_as400,
            COALESCE(s.supplier_name, '-') as supplier,
            p.part_name,
            p.unit,
            q.periode,
            COALESCE(q.qty, 0) as qty
          FROM part p
          LEFT JOIN supplier s ON p.supplier_id = s.id
          LEFT JOIN part_qty q ON p.id = q.part_id
          WHERE ${whereClause}
          ORDER BY p.part_no, q.periode
        `;

        console.log('[Export] Query:', query);
        console.log('[Export] Params:', params);

        // Use cursor to stream data in batches
        await connection.query('BEGIN');
        await connection.query(`DECLARE data_cursor SCROLL CURSOR FOR ${query}`, params);

        // Get total count for progress estimation
        const countQuery = `SELECT COUNT(DISTINCT p.id) as total FROM part p
          LEFT JOIN supplier s ON p.supplier_id = s.id
          LEFT JOIN part_qty q ON p.id = q.part_id
          WHERE ${whereClause}`;
        const countResult = await connection.query(countQuery, params);
        const totalParts = countResult.rows[0]?.total || 0;

        console.log('[Export] Total parts:', totalParts);

        let rowCount = 0;
        let batchSize = 5000;
        let currentProgress = 15;
        let hasMoreRows = true;
        let lastPartNo = '';
        let partData: Record<string, any> = {};

        while (hasMoreRows) {
          const result = await connection.query(`FETCH ${batchSize} FROM data_cursor`);
          const rows = result.rows;

          if (rows.length === 0) {
            hasMoreRows = false;
            // Write last part if exists
            if (lastPartNo && partData[lastPartNo]) {
              const part = partData[lastPartNo];
              const values = [
                part.part_no,
                part.part_no_as400,
                part.supplier,
                part.part_name,
                part.unit,
                ...periodeList.map(p => part.quantities?.[p] || 0),
                part.total || 0,
                part.total_usage || 0
              ];
              worksheet.addRow(values);
              rowCount++;
            }
            break;
          }

          // Process rows - group by part_no
          for (const row of rows) {
            const { part_no, part_no_as400, supplier, part_name, unit, periode: rowPeriode, qty } = row;

            if (lastPartNo && lastPartNo !== part_no) {
              // Write previous part
              const part = partData[lastPartNo];
              const values = [
                part.part_no,
                part.part_no_as400,
                part.supplier,
                part.part_name,
                part.unit,
                ...periodeList.map(p => part.quantities?.[p] || 0),
                part.total || 0,
                part.total_usage || 0
              ];
              worksheet.addRow(values);
              rowCount++;
              partData = {};
            }

            if (!partData[part_no]) {
              partData[part_no] = {
                part_no,
                part_no_as400,
                supplier,
                part_name,
                unit,
                quantities: {},
                total: 0,
                total_usage: 0
              };
            }

            if (rowPeriode && qty) {
              partData[part_no].quantities[rowPeriode] = qty;
              partData[part_no].total += qty;
            }

            lastPartNo = part_no;
          }

          // Update progress
          const estimatedProgress = totalParts > 0 ? 15 + (rowCount / totalParts) * 70 : 50;
          currentProgress = Math.min(estimatedProgress, 95);
          sendEvent({
            progress: Math.round(currentProgress),
            status: `Diproses ${rowCount.toLocaleString('id-ID')} part dari ${totalParts.toLocaleString('id-ID')}...`
          });
        }

        await connection.query('CLOSE data_cursor');
        await connection.query('COMMIT');

        sendEvent({ progress: 96, status: 'Membuat file Excel...' });

        // Write workbook to temporary file
        const tempDir = path.join(process.cwd(), '.tmp');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }

        const fileName = `report_${randomBytes(8).toString('hex')}.xlsx`;
        const filePath = path.join(tempDir, fileName);

        await workbook.xlsx.writeFile(filePath);

        sendEvent({ progress: 98, status: 'Menyiapkan download...' });

        // Return download URL
        const downloadUrl = `/api/report/download?file=${fileName}`;
        sendEvent({
          progress: 100,
          status: `Selesai! ${rowCount.toLocaleString('id-ID')} part berhasil diexport`,
          downloadUrl
        });

        controller.close();
      } catch (error) {
        console.error('[Export Error]', error);
        const sendEvent = (event: any) => {
          const data = JSON.stringify(event);
          const message = `data: ${data}\n\n`;
          controller.enqueue(encoder.encode(message));
        };
        sendEvent({ error: error instanceof Error ? error.message : 'Unknown error' });
        controller.close();
      } finally {
        if (connection) {
          connection.release();
        }
      }
    }
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
