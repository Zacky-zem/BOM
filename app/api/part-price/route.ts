import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET /api/part-price?periode=2026-03
export async function GET(request: Request) {
  try {
    const url     = new URL(request.url);
    const periode = url.searchParams.get('periode');
    if (!periode) return NextResponse.json({ error: 'Parameter periode wajib' }, { status: 400 });

    const result = await pool.query(`
      SELECT
        b.part_no,
        mp.part_name,
        mp.unit,
        mp.supplier_name,
        COALESCE(pp.price, NULL) AS price,
        pp.updated_at
      FROM (SELECT DISTINCT part_no FROM bom_detail WHERE periode = $1) b
      LEFT JOIN master_part mp ON mp.part_no = b.part_no
      LEFT JOIN part_price  pp ON pp.part_no = b.part_no AND pp.periode = $1
      ORDER BY b.part_no
    `, [periode]);

    return NextResponse.json(result.rows);
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
