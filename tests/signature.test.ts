import { describe, expect, it } from 'vitest';
import { signPayload, verifySignature } from '../lib/signature';

const SECRET = 'super-secret';

describe('signature utils', () => {
  it('creates deterministic signatures', () => {
    const body = JSON.stringify({ hello: 'world' });
    const first = signPayload(body, SECRET);
    const second = signPayload(body, SECRET);
    expect(first).toBe(second);
  });

  it('validates signatures with HMAC SHA256', () => {
    const body = JSON.stringify({ answer: 42 });
    const signature = signPayload(body, SECRET);
    expect(verifySignature(body, signature, SECRET)).toBe(true);
  });

  it('rejects invalid signatures', () => {
    const body = JSON.stringify({ foo: 'bar' });
    const signature = signPayload(body, SECRET);
    expect(verifySignature(body, signature.replace('a', 'b'), SECRET)).toBe(false);
  });
});
