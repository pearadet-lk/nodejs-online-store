import type { ProductDto } from './types.js';

export const DEFAULT_PRODUCT_COUNT = 100;

export function buildCatalogProducts(): ProductDto[] {
  const list: ProductDto[] = [
    {
      productId: '11111111-1111-1111-1111-111111111111',
      name: 'Starter Keyboard',
      description: 'Entry-level keyboard',
      price: 39.99,
      isActive: true
    },
    {
      productId: '22222222-2222-2222-2222-222222222222',
      name: 'Gaming Mouse',
      description: 'RGB gaming mouse',
      price: 59.99,
      isActive: true
    }
  ];

  const departments = ['Electronics', 'Home', 'Sports', 'Office', 'Garden', 'Books', 'Music', 'Toys'];
  const kinds = ['Adapter', 'Cable', 'Stand', 'Kit', 'Pack', 'Set', 'Mat', 'Lamp', 'Holder', 'Case'];

  for (let i = 3; i <= DEFAULT_PRODUCT_COUNT; i++) {
    const id = `00000000-0000-4000-8000-${i.toString(16).padStart(12, '0')}`;
    const dept = departments[(i - 3) % departments.length];
    const kind = kinds[(i * 7) % kinds.length];
    list.push({
      productId: id,
      name: `${dept} ${kind} ${i.toString().padStart(3, '0')}`,
      description: `Seeded demo product ${i} for catalog browsing and checkout testing.`,
      price: Math.round((4.99 + ((i * 37) % 450) * 0.15) * 100) / 100,
      isActive: true
    });
  }

  return list;
}
