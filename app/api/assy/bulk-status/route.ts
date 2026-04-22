import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// POST /api/assy/bulk-status — toggle status multiple ASSY
export async function POST(request: Request) {
  const client = await pool.connect();
  try {
    const { ids } = await request.json() as { ids: number[] };

    if (!ids?.length) {
      return NextResponse.json({ error: 'Tidak ada data yang dipilih' }, { status: 400 });
    }

    await client.query('BEGIN');

    // Toggle: active → inactive, inactive → active
    const result = await client.query(`
      UPDATE master_assy
      SET is_active = NOT is_active, updated_at = NOW()
      WHERE id = ANY($1)
      RETURNING id, assy_code, is_active
    `, [ids]);

    await client.query('COMMIT');

    const activated   = result.rows.filter((r: { is_active: boolean }) => r.is_active).length;
    const deactivated = result.rows.filter((r: { is_active: boolean }) => !r.is_active).length;

    return NextResponse.json({
      message: `Status berhasil diubah — ${activated} diaktifkan, ${deactivated} dinonaktifkan`,
      updated: result.rows,
      activated,
      deactivated,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    return NextResponse.json({ error: 'Gagal mengubah status' }, { status: 500 });
  } finally {
    client.release();
  }
}
