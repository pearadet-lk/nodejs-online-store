import { randomUUID } from 'node:crypto';
import { createServiceApp, servicePort, startService, type EmailSendStatusDto } from '@online-store/contracts';

const PORT = servicePort(5164);
const statusByOrderId = new Map<string, EmailSendStatusDto>();

const app = createServiceApp('email-service');

app.get('/email/status/:orderId', async (req, reply) => {
  const status = statusByOrderId.get((req.params as { orderId: string }).orderId);
  if (!status) {
    return reply.status(404).send({ error: 'No email status found for order.' });
  }
  return reply.send(status);
});

app.get('/email/status', async (_req, reply) => {
  const list = [...statusByOrderId.values()].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt)
  );
  return reply.send(list);
});

function recordEmailSent(orderId: string, customerEmail: string): void {
  statusByOrderId.set(orderId, {
    notificationId: randomUUID(),
    orderId,
    customerEmail,
    status: 'Sent',
    attemptCount: 1,
    errorMessage: null,
    updatedAt: new Date().toISOString()
  });
}

app.post<{ Body: { orderId: string; customerEmail: string } }>(
  '/email/record',
  async (req, reply) => {
    recordEmailSent(req.body.orderId, req.body.customerEmail);
    return reply.status(204).send();
  }
);

await startService(app, 'email-service', PORT);
