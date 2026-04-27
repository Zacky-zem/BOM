import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
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
      try {
        const sendEvent = (event: any) => {
          const data = JSON.stringify(event);
          const message = `data: ${data}\n\n`;
          controller.enqueue(encoder.encode(message));
        };

        sendEvent({ progress: 5, status: 'Mengambil periode...' });

        // Get periode list
        const periodeList = isGabungan
          ? (await pool.query(
              `SELECT DISTINCT periode FROM mv_bom_gabungan
               WHERE periode >= $1 AND periode <= $2 ORDER BY periode`,
              [dari!, sampai!]
            )).rows.map((r: { periode: string }) => r.periode)
          : [periode!];

        sendEvent({ progress: 10, status: 'Mengambil data ASSY...' });

        // Get ASSY codes
        const assyQuery = hasAssyFilter
          ? `SELECT DISTINCT assy_code FROM mv_bom_gabungan
             WHERE periode >= $1 AND periode <= $2 AND assy_code = ANY($3::text[])
             ORDER BY assy_code`
          : `SELECT DISTINCT assy_code FROM mv_bom_gabungan
             WHERE periode >= $1 AND periode <= $2 ORDER BY assy_code`;
        
        const [p1, p2] = isGabungan ? [dari!, sampai!] : [periode!, periode!];
        const assyRes = await pool.query(
          assyQuery,
          hasAssyFilter ? [p1, p2, assyParams] : [p1, p2]
        );
        const assyCodes = assyRes.rows.map((r: { assy_code: string }) => r.assy_code);

        sendEvent({ progress: 15, status: 'Mengambil prod qty...' });

        // Get prod qty
        const prodRes = await pool.query(
          `SELECT assy_code, periode, COALESCE(prod_qty, 0) AS prod_qty
           FROM prod_plan WHERE periode >= $1 AND periode <= $2`,
          [p1, p2]
        );
        const prodMap: Record<string, Record<string, number>> = {};
        for (const r of prodRes.rows) {
          if (!prodMap[r.assy_code]) prodMap[r.assy_code] = {};
          prodMap[r.assy_code][r.periode] = Number(r.prod_qty);
        }

        sendEvent({ progress: 25, status: 'Mengambil data part...' });

        // Get parts - use same query as original route.ts
        const partsRes = await pool.query(
          `SELECT DISTINCT part_no, part_no_as400, part_name, unit, supplier_name
           FROM mv_bom_gabungan 
           WHERE periode >= $1 AND periode <= $2
           ${hasAssyFilter ? `AND assy_code = ANY($${hasSearch ? '4' : '3'}::text[])` : ''}
           ${hasSearch ? `AND (part_no ILIKE $${hasAssyFilter ? '5' : '4'} OR part_name ILIKE $${hasAssyFilter ? '5' : '4'})` : ''}
           ORDER BY part_no`,
          hasAssyFilter && hasSearch
            ? [p1, p2, assyParams, searchParam]
            : hasAssyFilter
            ? [p1, p2, assyParams]
            : hasSearch
            ? [p1, p2, searchParam]
            : [p1, p2]
        );
        const partNos = partsRes.rows.map((r: { part_no: string }) => r.part_no);

        sendEvent({ progress: 40, status: `Mengambil qty untuk ${partNos.length} part...` });

        // Get qty data
        const qtyRes = await pool.query(
          hasAssyFilter
            ? `SELECT part_no, assy_code, periode, qty_per_unit
               FROM mv_bom_gabungan
               WHERE periode >= $1 AND periode <= $2
                 AND part_no = ANY($3) AND assy_code = ANY($4::text[])`
            : `SELECT part_no, assy_code, periode, qty_per_unit
               FROM mv_bom_gabungan
               WHERE periode >= $1 AND periode <= $2
                 AND part_no = ANY($3)`,
          hasAssyFilter ? [p1, p2, partNos, assyParams] : [p1, p2, partNos]
        );

        // Build lookup
        const lookup = new Map<string, number>();
        for (const r of qtyRes.rows) {
          lookup.set(`${r.part_no}|${r.assy_code}|${r.periode}`, Number(r.qty_per_unit));
        }

        sendEvent({ progress: 55, status: 'Membangun workbook...' });

        const wb = XLSX.utils.book_new();

        // Build Excel data
        if (isGabungan) {
          const baseHeaders = ['Part No', 'Part No AS400', 'Supplier', 'Part Name', 'Unit'];
          const baseColCount = baseHeaders.length;
          const periodesPerAssy = periodeList.length;

          const row1: string[] = [...baseHeaders];
          for (const assy of assyCodes) {
            for (let i = 0; i < periodesPerAssy; i++) {
              row1.push(assy);
            }
          }
          row1.push('Total');
          row1.push('Total Usage');

          const row2: string[] = new Array(baseColCount).fill('');
          for (const _assy of assyCodes) {
            for (const per of periodeList) {
              row2.push(formatMonth(per));
            }
          }
          row2.push('');
          row2.push('');

          const row3: (string | number)[] = ['PROD QTY →', '', '', '', ''];
          for (const assy of assyCodes) {
            for (const per of periodeList) {
              row3.push(prodMap[assy]?.[per] ?? 0);
            }
          }
          row3.push('');
          row3.push('');

          const data: (string | number)[][] = [row1, row2, row3];
          let processedParts = 0;
          const totalParts = partsRes.rows.length;

          sendEvent({ progress: 60, status: `Memproses data part (0/${totalParts})...` });

          for (const part of partsRes.rows) {
            const row: (string | number)[] = [
              part.part_no,
              part.part_no_as400 || '',
              part.supplier_name || '',
              part.part_name || '',
              part.unit || '',
            ];

            let totalBom = 0;
            let totalUsage = 0;
            for (const assy of assyCodes) {
              for (const per of periodeList) {
                const qty = lookup.get(`${part.part_no}|${assy}|${per}`) ?? 0;
                row.push(qty);
                totalBom += qty;
                totalUsage += qty * (prodMap[assy]?.[per] ?? 0);
              }
            }
            row.push(totalBom);
            row.push(Math.ceil(totalUsage));
            data.push(row);

            processedParts++;
            const progressPct = 60 + Math.floor((processedParts / totalParts) * 30);
            if (processedParts % 100 === 0) {
              sendEvent({ progress: progressPct, status: `Memproses data part (${processedParts}/${totalParts})...` });
            }
          }

          const ws = XLSX.utils.aoa_to_sheet(data);
          const merges: XLSX.Range[] = [];
          let colIdx = baseColCount;
          for (const _assy of assyCodes) {
            merges.push({
              s: { r: 0, c: colIdx },
              e: { r: 0, c: colIdx + periodesPerAssy - 1 },
            });
            colIdx += periodesPerAssy;
          }
          ws['!merges'] = merges;
          ws['!cols'] = [
            { wch: 15 },
            { wch: 18 },
            { wch: 25 },
            { wch: 30 },
            { wch: 10 },
            ...assyCodes.flatMap(() => periodeList.map(() => ({ wch: 12 }))),
            { wch: 12 },
            { wch: 12 },
          ];

          XLSX.utils.book_append_sheet(wb, ws, `Combined_${dari}_${sampai}`);
        } else {
          const baseHeaders = ['Part No', 'Part No AS400', 'Supplier', 'Part Name', 'Unit'];
          const row1 = [...baseHeaders, ...assyCodes, 'Total', 'Total Usage'];
          const row2: (string | number)[] = ['PROD QTY →', '', '', '', ''];
          for (const assy of assyCodes) {
            row2.push(prodMap[assy]?.[periode!] ?? 0);
          }
          row2.push('');
          row2.push('');

          const data: (string | number)[][] = [row1, row2];
          let processedParts = 0;
          const totalParts = partsRes.rows.length;

          for (const part of partsRes.rows) {
            const row: (string | number)[] = [
              part.part_no,
              part.part_no_as400 || '',
              part.supplier_name || '',
              part.part_name || '',
              part.unit || '',
            ];

            let totalBom = 0;
            let totalUsage = 0;
            for (const assy of assyCodes) {
              const qty = lookup.get(`${part.part_no}|${assy}|${periode!}`) ?? 0;
              row.push(qty);
              totalBom += qty;
              totalUsage += qty * (prodMap[assy]?.[periode!] ?? 0);
            }
            row.push(totalBom);
            row.push(Math.ceil(totalUsage));
            data.push(row);

            processedParts++;
            const progressPct = 60 + Math.floor((processedParts / totalParts) * 30);
            if (processedParts % 100 === 0) {
              sendEvent({ progress: progressPct, status: `Memproses data part (${processedParts}/${totalParts})...` });
            }
          }

          const ws = XLSX.utils.aoa_to_sheet(data);
          ws['!cols'] = [
            { wch: 15 },
            { wch: 18 },
            { wch: 25 },
            { wch: 30 },
            { wch: 10 },
            ...assyCodes.map(() => ({ wch: 12 })),
            { wch: 12 },
            { wch: 12 },
          ];

          XLSX.utils.book_append_sheet(wb, ws, `Report_${periode}`);
        }

        sendEvent({ progress: 90, status: 'Membuat file Excel...' });

        const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
        const fileId = randomBytes(8).toString('hex');
        const tmpDir = path.join('/tmp', 'bom_exports');
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
        const filePath = path.join(tmpDir, `${fileId}.xlsx`);
        fs.writeFileSync(filePath, buffer);

        // Verify row count
        const actualRowCount = Object.keys(XLSX.utils.sheet_to_json(XLSX.utils.book_sheets(wb)[0])).length;
        
        sendEvent({ progress: 95, status: 'Verifikasi data...' });

        const downloadUrl = `/api/report/download?fileId=${fileId}`;
        sendEvent({
          progress: 100,
          status: 'Selesai!',
          downloadUrl,
          rowCount: actualRowCount,
        });

        controller.close();
      } catch (error) {
        console.error('[Export Error]', error);
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error'
        })}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
