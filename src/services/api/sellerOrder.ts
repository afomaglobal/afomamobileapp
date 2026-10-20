import type { Seller } from '../types/seller';

/** Mongo `$in` queries do not guarantee order — match the requested id sequence. */
export function orderSellersByIds(sellers: Seller[], ids: string[]): Seller[] {
  if (ids.length === 0 || sellers.length === 0) {
    return [];
  }

  const byId = new Map<string, Seller>();
  for (const seller of sellers) {
    const key = seller._id ? String(seller._id) : '';
    if (key) {
      byId.set(key, seller);
    }
  }

  const ordered: Seller[] = [];
  for (const id of ids) {
    const seller = byId.get(String(id));
    if (seller) {
      ordered.push(seller);
    }
  }

  return ordered;
}
