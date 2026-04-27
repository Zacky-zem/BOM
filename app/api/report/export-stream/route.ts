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

// Helper function to send SSE event
function sendEvent(writer: WritableStreamDefaultWriter<Uint8Array>, event: any) {
  const data = JSON.stringify(event);
  const message = `data: ${data}\n\n`;
  writer.write(new TextEncoder().encode(message));
}

export async function GET(request: Request) {
  try {
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

    // Create readable stream for SSE
    const readable = new ReadableStream({
      async start(controller) {
        try {
          const writer = controller.writer as WritableStreamDefaultWriter<Uint8Array>;

          // Step 1: Send initial progress
          sendEvent(writer, { progress: 5, status: 'Mengambil periode...' });

          const periodeList = isGabungan
            ? (await pool.query(
                `SELECT DISTINCT periode FROM mv_bom_gabungan
                 WHERE periode >= $1 AND periode <= $2 ORDER BY periode`,
                [dari!, sampai!]
              )).rows.map((r: { periode: string }) => r.periode)
            : [periode!];

          console.log('[Export Stream] Periods:', periodeList);

          sendEvent(writer, { progress: 10, status: 'Mengambil data ASSY...' });

          // Step 2: Get ASSY codes
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

          sendEvent(writer, { progress: 20, status: 'Mengambil data Prod Qty...' });

          // Step 3: Get production quantities
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

          sendEvent(writer, { progress: 30, status: 'Menghitung total parts...' });

          // Step 4: Get total part count
          let countWhere = `periode >= $1 AND periode <= $2`;
          const countParams: any[] = [p1, p2];
          if (hasAssyFilter) {
            countWhere += ` AND assy_code = ANY($3::text[])`;
            countParams.push(assyParams);
          }
          if (hasSearch) {
            const paramIdx = countParams.length + 1;
            countWhere += ` AND (part_no ILIKE $${paramIdx} OR part_name ILIKE $${paramIdx})`;
            countParams.push(searchParam!);
          }

          const countResult = await pool.query(
            `SELECT COUNT(DISTINCT part_no) FROM mv_bom_gabungan WHERE ${countWhere}`,
            countParams
          );
          const totalParts = Number(countResult.rows[0].count);

          console.log('[Export Stream] Total parts:', totalParts);

          sendEvent(writer, { progress: 40, status: `Memproses ${totalParts} parts...` });

          // Step 5: Process parts in batches
          const BATCH_SIZE = 1000;
          const batches = Math.ceil(totalParts / BATCH_SIZE);
          let processedParts = 0;

          // Build workbook
          const wb = XLSX.utils.book_new();

          if (isGabungan) {
            // ── GABUNGAN MODE ──────────────────────────────────────
            const baseHeaders = ['Part No', 'Part No AS400', 'Supplier', 'Part Name', 'Unit'];
            const baseColCount = baseHeaders.length;
            const periodesPerAssy = periodeList.length;

            // Row 1: ASSY names
            const row1: string[] = [...baseHeaders];
            for (const assy of assyCodes) {
              for (let i = 0; i < periodesPerAssy; i++) {
                row1.push(assy);
              }
            }
            row1.push('Total');
            row1.push('Total Usage');

            // Row 2: Periode subheaders
            const row2: string[] = new Array(baseColCount).fill('');
            for (const _assy of assyCodes) {
              for (const per of periodeList) {
                row2.push(formatMonth(per));
              }
            }
            row2.push('');
            row2.push('');

            // Row 3: PROD QTY
            const row3: (string | number)[] = ['PROD QTY →', '', '', '', ''];
            for (const assy of assyCodes) {
              for (const per of periodeList) {
                row3.push(prodMap[assy]?.[per] ?? 0);
              }
            }
            row3.push('');
            row3.push('');

            const data: (string | number)[][] = [row1, row2, row3];

            // Fetch and process parts in batches
            for (let batch = 0; batch < batches; batch++) {
              const offset = batch * BATCH_SIZE;
              let partsWhere = `periode >= $1 AND periode <= $2`;
              const partsParams: any[] = [p1, p2];

              if (hasAssyFilter) {
                partsWhere += ` AND assy_code = ANY($3::text[])`;
                partsParams.push(assyParams);
              }
              if (hasSearch) {
                const paramIdx = partsParams.length + 1;
                partsWhere += ` AND (part_no ILIKE $${paramIdx} OR part_name ILIKE $${paramIdx})`;
                partsParams.push(searchParam!);
              }

              const paramIdx = partsParams.length + 1;
              const batchPartsRes = await pool.query(
                `SELECT DISTINCT part_no, part_no_as400, part_name, unit, supplier_name
                 FROM mv_bom_gabungan WHERE ${partsWhere}
                 ORDER BY part_no LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
                [...partsParams, BATCH_SIZE, offset]
              );

              const batchPartNos: string[] = batchPartsRes.rows.map((r: { part_no: string }) => r.part_no);

              if (batchPartNos.length > 0) {
                // Get quantities for this batch
                const qtyRes = await pool.query(
                  hasAssyFilter
                    ? `SELECT part_no, assy_code, periode, qty_per_unit
                       FROM mv_bom_gabungan
                       WHERE periode >= $1 AND periode <= $2
                         AND part_no = ANY($3) AND assy_code = ANY($4::text[])`
                    : `SELECT part_no, assy_code, periode, qty_per_unit
                       FROM mv_bom_gabungan
                       WHERE periode >= $1 AND periode <= $2 AND part_no = ANY($3)`,
                  hasAssyFilter ? [p1, p2, batchPartNos, assyParams] : [p1, p2, batchPartNos]
                );

                const lookup = new Map<string, number>();
                for (const r of qtyRes.rows) {
                  lookup.set(`${r.part_no}|${r.assy_code}|${r.periode}`, Number(r.qty_per_unit));
                }

                // Process batch rows
                for (const part of batchPartsRes.rows) {
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
                }
              }

              // Update progress
              const batchProgress = 40 + ((batch + 1) / batches) * 50;
              sendEvent(writer, {
                progress: Math.min(90, Math.floor(batchProgress)),
                status: `Memproses part ${Math.min(processedParts, totalParts)} dari ${totalParts}...`,
              });
            }

            const ws = XLSX.utils.aoa_to_sheet(data);

            // Merge ASSY headers
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
            // ── SINGLE PERIODE MODE ────────────────────────────────
            const headers = ['Part No', 'Part No AS400', 'Supplier', 'Part Name', 'Unit', ...assyCodes, 'Total BOM', 'Total Usage'];
            const flatProdMap: Record<string, number> = {};
            for (const assy of assyCodes) {
              flatProdMap[assy] = prodMap[assy]?.[periode!] ?? 0;
            }
            const prodQtyRow = ['PROD QTY →', '', '', '', '', ...assyCodes.map(a => flatProdMap[a] ?? 0), '', ''];
            const data: (string | number)[][] = [headers, prodQtyRow];

            // Fetch and process parts in batches
            for (let batch = 0; batch < batches; batch++) {
              const offset = batch * BATCH_SIZE;
              let partsWhere = `periode = $1`;
              const partsParams: any[] = [periode!];

              if (hasAssyFilter) {
                partsWhere += ` AND assy_code = ANY($2::text[])`;
                partsParams.push(assyParams);
              }
              if (hasSearch) {
                const paramIdx = partsParams.length + 1;
                partsWhere += ` AND (part_no ILIKE $${paramIdx} OR part_name ILIKE $${paramIdx})`;
                partsParams.push(searchParam!);
              }

              const paramIdx = partsParams.length + 1;
              const batchPartsRes = await pool.query(
                `SELECT DISTINCT part_no, part_no_as400, part_name, unit, supplier_name
                 FROM mv_bom_gabungan WHERE ${partsWhere}
                 ORDER BY part_no LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
                [...partsParams, BATCH_SIZE, offset]
              );

              const batchPartNos: string[] = batchPartsRes.rows.map((r: { part_no: string }) => r.part_no);

              if (batchPartNos.length > 0) {
                const qtyRes = await pool.query(
                  hasAssyFilter
                    ? `SELECT part_no, assy_code, qty_per_unit FROM mv_bom_gabungan
                       WHERE periode = $1 AND part_no = ANY($2) AND assy_code = ANY($3::text[])`
                    : `SELECT part_no, assy_code, qty_per_unit FROM mv_bom_gabungan
                       WHERE periode = $1 AND part_no = ANY($2)`,
                  hasAssyFilter ? [periode!, batchPartNos, assyParams] : [periode!, batchPartNos]
                );

                const lookup = new Map<string, number>();
                for (const r of qtyRes.rows) {
                  lookup.set(`${r.part_no}|${r.assy_code}`, Number(r.qty_per_unit));
                }

                for (const part of batchPartsRes.rows) {
                  const row: (string | number)[] = [
                    part.part_no,
                    part.part_no_as400 || '',
                    part.supplier_name || '',
                    part.part_name || '',
                    part.unit || '',
                    ...assyCodes.map(a => lookup.get(`${part.part_no}|${a}`) ?? 0),
                  ];
                  const totalBom = assyCodes.reduce((s, a) => s + (lookup.get(`${part.part_no}|${a}`) ?? 0), 0);
                  const totalUsage = assyCodes.reduce((s, a) => s + ((lookup.get(`${part.part_no}|${a}`) ?? 0) * (flatProdMap[a] ?? 0)), 0);
                  row.push(totalBom);
                  row.push(Math.ceil(totalUsage));
                  data.push(row);
                  processedParts++;
                }
              }

              const batchProgress = 40 + ((batch + 1) / batches) * 50;
              sendEvent(writer, {
                progress: Math.min(90, Math.floor(batchProgress)),
                status: `Memproses part ${Math.min(processedParts, totalParts)} dari ${totalParts}...`,
              });
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

          sendEvent(writer, { progress: 95, status: 'Membuat file Excel...' });

          // Step 6: Write Excel to temporary file
          const tempDir = '/tmp/bom-exports';
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
          }

          const filename = `report_${Date.now()}_${randomBytes(4).toString('hex')}.xlsx`;
          const filepath = path.join(tempDir, filename);
          const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
          fs.writeFileSync(filepath, buffer);

          console.log('[Export Stream] Excel file created:', filepath);

          // Step 7: Generate download URL
          const downloadUrl = `/api/report/download?file=${encodeURIComponent(filename)}`;

          sendEvent(writer, {
            progress: 100,
            status: 'Ekspor selesai!',
            downloadUrl,
            rowCount: processedParts,
          });

          console.log('[Export Stream] Export completed successfully');
          controller.close();
        } catch (error) {
          console.error('[Export Stream Error]', error);
          sendEvent(writer, {
            progress: 0,
            status: 'Gagal',
            error: error instanceof Error ? error.message : 'Terjadi kesalahan saat mengekspor data',
          });
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    console.error('[Export Stream Error]', error);
    return NextResponse.json(
      { error: 'Gagal memulai export stream' },
      { status: 500 }
    );
  }
}
