import { NextResponse, NextRequest } from 'next/server';

const SESSION_COOKIE_NAME = 'admin_session';
const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

// Secret key for signing sessions
const SECRET_KEY = process.env.SESSION_SECRET || 'default-fallback-session-secret-change-in-env-2026';

/** Convert string to Uint8Array */
function textToBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/** Convert ArrayBuffer to Hex String */
function bufferToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Generate HMAC-SHA256 signature using universal Web Crypto API */
async function generateSignature(data: string): Promise<string> {
  const keyBytes = textToBytes(SECRET_KEY);
  const dataBytes = textToBytes(data);

  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes as unknown as ArrayBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, dataBytes as unknown as ArrayBuffer);
  return bufferToHex(signature);
}

/** Create signed session token: "role:timestamp:expiresAt.signature" */
export async function createAdminSessionToken(): Promise<string> {
  const now = Date.now();
  const expiresAt = now + SESSION_MAX_AGE * 1000;
  const payload = `admin:${now}:${expiresAt}`;
  const signature = await generateSignature(payload);
  return `${payload}.${signature}`;
}

/** Verify a signed session token */
export async function verifyAdminSessionToken(token: string | null | undefined): Promise<boolean> {
  if (!token) return false;

  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [payload, signature] = parts;
  const expectedSignature = await generateSignature(payload);

  if (signature !== expectedSignature) {
    return false;
  }

  const [role, , expiresAtStr] = payload.split(':');
  if (role !== 'admin') return false;

  const expiresAt = parseInt(expiresAtStr, 10);
  if (isNaN(expiresAt) || Date.now() > expiresAt) {
    return false; // Token expired
  }

  return true;
}

/** Extract session cookie from Request */
function extractCookieFromRequest(request: Request | NextRequest): string | null {
  if ('cookies' in request && typeof (request as NextRequest).cookies?.get === 'function') {
    const c = (request as NextRequest).cookies.get(SESSION_COOKIE_NAME);
    return c?.value || null;
  }

  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE_NAME}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/** Verify admin session from incoming request */
export async function verifyAdminSession(request: Request | NextRequest): Promise<boolean> {
  const token = extractCookieFromRequest(request);
  return verifyAdminSessionToken(token);
}

/** Set Admin Session Cookie on NextResponse */
export async function setAdminSessionCookie(response: NextResponse): Promise<NextResponse> {
  const token = await createAdminSessionToken();
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
  return response;
}

/** Clear Admin Session Cookie on NextResponse */
export function clearAdminSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
