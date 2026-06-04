import {
  buildCatalogProducts,
  createServiceApp,
  startService,
  type InventoryItemDto
} from '@online-store/contracts';

const PORT = 5212;
const items = new Map<string, InventoryItemDto>();

for (const p of buildCatalogProducts()) {
  items.set(p.productId, {
    productId: p.productId,
    availableQty: 100,
    reservedQty: 0,
    updatedAt: new Date().toISOString()
  });
}

function tryReserve(productId: string, quantity: number): { ok: boolean; error?: string } {
  const item = items.get(productId);
  if (!item) return { ok: false, error: 'not_found' };
  if (item.availableQty < quantity) return { ok: false, error: 'insufficient' };
  items.set(productId, {
    ...item,
    availableQty: item.availableQty - quantity,
    reservedQty: item.reservedQty + quantity,
    updatedAt: new Date().toISOString()
  });
  return { ok: true };
}

function tryRelease(productId: string, quantity: number): { ok: boolean; error?: string } {
  const item = items.get(productId);
  if (!item) return { ok: false, error: 'not_found' };
  if (item.reservedQty < quantity) return { ok: false, error: 'invalid' };
  items.set(productId, {
    ...item,
    availableQty: item.availableQty + quantity,
    reservedQty: item.reservedQty - quantity,
    updatedAt: new Date().toISOString()
  });
  return { ok: true };
}

function tryCommit(productId: string, quantity: number): { ok: boolean; error?: string } {
  const item = items.get(productId);
  if (!item) return { ok: false, error: 'not_found' };
  if (item.reservedQty < quantity) return { ok: false, error: 'invalid' };
  items.set(productId, {
    ...item,
    reservedQty: item.reservedQty - quantity,
    updatedAt: new Date().toISOString()
  });
  return { ok: true };
}

const app = createServiceApp('inventory-service');

app.get<{ Params: { productId: string } }>('/inventory/:productId', async (req, reply) => {
  const item = items.get(req.params.productId);
  if (!item) return reply.status(404).send();
  return reply.send(item);
});

app.put<{ Params: { productId: string }; Querystring: { availableQty?: string } }>(
  '/inventory/:productId',
  async (req, reply) => {
    const availableQty = Number(req.query.availableQty ?? 0);
    const existing = items.get(req.params.productId);
    const reservedQty = existing?.reservedQty ?? 0;
    const updated: InventoryItemDto = {
      productId: req.params.productId,
      availableQty: Math.max(0, availableQty),
      reservedQty,
      updatedAt: new Date().toISOString()
    };
    items.set(req.params.productId, updated);
    return reply.send(updated);
  }
);

app.post<{ Params: { productId: string }; Querystring: { quantity?: string } }>(
  '/inventory/:productId/reserve',
  async (req, reply) => {
    const quantity = Number(req.query.quantity ?? 0);
    const result = tryReserve(req.params.productId, quantity);
    if (!result.ok) {
      return result.error === 'not_found'
        ? reply.status(404).send()
        : reply.status(400).send({ error: 'Insufficient stock.' });
    }
    return reply.send(items.get(req.params.productId));
  }
);

app.post<{ Params: { productId: string }; Querystring: { quantity?: string } }>(
  '/inventory/:productId/release',
  async (req, reply) => {
    const quantity = Number(req.query.quantity ?? 0);
    const result = tryRelease(req.params.productId, quantity);
    if (!result.ok) {
      return result.error === 'not_found'
        ? reply.status(404).send()
        : reply.status(400).send({ error: 'Cannot release more than reserved quantity.' });
    }
    return reply.send(items.get(req.params.productId));
  }
);

app.post<{ Params: { productId: string }; Querystring: { quantity?: string } }>(
  '/inventory/:productId/commit',
  async (req, reply) => {
    const quantity = Number(req.query.quantity ?? 0);
    const result = tryCommit(req.params.productId, quantity);
    if (!result.ok) {
      return result.error === 'not_found'
        ? reply.status(404).send()
        : reply.status(400).send({ error: 'Cannot commit more than reserved quantity.' });
    }
    return reply.send(items.get(req.params.productId));
  }
);

await startService(app, 'inventory-service', PORT);
