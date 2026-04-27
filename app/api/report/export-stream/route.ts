import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import ExcelJS from 'exceljs';

interface Row {
  part_no: string;
  part_no_as400?: string | null;
  supplier_name?: string | null;
  part_name?: string | null;
  unit?: string | null;
}

interface QtyData {
  part_no: string;
  assy_code: string;
  periode: string;
  qty_per_unit: number;
}

interface ProdData {
  assy_code: string;
  periode: string;
  prod_qty: number;
}

const BATCH_SIZE = 5000; // Process 5K rows at a time
const CHUNK_SIZE = 100; // Commit to Excel every 100 rows for memory efficiency

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dari = searchParams.get('dari');
    const sampai = searchParams.get('sampai');
    const periode = searchParams.get('periode');
    const mode = searchParams.get('mode') || 'single';
    const assyFilter = searchParams.getAll('assy');
    const hasAssyFilter = assyFilter && assyFilter.length > 0;

    const p1 = mode === 'gabungan' ? dari : periode;
    const p2 = mode === 'gabungan' ? sampai : periode;

    // Fetch all data in parallel
    const [periodeRes, assyRes, prodRes, partsRes, qtyRes] = await Promise.all([
      mode === 'gabungan'
        ? pool.query(
            `SELECT DISTINCT periode FROM mv_bom_gabungan
             WHERE periode >= $1 AND periode <= $2 ORDER BY periode`,
            [p1, p2]
          )
        : Promise.resolve({ rows: [{ periode }] }),
      pool.query(
        hasAssyFilter
          ? `SELECT DISTINCT assy_code FROM mv_bom_gabungan
             WHERE periode >= $1 AND periode <= $2 AND assy_code = ANY($3::text[])
             ORDER BY assy_code`
          : `SELECT DISTINCT assy_code FROM mv_bom_gabungan
             WHERE periode >= $1 AND periode <= $2 ORDER BY assy_code`,
        hasAssyFilter ? [p1, p2, assyFilter] : [p1, p2]
      ),
      pool.query(
        `SELECT assy_code, periode, COALESCE(prod_qty, 0) AS prod_qty
         FROM prod_plan WHERE periode >= $1 AND periode <= $2`,
        [p1, p2]
      ),
      pool.query(
        `SELECT part_no, part_no_as400, supplier_name, part_name, unit
         FROM mv_bom_gabungan
         WHERE periode >= $1 AND periode <= $2
         GROUP BY part_no, part_no_as400, supplier_name, part_name, unit
         ORDER BY part_no`,
        [p1, p2]
      ),
      pool.query(
        hasAssyFilter
          ? `SELECT part_no, assy_code, periode, qty_per_unit
             FROM mv_bom_gabungan
             WHERE periode >= $1 AND periode <= $2
               AND assy_code = ANY($3::text[])`
          : `SELECT part_no, assy_code, periode, qty_per_unit
             FROM mv_bom_gabungan
             WHERE periode >= $1 AND periode <= $2`,
        hasAssyFilter ? [p1, p2, assyFilter] : [p1, p2]
      ),
    ]);

    const periodeList: string[] = periodeRes.rows.map((r: { periode: string | null }) => r.periode || '').filter(Boolean);
    const assyCodes: string[] = assyRes.rows.map((r: { assy_code: string | null }) => r.assy_code || '').filter(Boolean);
    const parts: Row[] = partsRes.rows;

    // Build lookup map with index for O(1) access
    const qtyMap = new Map<string, number>();
    const prodMap = new Map<string, number>();

    for (const r of qtyRes.rows as QtyData[]) {
      qtyMap.set(`${r.part_no}|${r.assy_code}|${r.periode}`, Number(r.qty_per_unit));
    }

    for (const r of prodRes.rows as ProdData[]) {
      prodMap.set(`${r.assy_code}|${r.periode}`, Number(r.prod_qty));
    }

    // Create workbook with streaming writer
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Report');

    // Setup headers based on mode
    const baseHeaders = ['Part No', 'Part No AS400', 'Supplier', 'Part Name', 'Unit'];
    const totalRowCount = parts.length + 3; // 3 header rows

    // ─── GABUNGAN MODE ────────────────────────────
    if (mode === 'gabungan') {
      // Row 1: ASSY names
      const row1: (string | number)[] = [...baseHeaders];
      for (const assy of assyCodes) {
        for (let i = 0; i < periodeList.length; i++) {
          row1.push(assy);
        }
      }
      row1.push('Total');
      row1.push('Total Usage');
      worksheet.addRow(row1);

      // Row 2: Sub-header periode
      const row2: (string | number)[] = new Array(baseHeaders.length).fill('');
      for (const _assy of assyCodes) {
        for (const per of periodeList) {
          const [y, m] = per.split('-').map(Number);
          const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1];
          row2.push(`${month} ${y}`);
        }
      }
      row2.push('');
      row2.push('');
      worksheet.addRow(row2);

      // Row 3: PROD QTY
      const row3: (string | number)[] = ['PROD QTY →', '', '', '', ''];
      for (const assy of assyCodes) {
        for (const per of periodeList) {
          const prodQty = prodMap.get(`${assy}|${per}`) ?? 0;
          row3.push(prodQty);
        }
      }
      row3.push('');
      row3.push('');
      worksheet.addRow(row3);

      // Process data rows in batches
      let processedCount = 0;
      for (let i = 0; i < parts.length; i += BATCH_SIZE) {
        const batch = parts.slice(i, i + BATCH_SIZE);

        for (const part of batch) {
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
              const qty = qtyMap.get(`${part.part_no}|${assy}|${per}`) ?? 0;
              row.push(qty);
              totalBom += qty;
              totalUsage += qty * (prodMap.get(`${assy}|${per}`) ?? 0);
            }
          }

          row.push(totalBom);
          row.push(Math.ceil(totalUsage));
          worksheet.addRow(row);

          processedCount++;
        }

        // Commit to buffer every batch
        await workbook.writer?.commit?.();
      }

      // Row footer: Total Per Assy
      const footerRow: (string | number)[] = ['∑ TOTAL PER ASSY', '', '', '', ''];
      for (const assy of assyCodes) {
        for (const per of periodeList) {
          // Sum all qty for this assy-periode
          let sum = 0;
          for (const part of parts) {
            sum += qtyMap.get(`${part.part_no}|${assy}|${per}`) ?? 0;
          }
          footerRow.push(sum);
        }
      }
      footerRow.push('');
      footerRow.push('');
      worksheet.addRow(footerRow);
    }
    // ─── SINGLE MODE ────────────────────────────
    else {
      const row1: (string | number)[] = [...baseHeaders, ...periodeList, 'Total', 'Total Usage'];
      worksheet.addRow(row1);

      const row2: (string | number)[] = ['PROD QTY →', '', '', '', ''];
      for (const per of periodeList) {
        // Sum prod qty for period (across all assys)
        let sum = 0;
        for (const assy of assyCodes) {
          sum += prodMap.get(`${assy}|${per}`) ?? 0;
        }
        row2.push(sum);
      }
      row2.push('');
      row2.push('');
      worksheet.addRow(row2);

      // Process data rows
      for (let i = 0; i < parts.length; i += BATCH_SIZE) {
        const batch = parts.slice(i, i + BATCH_SIZE);

        for (const part of batch) {
          const row: (string | number)[] = [
            part.part_no,
            part.part_no_as400 || '',
            part.supplier_name || '',
            part.part_name || '',
            part.unit || '',
          ];

          let totalBom = 0;
          let totalUsage = 0;

          for (const per of periodeList) {
            let qtySum = 0;
            for (const assy of assyCodes) {
              const qty = qtyMap.get(`${part.part_no}|${assy}|${per}`) ?? 0;
              qtySum += qty;
            }
            row.push(qtySum);
            totalBom += qtySum;
            totalUsage += qtySum * (prodMap.get(`*|${per}`) ?? 0);
          }

          row.push(totalBom);
          row.push(Math.ceil(totalUsage));
          worksheet.addRow(row);
        }

        await workbook.writer?.commit?.();
      }

      // Footer
      const footerRow: (string | number)[] = ['∑ TOTAL PER PERIOD', '', '', '', ''];
      for (const per of periodeList) {
        let sum = 0;
        for (const part of parts) {
          for (const assy of assyCodes) {
            sum += qtyMap.get(`${part.part_no}|${assy}|${per}`) ?? 0;
          }
        }
        footerRow.push(sum);
      }
      footerRow.push('');
      footerRow.push('');
      worksheet.addRow(footerRow);
    }

    // Generate buffer and send
    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="report_${p1}_${p2}.xlsx"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('[Export] Error:', error);
    return NextResponse.json(
      { error: 'Export failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
