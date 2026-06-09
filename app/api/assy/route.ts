import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const result = await pool.query(
      'SELECT * FROM master_assy ORDER BY assy_number ASC'
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    return NextResponse.json({ error: 'Gagal memuat data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { assy_code, assy_number, sequence, carline, destinasi, komoditi, description, is_active } = body;

    // Validasi di server-side
    if (!assy_code || typeof assy_code !== 'string' || !assy_code.trim()) {
      return NextResponse.json({ error: 'assy_code wajib diisi dan harus text' }, { status: 400 });
    }

    if (assy_number === null || assy_number === undefined || assy_number === '' || isNaN(Number(assy_number))) {
      return NextResponse.json({ error: 'assy_number wajib diisi dan harus berupa angka' }, { status: 400 });
    }

    const assy_number_num = Number(assy_number);
    if (assy_number_num <= 0) {
      return NextResponse.json({ error: 'assy_number harus lebih besar dari 0' }, { status: 400 });
    }

    const result = await pool.query(
      `INSERT INTO master_assy (assy_code, assy_number, sequence, carline, destinasi, komoditi, description, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (assy_code, sequence) DO NOTHING
       RETURNING *`,
      [assy_code.trim(), assy_number_num, sequence ?? null, carline ?? null, destinasi ?? null,
       komoditi ?? null, description ?? null, is_active ?? true]
    );

    if (!result.rows[0]) {
      return NextResponse.json({ error: 'Kombinasi Assy Code dan Sequence sudah ada' }, { status: 409 });
    }

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error('[v0] Error in POST /api/assy:', error);
    return NextResponse.json({ error: 'Gagal menambah data - silakan periksa inputan Anda' }, { status: 500 });
  }
}
