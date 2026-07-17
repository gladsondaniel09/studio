import { NextRequest, NextResponse } from 'next/server';
import { firebaseConfig } from '@/firebase/config';

// Edge Runtime streams the response instead of buffering it — session files can be well over
// 100MB, and Vercel's default Node.js serverless functions cap response bodies at 4.5MB.
export const runtime = 'edge';

/**
 * Proxies a Firebase Storage download server-side.
 *
 * The browser calling firebasestorage.googleapis.com's ?alt=media endpoint directly fails with
 * a CORS error for this app — Firebase Storage buckets only allow cross-origin fetch from
 * origins explicitly added to the bucket's CORS config (normally done via `gsutil cors set`),
 * and this app is hosted on Vercel, not a Firebase-recognized domain. Fetching it here instead
 * (server-to-server) isn't subject to browser CORS at all, and the client then requests this
 * same-origin route instead of Storage directly.
 */
export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get('path');
  if (!path) {
    return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 });
  }
  // Storage is effectively open-read for this app (no auth flow) — restrict this proxy to the
  // one prefix session files actually live under, so it can't be used as an open proxy for
  // arbitrary paths in the bucket.
  if (!path.startsWith('sessions/')) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  const bucket = firebaseConfig.storageBucket;
  const url = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media`;

  let upstream: Response;
  try {
    upstream = await fetch(url);
  } catch (e: any) {
    return NextResponse.json({ error: `Upstream request failed: ${e.message}` }, { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: `Storage returned ${upstream.status}` }, { status: upstream.status || 502 });
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': upstream.headers.get('content-type') || 'application/octet-stream',
      'Cache-Control': 'no-store',
    },
  });
}
