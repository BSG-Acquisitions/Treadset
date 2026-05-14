// AES-256-GCM encrypt/decrypt + HMAC-SHA256 OAuth-state signing for QBO.
// One master key in env (`QUICKBOOKS_TOKEN_KEY`, 32-byte base64) covers all QBO
// token storage. State signing uses `QUICKBOOKS_STATE_SECRET`.
//
// IMPORTANT: never log decrypted tokens. Never return ciphertext to a client.

const STATE_MAX_AGE_MS = 15 * 60 * 1000;

function b64ToBytes(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}
function bytesToB64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}
function bytesToB64Url(bytes: Uint8Array): string {
  return bytesToB64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64UrlToBytes(b64u: string): Uint8Array {
  return b64ToBytes(b64u.replace(/-/g, '+').replace(/_/g, '/'));
}

export async function encryptToken(plaintext: string, masterKeyB64: string): Promise<string> {
  const keyBytes = b64ToBytes(masterKeyB64);
  if (keyBytes.length !== 32) {
    throw new Error('QUICKBOOKS_TOKEN_KEY must be a 32-byte base64 value');
  }
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt']);
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext)
  );
  // Combined = iv || ciphertext (the ciphertext includes the 16-byte auth tag at the end)
  const combined = new Uint8Array(iv.length + ct.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ct), iv.length);
  return bytesToB64(combined);
}

export async function decryptToken(ciphertextB64: string, masterKeyB64: string): Promise<string> {
  const combined = b64ToBytes(ciphertextB64);
  const iv = combined.slice(0, 12);
  const ct = combined.slice(12);
  const keyBytes = b64ToBytes(masterKeyB64);
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['decrypt']);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return new TextDecoder().decode(pt);
}

export async function signState(orgId: string, secret: string): Promise<string> {
  const payload = `${orgId}.${Date.now()}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return `${bytesToB64Url(new TextEncoder().encode(payload))}.${bytesToB64Url(new Uint8Array(sig))}`;
}

export async function verifyState(
  state: string,
  secret: string
): Promise<{ ok: true; orgId: string } | { ok: false; reason: string }> {
  const [payloadB64, sigB64] = state.split('.');
  if (!payloadB64 || !sigB64) return { ok: false, reason: 'malformed state' };

  let payload: string;
  try {
    payload = new TextDecoder().decode(b64UrlToBytes(payloadB64));
  } catch {
    return { ok: false, reason: 'bad payload encoding' };
  }

  const [orgId, tsStr] = payload.split('.');
  const ts = Number(tsStr);
  if (!orgId || !Number.isFinite(ts)) return { ok: false, reason: 'bad payload format' };
  if (Date.now() - ts > STATE_MAX_AGE_MS) return { ok: false, reason: 'state expired' };

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const expected = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const expectedB64 = bytesToB64Url(new Uint8Array(expected));

  if (!constantTimeEqual(sigB64, expectedB64)) return { ok: false, reason: 'signature mismatch' };
  return { ok: true, orgId };
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
