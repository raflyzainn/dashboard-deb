import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { PreviewError } from './preview-error';

export const security = {
  sha256: (value: string) => createHash('sha256').update(value).digest('hex'),
  randomString: (length: number) => randomBytes(length).toString('hex').slice(0, length),
  createJWT(claims: Record<string, unknown>, secret: string, duration: number) {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify({ ...claims, exp: Math.floor(Date.now() / 1000) + duration })).toString('base64url');
    const data = `${header}.${body}`;
    return `${data}.${createHmac('sha256', secret).update(data).digest('base64url')}`;
  },
  parseJWT(token: string, secret: string): Record<string, any> {
    try {
      if (typeof token !== 'string' || token.length > 16384) throw new Error();
      const parts = token.split('.'); if (parts.length !== 3) throw new Error();
      const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
      if (header.alg !== 'HS256') throw new Error();
      const expected = createHmac('sha256', secret).update(parts[0] + '.' + parts[1]).digest();
      const signature = Buffer.from(parts[2], 'base64url');
      if (signature.length !== expected.length || !timingSafeEqual(signature, expected)) throw new Error();
      const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      if (!Number.isFinite(claims.exp) || claims.exp <= Date.now() / 1000) throw new Error();
      return claims;
    } catch { throw new PreviewError(400, 'Tautan atau sesi tidak dapat digunakan.'); }
  }
};
