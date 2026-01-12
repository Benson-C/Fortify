import { NextResponse } from 'next/server';
import { getClientIP } from '@/lib/rate-limit';

/**
 * API route to get client IP for rate limiting
 * In production, this should be handled at the edge/server level
 */
export async function GET(request: Request) {
  const ip = getClientIP(request);
  return NextResponse.json({ ip });
}
