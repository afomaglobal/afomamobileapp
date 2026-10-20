import { ApiError } from '../../../../services/api/errors';
import type { MembershipPriceQuote } from '../../membership/types/sellerMembership';

export type ProductTierErrorCode =
  | 'LISTING_FEE_REQUIRED'
  | 'CATALOG_LIMIT'
  | 'MONTHLY_LISTING_CAP'
  | 'SUBSCRIPTION_REQUIRED'
  | 'SELLER_NOT_FOUND';

export interface ProductTierGateError {
  code: ProductTierErrorCode;
  message: string;
  statusCode?: number;
  listingFee?: MembershipPriceQuote & {
    required?: boolean;
    listingRenewalMonths?: number | null;
  };
  maxActiveProducts?: number;
  activeCount?: number;
  membershipTier?: string;
  monthlyNewListingAllowance?: number;
  listingCreditsUsedThisMonth?: number;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function readListingFee(value: unknown): ProductTierGateError['listingFee'] | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const amountCad = readNumber(record.amountCad);
  const amountLocal = readNumber(record.amountLocal);
  const currency = typeof record.currency === 'string' ? record.currency : undefined;

  if (amountCad == null || amountLocal == null || !currency) {
    return undefined;
  }

  return {
    amountCad,
    amountLocal,
    currency,
    conversionRate: readNumber(record.conversionRate) ?? 1,
    required: record.required === true,
    listingRenewalMonths: readNumber(record.listingRenewalMonths) ?? null,
  };
}

export function parseProductTierError(error: unknown): ProductTierGateError | null {
  if (!(error instanceof ApiError) || !error.data) {
    return null;
  }

  const code = error.data.code;
  if (typeof code !== 'string') {
    return null;
  }

  const message =
    typeof error.data.message === 'string' && error.data.message.length > 0
      ? error.data.message
      : error.message;

  return {
    code: code as ProductTierErrorCode,
    message,
    statusCode: error.statusCode,
    listingFee: readListingFee(error.data.listingFee),
    maxActiveProducts: readNumber(error.data.maxActiveProducts),
    activeCount: readNumber(error.data.activeCount),
    membershipTier:
      typeof error.data.membershipTier === 'string' ? error.data.membershipTier : undefined,
    monthlyNewListingAllowance: readNumber(error.data.monthlyNewListingAllowance),
    listingCreditsUsedThisMonth: readNumber(error.data.listingCreditsUsedThisMonth),
  };
}

export function getProductTierUserMessage(error: ProductTierGateError): string {
  switch (error.code) {
    case 'LISTING_FEE_REQUIRED':
      return error.message;
    case 'CATALOG_LIMIT':
      return error.message;
    case 'MONTHLY_LISTING_CAP':
      return error.message;
    case 'SUBSCRIPTION_REQUIRED':
      return 'Complete your membership payment before listing products.';
    default:
      return error.message;
  }
}
