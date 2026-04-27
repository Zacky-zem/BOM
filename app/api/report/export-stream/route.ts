import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import pool from '@/lib/db';
import fs from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';

// Helper function to format month
function formatMonth(periode: string): string {
  const [y, m] = periode.split('-').map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
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

  const assyParams: string[] = assyFilter
    ? assyFilter.split(',').map(a => a.trim()).filter(Boolean)
    : [];
  const hasAssyFilter = assyParams.length > 0;
  const hasSearch = search.trim().length > 0;
  const searchParam = hasSearch ? `%${search.trim()}%` : null;

  // Create a unique file ID for tracking
  const fileId = randomBytes(8).toString('hex');
  const tmpDir = path.join('/tmp', 'bom_exports');
  
  // Ensure temp directory exists
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  // Use TextEncoder to properly encode SSE events
  const encoder = new TextEncoder();

  // Create custom ReadableStream
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Helper to send SSE events
        const sendEvent = (event: any) => {
          const data = JSON.stringify(event);
          const message = `data: ${data}\n\n`;
          controller.enqueue(encoder.encode(message));
        };

        sendEvent({ progress: 5, status: 'Mengambil periode...' });

        const periodeList = isGabungan
          ? (await pool.query(
              `SELECT DISTINCT periode FROM mv_bom_gabungan
               WHERE periode >= $1 AND periode <= $2 ORDER BY periode`,
              [dari!, sampai!]
            )).rows.map((r: { periode: string }) => r.periode)
          : [periode!];

        console.log('[Export Stream] Periods:', periodeList);

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
        const assyCodes: string[] = assyRes.rows.map((r: { assy_code: string }) => r.assy_code);

        console.log('[Export Stream] ASSY codes:', assyCodes.length);

        sendEvent({ progress: 20, status: 'Mengambil data Prod Qty...' });

        // Get production quantities
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

        console.log('[Export Stream] Prod data loaded');

        sendEvent({ progress: 30, status: 'Menghitung total parts...' });

        // Build rows - using streaming batch approach
        const rows: any[] = [];
        let processedAssyCount = 0;
        const batchSize = 50; // Process ASSY in batches for progress updates

        for (let i = 0; i < assyCodes.length; i += batchSize) {
          const batch = assyCodes.slice(i, i + batchSize);
          const batchProgress = 30 + Math.floor((i / assyCodes.length) * 50);
          sendEvent({ 
            progress: batchProgress, 
            status: `Memproses data ${i + 1}/${assyCodes.length} ASSY...` 
          });

          for (const assyCode of batch) {
            const res = await pool.query(
              `SELECT part_no, part_no_as400, supplier, part_name, unit, assy_code
               FROM mv_bom_gabungan
               WHERE assy_code = $1 AND periode >= $2 AND periode <= $3
               ${hasSearch ? `AND (part_no ILIKE $4 OR part_name ILIKE $4 OR supplier ILIKE $4)` : ''}
               ORDER BY part_no`,
              hasSearch ? [assyCode, p1, p2, searchParam] : [assyCode, p1, p2]
            );

            for (const row of res.rows) {
              const newRow: any = {
                'PART NO': row.part_no,
                'PART NO AS400': row.part_no_as400,
                'SUPPLIER': row.supplier,
                'PART NAME': row.part_name,
                'UNIT': row.unit,
                'ASSY CODE': row.assy_code,
              };

              // Add periode columns
              for (const p of periodeList) {
                newRow[formatMonth(p)] = '—';
              }

              // Get usage data for this part
              const usageRes = await pool.query(
                `SELECT periode, COALESCE(usage, 0) AS usage
                 FROM mv_bom_gabungan
                 WHERE part_no = $1 AND assy_code = $2 AND periode >= $3 AND periode <= $4`,
                [row.part_no, assyCode, p1, p2]
              );

              for (const usageRow of usageRes.rows) {
                const monthKey = formatMonth(usageRow.periode);
                newRow[monthKey] = usageRow.usage === 0 ? '—' : usageRow.usage;
              }

              rows.push(newRow);
            }
          }

          processedAssyCount += batch.length;
        }

        console.log('[Export Stream] Data compiled, total rows:', rows.length);

        sendEvent({ progress: 85, status: 'Membuat Excel file...' });

        // Create workbook with streaming
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, 'Report');

        // Calculate file path
        const fileName = `BOM_Report_${dari || periode}_${sampai || periode}_${fileId}.xlsx`;
        const filePath = path.join(tmpDir, fileName);

        // Write file
        const buffer = XLSX.write(wb, { type: 'buffer' });
        fs.writeFileSync(filePath, buffer);

        console.log('[Export Stream] Excel file created:', filePath);
        console.log('[Export Stream] Total rows exported:', rows.length);

        // Verify file was created
        const stats = fs.statSync(filePath);
        console.log('[Export Stream] File size:', stats.size, 'bytes');

        sendEvent({ 
          progress: 100, 
          status: 'Ekspor selesai!',
          downloadUrl: `/api/report/download?fileId=${fileId}&fileName=${encodeURIComponent(fileName)}`,
          totalRows: rows.length,
          fileSize: stats.size
        });

        controller.close();
      } catch (error) {
        console.error('[Export Stream] Error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({ error: message })}\n\n`
        ));
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
