import { ensureCurrencyCatalogLoaded } from '../../shipping/utils/currencyCatalog';

export interface CurrencyOption {
  value: string;
  label: string;
}

export async function fetchCurrencyOptions(): Promise<CurrencyOption[]> {
  return ensureCurrencyCatalogLoaded();
}

/** Returns CAD conversion rate for 1 unit of `currency`, or null if unavailable. */
export async function fetchCurrencyRateToCad(currency: string): Promise<number | null> {
  const normalized = currency.trim().toLowerCase();
  if (!normalized || normalized === 'cad') {
    return 1;
  }

  const response = await fetch(
    `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${normalized}.json`,
  );

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as Record<string, Record<string, number>>;
  const rate = data[normalized]?.cad;
  return typeof rate === 'number' && Number.isFinite(rate) ? rate : null;
}

export function convertToCadPrice(localPrice: string, rate: number): string {
  const value = parseFloat(localPrice);
  if (!Number.isFinite(value) || value <= 0 || !Number.isFinite(rate)) {
    return '';
  }

  return (value * rate).toFixed(2);
}
