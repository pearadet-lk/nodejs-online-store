import { randomUUID } from 'node:crypto';
import { createServiceApp, startService, type CartDto } from '@online-store/contracts';

const PORT = 5078;
const carts = new Map<string, CartDto>();

const app = createServiceApp('cart-service');

app.get<{ Params: { userId: string } }>('/carts/:userId', async (req, reply) => {
  const cart = carts.get(req.params.userId);
  if (!cart) {
    return reply.send({
      cartId: randomUUID(),
      userId: req.params.userId,
      items: [],
      updatedAt: new Date().toISOString()
    });
  }
  return reply.send(cart);
});

app.put<{ Params: { userId: string }; Body: { userId: string; items: CartDto['items'] } }>(
  '/carts/:userId',
  async (req, reply) => {
    if (req.params.userId !== req.body.userId) {
      return reply.status(400).send({ error: 'Route userId must match request userId.' });
    }
    const existing = carts.get(req.params.userId);
    const cart: CartDto = {
      cartId: existing?.cartId ?? randomUUID(),
      userId: req.params.userId,
      items: req.body.items,
      updatedAt: new Date().toISOString()
    };
    carts.set(req.params.userId, cart);
    return reply.send(cart);
  }
);

app.delete<{ Params: { userId: string } }>('/carts/:userId', async (req, reply) => {
  carts.delete(req.params.userId);
  return reply.status(204).send();
});

await startService(app, 'cart-service', PORT);
