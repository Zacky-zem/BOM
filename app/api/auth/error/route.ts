import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const error = searchParams.get('error');
  
  // Redirect back to login with error message
  return NextResponse.redirect(new URL(`/login?error=${error || 'unknown'}`, request.url));
}
