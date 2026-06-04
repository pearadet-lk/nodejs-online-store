import cors from '@fastify/cors';
import jwt from 'jsonwebtoken';
import Fastify from 'fastify';
import { loadAuthConfig, startService } from '@online-store/contracts';
import { ANONYMOUS_USER_PATHS, resolveCluster } from './clusters.js';
import { newPaymentIdempotencyKey, runCheckout, type CheckoutRequest } from './checkout.js';

const PORT = 5152;
const auth = loadAuthConfig();

type JwtPayload = { sub: string; email?: string; name?: string };

const app = Fastify({ logger: true });
await app.register(cors, { origin: ['http://localhost:4200'], credentials: true });

app.get('/health', async () => ({ service: 'gateway', status: 'ok' }));

function verifyToken(header: string | undefined): JwtPayload | null {
  if (!header?.startsWith('Bearer ')) {
    return null;
  }
  try {
    return jwt.verify(header.slice(7), auth.jwtSigningKey, {
      issuer: auth.jwtIssuer,
      audience: auth.jwtAudience
    }) as JwtPayload;
  } catch {
    return null;
  }
}

async function proxyRequest(
  req: { method: string; url: string; headers: Record<string, string | string[] | undefined>; body?: unknown },
  reply: import('fastify').FastifyReply,
  claims: JwtPayload | null
): Promise<void> {
  const url = new URL(req.url, 'http://gateway.local');
  const cluster = resolveCluster(url.pathname);
  if (!cluster) {
    reply.code(404).send({ error: 'Route not found.' });
    return;
  }

  let downstreamPath: string;
  if (cluster.name === 'admin-product') {
    const suffix = url.pathname.slice('/api/admin/products'.length);
    downstreamPath = suffix ? `/products${suffix}` : '/admin/products';
  } else {
    downstreamPath = url.pathname.replace('/api', '') || '/';
  }

  const target = `${cluster.upstream}${downstreamPath}${url.search}`;
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (!value || key.toLowerCase() === 'host') continue;
    if (Array.isArray(value)) {
      headers.set(key, value.join(','));
    } else {
      headers.set(key, value);
    }
  }
  if (claims) {
    headers.set('X-Authenticated-UserId', claims.sub);
    if (claims.email) headers.set('X-Authenticated-Email', claims.email);
    if (claims.name) headers.set('X-Authenticated-Name', claims.name);
  }

  const init: RequestInit = { method: req.method, headers };
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.body !== undefined) {
    init.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    if (!headers.has('content-type')) {
      headers.set('Content-Type', 'application/json');
    }
  }

  const response = await fetch(target, init);
  const text = await response.text();
  const contentType = response.headers.get('content-type');
  if (contentType) {
    reply.header('content-type', contentType);
  }
  if (!text) {
    reply.code(response.status).send();
    return;
  }
  try {
    reply.code(response.status).send(JSON.parse(text));
  } catch {
    reply.code(response.status).send(text);
  }
}

app.route({
  method: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  url: '/api/checkout',
  handler: async (req, reply) => {
    if (req.method !== 'POST') {
      return reply.status(405).send({ error: 'Method not allowed.' });
    }
    const claims = verifyToken(req.headers.authorization);
    if (!claims) {
      return reply.status(401).send({ error: 'Unauthorized.' });
    }
    const idempotencyKey = req.headers['idempotency-key'];
    if (!idempotencyKey || Array.isArray(idempotencyKey)) {
      return reply.status(400).send({ error: 'Missing Idempotency-Key header.' });
    }
    const body = req.body as CheckoutRequest;
    if (claims.sub !== body.userId) {
      return reply.status(403).send({ error: 'User mismatch.' });
    }
    const paymentKey = newPaymentIdempotencyKey(idempotencyKey);
    const result = await runCheckout(
      body,
      idempotencyKey,
      claims.email ?? 'customer@example.com',
      paymentKey
    );
    return reply.status(result.status).send(result.body);
  }
});

app.route({
  method: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  url: '/api/*',
  handler: async (req, reply) => {
    const url = new URL(req.url, 'http://gateway.local');
    const isAnonymous = ANONYMOUS_USER_PATHS.has(url.pathname);
    const claims = verifyToken(req.headers.authorization);
    if (!isAnonymous && !claims) {
      return reply.status(401).send({ error: 'Unauthorized.' });
    }
    return proxyRequest(req, reply, claims);
  }
});

await startService(app, 'gateway', PORT);
