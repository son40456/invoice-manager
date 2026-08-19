import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';

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

/** Get current active session version from Database */
export async function getCurrentSessionVersion(): Promise<string> {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: 'admin_session_version' },
    });
    return setting?.value || '1';
  } catch (error) {
    console.error('Error fetching session version:', error);
    return '1';
  }
}

/** Invalidate all sessions by incrementing the session version in Database */
export async function incrementSessionVersion(): Promise<string> {
  const newVersion = Date.now().toString();
  await prisma.setting.upsert({
    where: { key: 'admin_session_version' },
    update: { value: newVersion },
    create: { key: 'admin_session_version', value: newVersion },
  });
  return newVersion;
}

/** Create signed session token: "role:version:timestamp:expiresAt.signature" */
export async function createAdminSessionToken(customVersion?: string): Promise<string> {
  const now = Date.now();
  const expiresAt = now + SESSION_MAX_AGE * 1000;
  const version = customVersion || (await getCurrentSessionVersion());
  const payload = `admin:${version}:${now}:${expiresAt}`;
  const signature = await generateSignature(payload);
  return `${payload}.${signature}`;
}

/** Verify a signed session token (Fast check: signature + expiration) */
export async function verifyAdminSessionTokenFast(token: string | null | undefined): Promise<boolean> {
  if (!token) return false;

  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [payload, signature] = parts;
  const expectedSignature = await generateSignature(payload);

  if (signature !== expectedSignature) {
    return false;
  }

  const partsArray = payload.split(':');
  // Format: "admin:version:timestamp:expiresAt" or legacy "admin:timestamp:expiresAt"
  let role = '';
  let expiresAtStr = '';

  if (partsArray.length === 4) {
    [role, , , expiresAtStr] = partsArray;
  } else if (partsArray.length === 3) {
    [role, , expiresAtStr] = partsArray;
  } else {
    return false;
  }

  if (role !== 'admin') return false;

  const expiresAt = parseInt(expiresAtStr, 10);
  if (isNaN(expiresAt) || Date.now() > expiresAt) {
    return false; // Token expired
  }

  return true;
}

/** Verify a signed session token strictly against Database Session Version */
export async function verifyAdminSessionToken(token: string | null | undefined): Promise<boolean> {
  const isValidFast = await verifyAdminSessionTokenFast(token);
  if (!isValidFast || !token) return false;

  const [payload] = token.split('.');
  const partsArray = payload.split(':');

  // If token uses versioning ("admin:version:timestamp:expiresAt")
  if (partsArray.length === 4) {
    const tokenVersion = partsArray[1];
    const currentVersion = await getCurrentSessionVersion();
    if (tokenVersion !== currentVersion) {
      return false; // Session version mismatch (Revoked by admin logout all / password change)
    }
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

/** Verify admin session from incoming request (Strict DB check in API routes) */
export async function verifyAdminSession(request: Request | NextRequest): Promise<boolean> {
  const token = extractCookieFromRequest(request);
  return verifyAdminSessionToken(token);
}

/** Fast verify admin session (for Edge Middleware) */
export async function verifyAdminSessionFast(request: Request | NextRequest): Promise<boolean> {
  const token = extractCookieFromRequest(request);
  return verifyAdminSessionTokenFast(token);
}

/** Set Admin Session Cookie on NextResponse */
export async function setAdminSessionCookie(response: NextResponse, customVersion?: string): Promise<NextResponse> {
  const token = await createAdminSessionToken(customVersion);
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

/** Get secret Admin URL path configured via ADMIN_SECRET_PATH environment variable */
export function getAdminSecretPath(): string {
  const custom = process.env.ADMIN_SECRET_PATH?.trim().replace(/^\/+|\/+$/g, '');
  return custom ? `/${custom}` : '/lmc-quan-tri';
}

