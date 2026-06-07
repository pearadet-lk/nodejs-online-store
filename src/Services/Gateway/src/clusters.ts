import { serviceUrl } from '@online-store/contracts';

export type ServiceCluster = {
  name: string;
  upstream: string;
  apiPrefix: string;
  stripPrefix: string;
};

export function loadClusters(): ServiceCluster[] {
  return [
    {
      name: 'user',
      upstream: serviceUrl('USER_SERVICE_URL', 'http://127.0.0.1:5121'),
      apiPrefix: '/api/users',
      stripPrefix: '/users'
    },
    {
      name: 'product',
      upstream: serviceUrl('PRODUCT_SERVICE_URL', 'http://127.0.0.1:5225'),
      apiPrefix: '/api/products',
      stripPrefix: '/products'
    },
    {
      name: 'admin-product',
      upstream: serviceUrl('PRODUCT_SERVICE_URL', 'http://127.0.0.1:5225'),
      apiPrefix: '/api/admin/products',
      stripPrefix: '/admin/products'
    },
    {
      name: 'cart',
      upstream: serviceUrl('CART_SERVICE_URL', 'http://127.0.0.1:5078'),
      apiPrefix: '/api/carts',
      stripPrefix: '/carts'
    },
    {
      name: 'order',
      upstream: serviceUrl('ORDER_SERVICE_URL', 'http://127.0.0.1:5240'),
      apiPrefix: '/api/orders',
      stripPrefix: '/orders'
    },
    {
      name: 'payment',
      upstream: serviceUrl('PAYMENT_SERVICE_URL', 'http://127.0.0.1:5031'),
      apiPrefix: '/api/payments',
      stripPrefix: '/payments'
    },
    {
      name: 'inventory',
      upstream: serviceUrl('INVENTORY_SERVICE_URL', 'http://127.0.0.1:5212'),
      apiPrefix: '/api/inventory',
      stripPrefix: '/inventory'
    },
    {
      name: 'shipment',
      upstream: serviceUrl('SHIPPING_SERVICE_URL', 'http://127.0.0.1:5219'),
      apiPrefix: '/api/shipments',
      stripPrefix: '/shipments'
    },
    {
      name: 'history',
      upstream: serviceUrl('HISTORY_SERVICE_URL', 'http://127.0.0.1:5029'),
      apiPrefix: '/api/history',
      stripPrefix: '/history'
    },
    {
      name: 'email',
      upstream: serviceUrl('EMAIL_SERVICE_URL', 'http://127.0.0.1:5164'),
      apiPrefix: '/api/email',
      stripPrefix: '/email'
    }
  ];
}

export const ANONYMOUS_USER_PATHS = new Set([
  '/api/users/login',
  '/api/users/register',
  '/api/users/refresh',
  '/api/users/logout'
]);

export function resolveCluster(pathname: string, clusters = loadClusters()): ServiceCluster | null {
  const sorted = [...clusters].sort((a, b) => b.apiPrefix.length - a.apiPrefix.length);
  return sorted.find((c) => pathname === c.apiPrefix || pathname.startsWith(`${c.apiPrefix}/`)) ?? null;
}
