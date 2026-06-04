import { randomUUID } from 'node:crypto';
import { createServiceApp, startService, type CartItemDto, type OrderDto } from '@online-store/contracts';

const PORT = 5240;
const orders = new Map<string, OrderDto>();

const app = createServiceApp('order-service');

app.post<{ Body: { userId: string; currency: string; items: CartItemDto[] } }>(
  '/orders',
  async (req, reply) => {
    const totalAmount = req.body.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
    const order: OrderDto = {
      orderId: randomUUID(),
      userId: req.body.userId,
      totalAmount,
      currency: req.body.currency.toUpperCase(),
      status: 'Pending',
      createdAt: new Date().toISOString()
    };
    orders.set(order.orderId, order);
    return reply.status(201).send(order);
  }
);

app.get<{ Params: { orderId: string } }>('/orders/:orderId', async (req, reply) => {
  const order = orders.get(req.params.orderId);
  if (!order) return reply.status(404).send();
  return reply.send(order);
});

app.post<{ Params: { orderId: string } }>('/orders/:orderId/complete', async (req, reply) => {
  const order = orders.get(req.params.orderId);
  if (!order) return reply.status(404).send();
  const updated = { ...order, status: 'Completed' };
  orders.set(order.orderId, updated);
  return reply.send(updated);
});

app.post<{ Params: { orderId: string } }>('/orders/:orderId/fail', async (req, reply) => {
  const order = orders.get(req.params.orderId);
  if (!order) return reply.status(404).send();
  const updated = { ...order, status: 'Failed' };
  orders.set(order.orderId, updated);
  return reply.send(updated);
});

await startService(app, 'order-service', PORT);
