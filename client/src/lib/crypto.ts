const enc = new TextEncoder();
const dec = new TextDecoder();

export async function deriveMasterKey(password: string, base64Salt: string): Promise<CryptoKey> {
  const salt = base64ToBytes(base64Salt);
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 150000 },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
  return key;
}

export async function encryptJson(data: any, key: CryptoKey): Promise<{ cipherText: string; iv: string }>{
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const pt = enc.encode(JSON.stringify(data));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, pt);
  return { cipherText: bytesToBase64(new Uint8Array(ct)), iv: bytesToBase64(iv) };
}

export async function decryptJson(cipherText: string, iv: string, key: CryptoKey): Promise<any> {
  const ct = base64ToBytes(cipherText);
  const ivb = base64ToBytes(iv);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivb }, key, ct);
  return JSON.parse(dec.decode(pt));
}

export async function sha256Hex(input: string): Promise<string> {
  const h = await crypto.subtle.digest('SHA-256', enc.encode(input));
  return Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function passwordStrength(pw: string): number {
  const len = pw.length;
  let space = 0;
  if (/[a-z]/.test(pw)) space += 26;
  if (/[A-Z]/.test(pw)) space += 26;
  if (/\d/.test(pw)) space += 10;
  if (/[^\w]/.test(pw)) space += 20;
  space = Math.max(space, 26);
  const bits = Math.min(120, Math.log2(Math.pow(space, Math.max(1, len))));
  const score = Math.max(0, Math.min(100, Math.round(bits / 120 * 100)));
  return score;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
export function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
