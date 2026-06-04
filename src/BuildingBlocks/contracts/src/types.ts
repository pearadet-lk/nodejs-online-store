export type CartItemDto = {
  productId: string;
  quantity: number;
  unitPrice: number;
};

export type ProductDto = {
  productId: string;
  name: string;
  description: string;
  price: number;
  isActive: boolean;
};

export type UserProfileDto = {
  userId: string;
  email: string;
  fullName: string;
  createdAt: string;
};

export type CartDto = {
  cartId: string;
  userId: string;
  items: CartItemDto[];
  updatedAt: string;
};

export type OrderDto = {
  orderId: string;
  userId: string;
  totalAmount: number;
  currency: string;
  status: string;
  createdAt: string;
};

export type PaymentDto = {
  paymentId: string;
  orderId: string;
  amount: number;
  currency: string;
  status: string;
  providerReference: string;
  createdAt: string;
};

export type InventoryItemDto = {
  productId: string;
  availableQty: number;
  reservedQty: number;
  updatedAt: string;
};

export type ShipmentDto = {
  shipmentId: string;
  orderId: string;
  carrier: string;
  trackingNumber: string;
  status: string;
  createdAt: string;
};

export type OrderHistoryEventDto = {
  historyId: string;
  orderId: string;
  userId: string;
  eventType: string;
  createdAt: string;
  notes: string;
};

export type EmailSendStatusDto = {
  notificationId: string;
  orderId: string;
  customerEmail: string;
  status: string;
  attemptCount: number;
  errorMessage: string | null;
  updatedAt: string;
};

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  user: UserProfileDto;
};

export const DEMO_USER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
export const DEMO_EMAIL = 'demo@example.com';
export const DEMO_PASSWORD = 'demo-password';
export const DEMO_FULL_NAME = 'Demo User';
