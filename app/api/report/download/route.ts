import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const filename = url.searchParams.get('file');

    if (!filename) {
      return NextResponse.json(
        { error: 'File parameter is required' },
        { status: 400 }
      );
    }

    // Validate filename (prevent directory traversal)
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return NextResponse.json(
        { error: 'Invalid filename' },
        { status: 400 }
      );
    }

    const tempDir = '/tmp/bom-exports';
    const filepath = path.join(tempDir, filename);

    // Check if file exists
    if (!fs.existsSync(filepath)) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Read file
    const buffer = fs.readFileSync(filepath);

    // Delete file after serving (cleanup)
    try {
      fs.unlinkSync(filepath);
    } catch (e) {
      console.warn('[Download] Failed to delete temp file:', filepath);
    }

    // Extract readable filename from the generated name
    const displayName = filename.includes('_') 
      ? `report_${new Date().toISOString().split('T')[0]}.xlsx`
      : filename;

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${displayName}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('[Download Error]', error);
    return NextResponse.json(
      { error: 'Gagal mengunduh file' },
      { status: 500 }
    );
  }
}
