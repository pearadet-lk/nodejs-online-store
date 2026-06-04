import { createHash, randomUUID } from 'node:crypto';
import type { CartItemDto, OrderDto } from '@online-store/contracts';

const INVENTORY = 'http://127.0.0.1:5212';
const ORDERS = 'http://127.0.0.1:5240';
const PAYMENTS = 'http://127.0.0.1:5031';
const SHIPPING = 'http://127.0.0.1:5219';
const HISTORY = 'http://127.0.0.1:5029';
const CARTS = 'http://127.0.0.1:5078';
const EMAIL = 'http://127.0.0.1:5164';

export type CheckoutRequest = {
  userId: string;
  currency: string;
  items: CartItemDto[];
};

type IdempotencyRecord = {
  requestHash: string;
  inProgress: boolean;
  statusCode?: number;
  responseBody?: string;
};

const idempotencyStore = new Map<string, IdempotencyRecord>();

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

async function call(
  url: string,
  init: RequestInit & { headers?: Record<string, string> } = {}
): Promise<Response> {
  return fetch(url, init);
}

export async function runCheckout(
  body: CheckoutRequest,
  idempotencyKey: string,
  userEmail: string,
  paymentIdempotencyKey: string
): Promise<{ status: number; body: unknown }> {
  const scopedKey = `checkout:${idempotencyKey}`;
  const requestHash = sha256(JSON.stringify(body));

  const existing = idempotencyStore.get(scopedKey);
  if (existing) {
    if (existing.requestHash !== requestHash) {
      return { status: 409, body: { error: 'Idempotency key reused with different payload.' } };
    }
    if (existing.inProgress) {
      return { status: 409, body: { error: 'Checkout already in progress.' } };
    }
    if (existing.responseBody) {
      return {
        status: existing.statusCode ?? 200,
        body: JSON.parse(existing.responseBody)
      };
    }
  }

  idempotencyStore.set(scopedKey, { requestHash, inProgress: true });

  const reserved: { productId: string; quantity: number }[] = [];
  let orderId: string | null = null;

  try {
    for (const item of body.items) {
      const res = await call(
        `${INVENTORY}/inventory/${item.productId}/reserve?quantity=${item.quantity}`,
        { method: 'POST' }
      );
      if (!res.ok) {
        throw new Error('Inventory reservation failed.');
      }
      reserved.push({ productId: item.productId, quantity: item.quantity });
    }

    const orderRes = await call(`${ORDERS}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!orderRes.ok) {
      throw new Error('Order creation failed.');
    }
    const order = (await orderRes.json()) as OrderDto;
    orderId = order.orderId;

    const payRes = await call(`${PAYMENTS}/payments/authorize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': paymentIdempotencyKey
      },
      body: JSON.stringify({
        orderId: order.orderId,
        amount: order.totalAmount,
        currency: order.currency,
        paymentMethodToken: 'tok_mock'
      })
    });
    if (!payRes.ok) {
      throw new Error('Payment authorization failed.');
    }

    for (const item of body.items) {
      const res = await call(
        `${INVENTORY}/inventory/${item.productId}/commit?quantity=${item.quantity}`,
        { method: 'POST' }
      );
      if (!res.ok) {
        throw new Error('Inventory commit failed.');
      }
    }

    const completeRes = await call(`${ORDERS}/orders/${order.orderId}/complete`, {
      method: 'POST'
    });
    if (!completeRes.ok) {
      throw new Error('Order completion failed.');
    }
    const completedOrder = (await completeRes.json()) as OrderDto;

    await call(`${SHIPPING}/shipments/${order.orderId}`, { method: 'POST' });

    await call(`${HISTORY}/history/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        historyId: '00000000-0000-0000-0000-000000000000',
        orderId: order.orderId,
        userId: body.userId,
        eventType: 'CheckoutCompleted',
        createdAt: new Date().toISOString(),
        notes: 'gateway-checkout'
      })
    });

    await call(`${EMAIL}/email/record`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: order.orderId, customerEmail: userEmail })
    });

    await call(`${CARTS}/carts/${body.userId}`, { method: 'DELETE' });

    const responseBody = {
      order: completedOrder,
      paymentIdempotencyKey
    };
    const serialized = JSON.stringify(responseBody);
    idempotencyStore.set(scopedKey, {
      requestHash,
      inProgress: false,
      statusCode: 200,
      responseBody: serialized
    });
    return { status: 200, body: responseBody };
  } catch (err) {
    for (const r of reserved) {
      await call(
        `${INVENTORY}/inventory/${r.productId}/release?quantity=${r.quantity}`,
        { method: 'POST' }
      ).catch(() => undefined);
    }
    if (orderId) {
      await call(`${ORDERS}/orders/${orderId}/fail`, { method: 'POST' }).catch(() => undefined);
    }
    idempotencyStore.set(scopedKey, { requestHash, inProgress: false });
    const message = err instanceof Error ? err.message : 'Checkout failed.';
    return { status: 500, body: { error: message } };
  }
}

export function newPaymentIdempotencyKey(checkoutKey: string): string {
  return `pay-${checkoutKey}-${randomUUID()}`;
}
