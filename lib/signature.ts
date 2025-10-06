import crypto from 'crypto';

export function signPayload(body: string, secret: string) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(body, 'utf8');
  return `sha256=${hmac.digest('hex')}`;
}

export function verifySignature(body: string, signatureHeader: string | null, secret: string) {
  if (!signatureHeader) {
    return false;
  }
  const expected = signPayload(body, secret);
  return timingSafeEqual(expected, signatureHeader);
}

function timingSafeEqual(a: string, b: string) {
  const buffA = Buffer.from(a);
  const buffB = Buffer.from(b);
  if (buffA.length !== buffB.length) {
    return false;
  }
  return crypto.timingSafeEqual(buffA, buffB);
}
