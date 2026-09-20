import { createHash, createHmac } from 'crypto';

type StoredObject = { body: Buffer; contentType: string; contentLength?: number };

const hash = (value: Buffer | string) => createHash('sha256').update(value).digest('hex');
const hmac = (key: Buffer | string, value: string) => createHmac('sha256', key).update(value).digest();

function config() {
  const accountId = process.env.R2_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID || '';
  const accessKeyId = process.env.R2_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || '';
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || '';
  const bucket = process.env.R2_BUCKET_NAME || process.env.R2_BUCKET || 'catalogs';
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) throw new Error('Secure document storage is not configured.');
  return { accountId, accessKeyId, secretAccessKey, bucket };
}

function encodedPath(bucket: string, key: string) {
  return `/${encodeURIComponent(bucket)}/${key.split('/').map(segment => encodeURIComponent(segment)).join('/')}`;
}

async function signedFetch(method: 'GET' | 'PUT' | 'DELETE', key: string, body?: Buffer, contentType = 'application/octet-stream') {
  const { accountId, accessKeyId, secretAccessKey, bucket } = config();
  const host = `${accountId}.r2.cloudflarestorage.com`;
  const path = encodedPath(bucket, key);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = hash(body || Buffer.alloc(0));
  const signedHeaders = method === 'PUT' ? 'content-type;host;x-amz-content-sha256;x-amz-date' : 'host;x-amz-content-sha256;x-amz-date';
  const canonicalHeaders = `${method === 'PUT' ? `content-type:${contentType}\n` : ''}host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const canonicalRequest = [method, path, '', canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const scope = `${dateStamp}/auto/s3/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, hash(canonicalRequest)].join('\n');
  const dateKey = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const regionKey = hmac(dateKey, 'auto');
  const serviceKey = hmac(regionKey, 's3');
  const signingKey = hmac(serviceKey, 'aws4_request');
  const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');
  const headers: Record<string, string> = {
    Authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    Host: host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
  };
  if (method === 'PUT') headers['Content-Type'] = contentType;
  const response = await fetch(`https://${host}${path}`, { method, headers, body: body as any, cache: 'no-store' });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    throw new Error(`Secure document storage rejected the request (${response.status})${detail ? `: ${detail}` : '.'}`);
  }
  return response;
}

export function safeObjectName(name: string) {
  const cleaned = name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120);
  return cleaned || 'document';
}

export async function putPrivateObject(key: string, body: Buffer, contentType: string) {
  await signedFetch('PUT', key, body, contentType);
}

export async function getPrivateObject(key: string): Promise<StoredObject> {
  const response = await signedFetch('GET', key);
  return {
    body: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get('content-type') || 'application/octet-stream',
    contentLength: Number(response.headers.get('content-length') || 0) || undefined,
  };
}

export async function deletePrivateObject(key: string) {
  await signedFetch('DELETE', key);
}
