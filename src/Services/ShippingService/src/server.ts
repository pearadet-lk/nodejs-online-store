import { randomUUID } from 'node:crypto';
import { createServiceApp, servicePort, startService, type ShipmentDto } from '@online-store/contracts';

const PORT = servicePort(5219);
const shipments = new Map<string, ShipmentDto>();

const app = createServiceApp('shipping-service');

app.post<{ Params: { orderId: string } }>('/shipments/:orderId', async (req, reply) => {
  const shipment: ShipmentDto = {
    shipmentId: randomUUID(),
    orderId: req.params.orderId,
    carrier: 'DHL',
    trackingNumber: `TRK-${randomUUID().replace(/-/g, '').slice(0, 16)}`,
    status: 'Dispatched',
    createdAt: new Date().toISOString()
  };
  shipments.set(req.params.orderId, shipment);
  return reply.status(201).send(shipment);
});

app.get<{ Params: { orderId: string } }>('/shipments/:orderId', async (req, reply) => {
  const shipment = shipments.get(req.params.orderId);
  if (!shipment) return reply.status(404).send();
  return reply.send(shipment);
});

await startService(app, 'shipping-service', PORT);
