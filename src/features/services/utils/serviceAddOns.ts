import type { Product } from '../../../services/types/product';
import type { ServiceAddOn, ServiceBookingAddOnSnapshot } from '../types/service';

export function getActiveServiceAddOns(service: Product | null | undefined): ServiceAddOn[] {
  const list = service?.serviceDetails?.addOns;
  if (!Array.isArray(list)) {
    return [];
  }
  return list.filter((a) => a && a.active !== false && String(a.name || '').trim());
}

export function addOnPriceInCad(addonPrice: number | string | undefined, service: Product): number {
  const raw = parseFloat(String(addonPrice)) || 0;
  if (!raw) {
    return 0;
  }

  const currency = String(service?.currency || 'cad').toLowerCase();
  if (currency === 'cad') {
    return raw;
  }

  const cadBase = parseFloat(String(service?.finalPrice ?? service?.price ?? 0)) || 0;
  const listingBase = parseFloat(String(service?.currencyPrice));
  if (listingBase > 0 && cadBase > 0) {
    return parseFloat(((raw / listingBase) * cadBase).toFixed(2));
  }

  const rate = parseFloat(String(service?.currencyRate));
  if (rate > 0) {
    return parseFloat((raw * rate).toFixed(2));
  }

  return raw;
}

export function computeServiceBookingTotal(
  service: Product,
  selectedAddOnIds: string[] = [],
): {
  base: number;
  addOnTotal: number;
  total: number;
  selectedAddOns: ServiceBookingAddOnSnapshot[];
  addOnExtraMinutes: number;
} {
  const base = parseFloat(String(service?.finalPrice ?? service?.price ?? 0)) || 0;
  const active = getActiveServiceAddOns(service);
  const ids = new Set(selectedAddOnIds.map(String));
  let addOnTotal = 0;
  let addOnExtraMinutes = 0;
  const selectedAddOns: ServiceBookingAddOnSnapshot[] = [];

  for (const addon of active) {
    const id = addon._id ? String(addon._id) : '';
    if (!id || !ids.has(id)) {
      continue;
    }
    const priceCad = addOnPriceInCad(addon.price, service);
    addOnTotal += priceCad;
    addOnExtraMinutes += Math.max(0, parseInt(String(addon.extraMinutes), 10) || 0);
    selectedAddOns.push({
      _id: id,
      name: addon.name,
      price: priceCad,
      extraMinutes: addon.extraMinutes,
    });
  }

  return {
    base,
    addOnTotal,
    total: parseFloat((base + addOnTotal).toFixed(2)),
    selectedAddOns,
    addOnExtraMinutes,
  };
}

export interface ServiceAddOnDraft {
  clientId: string;
  _id?: string;
  name: string;
  description?: string;
  price: string;
  extraMinutes?: string;
  active: boolean;
}

export function createEmptyServiceAddOn(): ServiceAddOnDraft {
  return {
    clientId: `addon_${Date.now()}`,
    name: '',
    description: '',
    price: '',
    extraMinutes: '',
    active: true,
  };
}

export function normalizeServiceAddOnsFromApi(addOns: unknown): ServiceAddOnDraft[] {
  if (!Array.isArray(addOns)) {
    return [];
  }
  return addOns.map((a, index) => ({
    clientId: a._id ? String(a._id) : `addon_${index}`,
    _id: a._id,
    name: a.name || '',
    description: a.description || '',
    price: a.price != null && a.price !== '' ? String(a.price) : '',
    extraMinutes:
      a.extraMinutes != null && a.extraMinutes !== '' ? String(a.extraMinutes) : '',
    active: a.active !== false,
  }));
}

export function serializeServiceAddOnsForApi(addOns: ServiceAddOnDraft[]) {
  return (addOns || [])
    .filter((a) => String(a.name || '').trim())
    .map((a, sortOrder) => {
      const row: Record<string, unknown> = {
        name: String(a.name).trim(),
        description: String(a.description || '').trim(),
        price: parseFloat(a.price) || 0,
        extraMinutes: Math.max(0, parseInt(String(a.extraMinutes), 10) || 0),
        active: a.active !== false,
        sortOrder,
      };
      if (a._id) {
        row._id = a._id;
      }
      return row;
    });
}

export function computeEffectiveServiceDurationMinutes(
  service: Product,
  addOnExtraMinutes = 0,
): number {
  const base = parseInt(String(service?.serviceDetails?.durationMinutes), 10) || 60;
  const buffer = parseInt(String(service?.serviceDetails?.bufferMinutes), 10) || 0;
  return base + buffer + addOnExtraMinutes;
}
