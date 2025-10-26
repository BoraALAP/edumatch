import { NextRequest } from 'next/server';

export const runtime = 'edge';
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const targetUrl = new URL('/api/practice/analyze-voice/process', request.url);

  const forwardHeaders = new Headers();
  request.headers.forEach((value, key) => {
    forwardHeaders.set(key, value);
  });

  const response = await fetch(targetUrl, {
    method: 'POST',
    body,
    headers: forwardHeaders,
    redirect: 'manual',
  });

  const headers = new Headers(response.headers);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
