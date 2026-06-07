import { randomUUID } from 'node:crypto';
import { createServiceApp, servicePort, startService, type OrderHistoryEventDto } from '@online-store/contracts';

const PORT = servicePort(5029);
const eventsByUser = new Map<string, OrderHistoryEventDto[]>();

const app = createServiceApp('history-service');

app.post<{ Body: OrderHistoryEventDto }>('/history/events', async (req, reply) => {
  const history: OrderHistoryEventDto = {
    historyId: req.body.historyId && req.body.historyId !== '00000000-0000-0000-0000-000000000000'
      ? req.body.historyId
      : randomUUID(),
    orderId: req.body.orderId,
    userId: req.body.userId,
    eventType: req.body.eventType,
    createdAt: req.body.createdAt || new Date().toISOString(),
    notes: req.body.notes ?? ''
  };
  const list = eventsByUser.get(history.userId) ?? [];
  list.push(history);
  eventsByUser.set(history.userId, list);
  return reply.status(201).send(history);
});

app.get<{ Params: { userId: string } }>('/history/users/:userId', async (req, reply) => {
  const events = eventsByUser.get(req.params.userId) ?? [];
  return reply.send(
    [...events].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  );
});

await startService(app, 'history-service', PORT);
