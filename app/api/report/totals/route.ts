import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET /api/report/totals?periode=2026-06
// GET /api/report/totals?dari=2026-01&sampai=2026-12&assy_codes=A1,A2&search=...

export async function GET(request: Request) {
  try {
    const url        = new URL(request.url);
    const periode    = url.searchParams.get('periode');
    const dari       = url.searchParams.get('dari');
    const sampai     = url.searchParams.get('sampai');
    const assyFilter = url.searchParams.get('assy_codes');
    const search     = url.searchParams.get('search') || '';

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
    const hasSearch     = search.trim().length > 0;
    const searchParam   = hasSearch ? `%${search.trim()}%` : null;

    // ─── HELPER: build WHERE clauses ─────────────────────────────
    function buildWhere(periodeClause: string, paramOffset: number) {
      const clauses: string[] = [periodeClause];
      const params: (string | string[] | number)[] = [];
      let idx = paramOffset;

      if (hasAssyFilter) {
        clauses.push(`assy_code = ANY($${idx}::text[])`);
        params.push(assyParams);
        idx++;
      }
      if (hasSearch) {
        clauses.push(`(part_no ILIKE $${idx} OR part_name ILIKE $${idx})`);
        params.push(searchParam!);
        idx++;
      }
      return { where: clauses.join(' AND '), extraParams: params, nextIdx: idx };
    }

    if (isGabungan) {
      const [p1, p2] = [dari!, sampai!];

      // Fetch semua data tanpa pagination
      const [periodeRes, assyRes, prodRes, qtyRes] = await Promise.all([
        pool.query(
          `SELECT DISTINCT periode FROM mv_bom_gabungan
           WHERE periode >= $1 AND periode <= $2 ORDER BY periode`,
          [p1, p2]
        ),
        hasAssyFilter
          ? pool.query(
              `SELECT DISTINCT assy_code FROM mv_bom_gabungan
               WHERE periode >= $1 AND periode <= $2 AND assy_code = ANY($3::text[])
               ORDER BY assy_code`,
              [p1, p2, assyParams]
            )
          : pool.query(
              `SELECT DISTINCT assy_code FROM mv_bom_gabungan
               WHERE periode >= $1 AND periode <= $2 ORDER BY assy_code`,
              [p1, p2]
            ),
        pool.query(
          `SELECT assy_code, periode, COALESCE(prod_qty, 0) AS prod_qty
           FROM prod_plan WHERE periode >= $1 AND periode <= $2`,
          [p1, p2]
        ),
        hasAssyFilter
          ? pool.query(
              `SELECT part_no, assy_code, periode, qty_per_unit
               FROM mv_bom_gabungan
               WHERE periode >= $1 AND periode <= $2 AND assy_code = ANY($3::text[])`,
              [p1, p2, assyParams]
            )
          : pool.query(
              `SELECT part_no, assy_code, periode, qty_per_unit
               FROM mv_bom_gabungan
               WHERE periode >= $1 AND periode <= $2`,
              [p1, p2]
            ),
      ]);

      const periodeList = periodeRes.rows.map((r: { periode: string }) => r.periode);
      const assyCodes: string[] = assyRes.rows.map((r: { assy_code: string }) => r.assy_code);

      // Build prod map
      const prodMap: Record<string, Record<string, number>> = {};
      for (const r of prodRes.rows) {
        if (!prodMap[r.assy_code]) prodMap[r.assy_code] = {};
        prodMap[r.assy_code][r.periode] = Number(r.prod_qty);
      }

      // Build qty map
      const lookup = new Map<string, number>();
      for (const r of qtyRes.rows) {
        lookup.set(`${r.part_no}|${r.assy_code}|${r.periode}`, Number(r.qty_per_unit));
      }

      // Get all parts (tanpa pagination)
      const { where: pw, extraParams: pe } = buildWhere(
        `periode >= $1 AND periode <= $2`, 3
      );
      
      const partsRes = await pool.query(
        `SELECT DISTINCT part_no FROM mv_bom_gabungan WHERE ${pw} ORDER BY part_no`,
        [p1, p2, ...pe]
      );

      const partNos: string[] = partsRes.rows.map((r: { part_no: string }) => r.part_no);

      // Calculate column sums for ALL data
      const colCount = assyCodes.length * periodeList.length;
      const colSums = new Array(colCount).fill(0);
      let totalUsage = 0;

      // Calculate sums
      let colIdx = 0;
      for (const assy of assyCodes) {
        for (const per of periodeList) {
          let sum = 0;
          let colTotalUsage = 0;
          for (const partNo of partNos) {
            const qty = lookup.get(`${partNo}|${assy}|${per}`) ?? 0;
            if (qty > 0) {
              sum += qty;
              colTotalUsage += qty * (prodMap[assy]?.[per] ?? 0);
            }
          }
          colSums[colIdx] = sum;
          totalUsage += colTotalUsage;
          colIdx++;
        }
      }

      return NextResponse.json({
        colSums,
        totalUsage: Math.ceil(totalUsage),
        colCount,
      });
    } else {
      // SINGLE PERIODE
      const per = periode!;

      const [assyRes, prodRes, qtyRes] = await Promise.all([
        hasAssyFilter
          ? pool.query(
              `SELECT DISTINCT assy_code FROM mv_bom_gabungan
               WHERE periode = $1 AND assy_code = ANY($2::text[]) ORDER BY assy_code`,
              [per, assyParams]
            )
          : pool.query(
              `SELECT DISTINCT assy_code FROM mv_bom_gabungan
               WHERE periode = $1 ORDER BY assy_code`,
              [per]
            ),
        pool.query(
          `SELECT assy_code, COALESCE(prod_qty, 0) AS prod_qty FROM prod_plan WHERE periode = $1`,
          [per]
        ),
        hasAssyFilter
          ? pool.query(
              `SELECT part_no, assy_code, qty_per_unit
               FROM mv_bom_gabungan
               WHERE periode = $1 AND assy_code = ANY($2::text[])`,
              [per, assyParams]
            )
          : pool.query(
              `SELECT part_no, assy_code, qty_per_unit
               FROM mv_bom_gabungan
               WHERE periode = $1`,
              [per]
            ),
      ]);

      const assyCodes: string[] = assyRes.rows.map((r: { assy_code: string }) => r.assy_code);

      // Build prod map
      const prodMap: Record<string, number> = {};
      prodRes.rows.forEach((r: { assy_code: string; prod_qty: string }) => {
        prodMap[r.assy_code] = Number(r.prod_qty);
      });

      // Build qty map
      const lookup = new Map<string, number>();
      for (const r of qtyRes.rows) {
        lookup.set(`${r.part_no}|${r.assy_code}`, Number(r.qty_per_unit));
      }

      // Get all parts (tanpa pagination)
      const { where: pw, extraParams: pe } = buildWhere(
        hasAssyFilter ? 'periode = $1 AND assy_code = ANY($2::text[])' : 'periode = $1',
        hasAssyFilter ? 3 : 2
      );
      
      const partsRes = await pool.query(
        `SELECT DISTINCT part_no FROM mv_bom_gabungan WHERE ${pw} ORDER BY part_no`,
        [per, ...(hasAssyFilter ? [assyParams] : []), ...pe]
      );

      const partNos: string[] = partsRes.rows.map((r: { part_no: string }) => r.part_no);

      // Calculate sums
      const colSums = new Array(assyCodes.length).fill(0);
      let totalUsage = 0;

      for (let ci = 0; ci < assyCodes.length; ci++) {
        const assy = assyCodes[ci];
        let sum = 0;
        let colTotalUsage = 0;
        for (const partNo of partNos) {
          const qty = lookup.get(`${partNo}|${assy}`) ?? 0;
          if (qty > 0) {
            sum += qty;
            colTotalUsage += qty * (prodMap[assy] ?? 0);
          }
        }
        colSums[ci] = sum;
        totalUsage += colTotalUsage;
      }

      return NextResponse.json({
        colSums,
        totalUsage: Math.ceil(totalUsage),
        colCount: assyCodes.length,
      });
    }

  } catch (error) {
    console.error('[Report Totals Error]', error);
    return NextResponse.json({ error: 'Gagal menghitung total' }, { status: 500 });
  }
}
