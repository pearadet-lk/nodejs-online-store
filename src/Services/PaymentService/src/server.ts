import { createHash, randomUUID } from 'node:crypto';
import { createServiceApp, servicePort, startService, type PaymentDto } from '@online-store/contracts';

const PORT = servicePort(5031);
const paymentsByOrderId = new Map<string, PaymentDto>();
const idempotency = new Map<string, { requestHash: string; payment: PaymentDto }>();

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

const app = createServiceApp('payment-service');

app.post<{
  Body: { orderId: string; amount: number; currency: string; paymentMethodToken: string };
}>('/payments/authorize', async (req, reply) => {
  const idempotencyKey = req.headers['idempotency-key'];
  if (!idempotencyKey || Array.isArray(idempotencyKey)) {
    return reply.status(400).send({ error: 'Missing Idempotency-Key header.' });
  }
  const key = idempotencyKey.trim();
  if (!key) {
    return reply.status(400).send({ error: 'Idempotency-Key header cannot be empty.' });
  }

  const payloadHash = sha256(JSON.stringify(req.body));
  const existing = idempotency.get(key);
  if (existing) {
    if (existing.requestHash !== payloadHash) {
      return reply.status(409).send({ error: 'Idempotency key reused with different payload.' });
    }
    return reply.send(existing.payment);
  }

  const payment: PaymentDto = {
    paymentId: randomUUID(),
    orderId: req.body.orderId,
    amount: req.body.amount,
    currency: req.body.currency.toUpperCase(),
    status: 'Authorized',
    providerReference: `mock_stripe_pi_${randomUUID().replace(/-/g, '')}`,
    createdAt: new Date().toISOString()
  };
  paymentsByOrderId.set(req.body.orderId, payment);
  idempotency.set(key, { requestHash: payloadHash, payment });
  return reply.send(payment);
});

app.get<{ Params: { orderId: string } }>('/payments/:orderId', async (req, reply) => {
  const payment = paymentsByOrderId.get(req.params.orderId);
  if (!payment) return reply.status(404).send();
  return reply.send(payment);
});

app.post<{ Params: { orderId: string } }>('/payments/:orderId/void', async (req, reply) => {
  const payment = paymentsByOrderId.get(req.params.orderId);
  if (!payment) return reply.status(404).send();
  const updated = { ...payment, status: 'Voided' };
  paymentsByOrderId.set(req.params.orderId, updated);
  return reply.send(updated);
});

await startService(app, 'payment-service', PORT);
