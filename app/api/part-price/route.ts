import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET /api/part-price?periode=2026-07&page=1&limit=100&search=&filter=all
// GET /api/part-price?periode=2026-07&download=true
export async function GET(request: Request) {
  try {
    const url      = new URL(request.url);
    const periode  = url.searchParams.get('periode');
    const download = url.searchParams.get('download') === 'true';
    const page     = parseInt(url.searchParams.get('page')  || '1');
    const limit    = parseInt(url.searchParams.get('limit') || '100');
    const search   = url.searchParams.get('search') || '';
    const filter   = url.searchParams.get('filter') || 'all';
    const offset   = (page - 1) * limit;

    if (!periode) return NextResponse.json({ error: 'Parameter periode wajib' }, { status: 400 });

    // Download mode — ambil semua tanpa pagination
    if (download) {
      const result = await pool.query(`
        SELECT
          bd.part_no,
          mp.part_name,
          mp.unit,
          mp.supplier_name,
          pp.price,
          pp.updated_at
        FROM (SELECT DISTINCT part_no FROM bom_detail WHERE periode = $1) bd
        LEFT JOIN master_part mp ON mp.part_no = bd.part_no
        LEFT JOIN part_price  pp ON pp.part_no  = bd.part_no AND pp.periode = $1
        ORDER BY bd.part_no
      `, [periode]);
      return NextResponse.json({ rows: result.rows, total: result.rows.length });
    }

    // Build search condition
    const searchCond = search ? `AND (bd.part_no ILIKE $2 OR mp.part_name ILIKE $2)` : '';
    const searchParam = search ? [`%${search}%`] : [];

    // Build filter condition
    const filterCond =
      filter === 'filled' ? 'AND pp.price IS NOT NULL' :
      filter === 'empty'  ? 'AND pp.price IS NULL' : '';

    // Stats — selalu dari semua data periode
    const statsResult = await pool.query(`
      SELECT
        COUNT(DISTINCT bd.part_no)                                      AS total,
        COUNT(DISTINCT pp.part_no) FILTER (WHERE pp.price IS NOT NULL)  AS filled
      FROM (SELECT DISTINCT part_no FROM bom_detail WHERE periode = $1) bd
      LEFT JOIN part_price pp ON pp.part_no = bd.part_no AND pp.periode = $1
    `, [periode]);

    // Count dengan filter + search
    const countResult = await pool.query(`
      SELECT COUNT(*) FROM (
        SELECT DISTINCT bd.part_no
        FROM (SELECT DISTINCT part_no FROM bom_detail WHERE periode = $1) bd
        LEFT JOIN master_part mp ON mp.part_no = bd.part_no
        LEFT JOIN part_price  pp ON pp.part_no = bd.part_no AND pp.periode = $1
        WHERE 1=1 ${searchCond} ${filterCond}
      ) t
    `, [periode, ...searchParam]);
    const total = Number(countResult.rows[0].count);

    // Data dengan pagination
    const dataResult = await pool.query(`
      SELECT
        bd.part_no,
        mp.part_name,
        mp.unit,
        mp.supplier_name,
        pp.price,
        pp.updated_at
      FROM (SELECT DISTINCT part_no FROM bom_detail WHERE periode = $1) bd
      LEFT JOIN master_part mp ON mp.part_no = bd.part_no
      LEFT JOIN part_price  pp ON pp.part_no = bd.part_no AND pp.periode = $1
      WHERE 1=1 ${searchCond} ${filterCond}
      ORDER BY bd.part_no
      LIMIT $${search ? 3 : 2} OFFSET $${search ? 4 : 3}
    `, [periode, ...searchParam, limit, offset]);

    return NextResponse.json({
      rows:  dataResult.rows,
      total,
      page,
      limit,
      stats: {
        total:  Number(statsResult.rows[0].total),
        filled: Number(statsResult.rows[0].filled),
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Gagal memuat data price' }, { status: 500 });
  }
}

// POST /api/part-price — upsert bulk
export async function POST(request: Request) {
  const client = await pool.connect();
  try {
    const { periode, rows } = await request.json() as {
      periode: string;
      rows: { part_no: string; price: number | null }[];
    };

    if (!periode || !rows?.length) {
      return NextResponse.json({ error: 'Data kosong' }, { status: 400 });
    }

    await client.query('BEGIN');
    let upserted = 0;
    for (const row of rows) {
      await client.query(`
        INSERT INTO part_price (periode, part_no, price)
        VALUES ($1, $2, $3)
        ON CONFLICT (periode, part_no)
        DO UPDATE SET price = EXCLUDED.price, updated_at = NOW()
      `, [periode, row.part_no, row.price ?? null]);
      upserted++;
    }
    await client.query('COMMIT');
    return NextResponse.json({ message: 'Price berhasil disimpan', upserted });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    return NextResponse.json({ error: 'Gagal menyimpan price' }, { status: 500 });
  } finally {
    client.release();
  }
}
