import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET /api/part-price?periode=2026-03&page=1&limit=100&search=&filter=all
// GET /api/part-price?periode=2026-03&download=true  → semua data tanpa pagination
export async function GET(request: Request) {
  try {
    const url      = new URL(request.url);
    const periode  = url.searchParams.get('periode');
    const download = url.searchParams.get('download') === 'true';
    const page     = parseInt(url.searchParams.get('page')   || '1');
    const limit    = parseInt(url.searchParams.get('limit')  || '100');
    const search   = url.searchParams.get('search')  || '';
    const filter   = url.searchParams.get('filter')  || 'all'; // all | filled | empty
    const offset   = (page - 1) * limit;

    if (!periode) return NextResponse.json({ error: 'Parameter periode wajib' }, { status: 400 });

    // Build WHERE conditions
    const conditions: string[] = ['b.periode = $1'];
    const params: unknown[]    = [periode];
    let idx = 2;

    if (search) {
      conditions.push(`(b.part_no ILIKE $${idx} OR mp.part_name ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    if (filter === 'filled') {
      conditions.push(`pp.price IS NOT NULL`);
    } else if (filter === 'empty') {
      conditions.push(`pp.price IS NULL`);
    }

    const whereClause = conditions.join(' AND ');

    // Download mode — ambil semua tanpa pagination
    if (download) {
      const result = await pool.query(`
        SELECT
          b.part_no,
          mp.part_name,
          mp.unit,
          mp.supplier_name,
          pp.price,
          pp.updated_at
        FROM (SELECT DISTINCT part_no FROM bom_detail WHERE periode = $1) b
        LEFT JOIN master_part mp ON mp.part_no = b.part_no
        LEFT JOIN part_price  pp ON pp.part_no = b.part_no AND pp.periode = $1
        ORDER BY b.part_no
      `, [periode]);
      return NextResponse.json({ rows: result.rows, total: result.rows.length });
    }

    // Count total
    const countResult = await pool.query(`
      SELECT COUNT(*) FROM (SELECT DISTINCT b.part_no FROM bom_detail b
      LEFT JOIN master_part mp ON mp.part_no = b.part_no
      LEFT JOIN part_price  pp ON pp.part_no = b.part_no AND pp.periode = $1
      WHERE ${whereClause}) t
    `, params);
    const total = Number(countResult.rows[0].count);

    // Data dengan pagination
    const dataResult = await pool.query(`
      SELECT
        b.part_no,
        mp.part_name,
        mp.unit,
        mp.supplier_name,
        pp.price,
        pp.updated_at
      FROM (SELECT DISTINCT part_no FROM bom_detail WHERE periode = $1) b
      LEFT JOIN master_part mp ON mp.part_no = b.part_no
      LEFT JOIN part_price  pp ON pp.part_no = b.part_no AND pp.periode = $1
      WHERE ${whereClause}
      ORDER BY b.part_no
      LIMIT $${idx} OFFSET $${idx + 1}
    `, [...params, limit, offset]);

    // Stats — selalu dari semua data (tidak terpengaruh filter/search)
    const statsResult = await pool.query(`
      SELECT
        COUNT(DISTINCT b.part_no)                                     AS total,
        COUNT(DISTINCT pp.part_no) FILTER (WHERE pp.price IS NOT NULL) AS filled
      FROM (SELECT DISTINCT part_no FROM bom_detail WHERE periode = $1) b
      LEFT JOIN part_price pp ON pp.part_no = b.part_no AND pp.periode = $1
    `, [periode]);

    return NextResponse.json({
      rows:   dataResult.rows,
      total,
      page,
      limit,
      stats: {
        total:  Number(statsResult.rows[0].total),
        filled: Number(statsResult.rows[0].filled),
      }
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
