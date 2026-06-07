import { randomUUID } from 'node:crypto';
import {
  buildCatalogProducts,
  createServiceApp,
  servicePort,
  startService,
  type ProductDto
} from '@online-store/contracts';

const PORT = servicePort(5225);
const products = new Map<string, ProductDto>();

for (const p of buildCatalogProducts()) {
  products.set(p.productId, p);
}

function listProducts(q: string | undefined, includeInactive: boolean): ProductDto[] {
  const needle = q?.trim().toLowerCase();
  return [...products.values()].filter((p) => {
    if (!includeInactive && !p.isActive) return false;
    if (!needle) return true;
    return (
      p.name.toLowerCase().includes(needle) || p.description.toLowerCase().includes(needle)
    );
  });
}

const app = createServiceApp('product-service');

app.get<{ Querystring: { q?: string } }>('/products', async (req, reply) => {
  return reply.send(listProducts(req.query.q, false));
});

app.get<{ Params: { productId: string }; Querystring: { q?: string } }>(
  '/products/:productId',
  async (req, reply) => {
    const p = products.get(req.params.productId);
    if (!p || !p.isActive) return reply.status(404).send();
    return reply.send(p);
  }
);

app.get<{ Querystring: { q?: string } }>('/admin/products', async (req, reply) => {
  return reply.send(listProducts(req.query.q, true));
});

app.post<{ Body: ProductDto }>('/products', async (req, reply) => {
  if (req.body.price < 0) {
    return reply.status(400).send({ error: 'Price must be greater than or equal to zero.' });
  }
  const created: ProductDto = {
    productId: req.body.productId || randomUUID(),
    name: req.body.name,
    description: req.body.description ?? '',
    price: req.body.price,
    isActive: req.body.isActive ?? true
  };
  products.set(created.productId, created);
  return reply.status(201).send(created);
});

app.put<{ Params: { productId: string }; Body: ProductDto }>(
  '/products/:productId',
  async (req, reply) => {
    if (req.body.price < 0) {
      return reply.status(400).send({ error: 'Price must be greater than or equal to zero.' });
    }
    const existing = products.get(req.params.productId);
    if (!existing) return reply.status(404).send();
    const updated: ProductDto = {
      productId: req.params.productId,
      name: req.body.name,
      description: req.body.description ?? '',
      price: req.body.price,
      isActive: req.body.isActive ?? existing.isActive
    };
    products.set(updated.productId, updated);
    return reply.send(updated);
  }
);

app.delete<{ Params: { productId: string } }>('/products/:productId', async (req, reply) => {
  const existing = products.get(req.params.productId);
  if (!existing) return reply.status(404).send();
  products.set(req.params.productId, { ...existing, isActive: false });
  return reply.status(204).send();
});

await startService(app, 'product-service', PORT);
