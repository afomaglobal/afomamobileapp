import { apiGet, apiPost, apiRequest } from '../../../../services/api/request';
import type {
  CreatorWalletSummary,
  MembershipCheckoutResponse,
  MembershipPlansResponse,
  SellerMembershipSummary,
} from '../types/sellerMembership';
import type { SellerBillingCycle, SellerMembershipTierId } from '../types/sellerMembership';

export async function fetchMembershipPlans(country?: string): Promise<MembershipPlansResponse> {
  const query = country ? `?country=${encodeURIComponent(country)}` : '';
  return apiGet<MembershipPlansResponse>(
    `/seller-membership/plans${query}`,
    undefined,
    'Failed to load membership plans',
  );
}

export async function fetchSellerMembership(sellerId: string): Promise<SellerMembershipSummary> {
  return apiGet<SellerMembershipSummary>(
    `/seller-membership/seller/${sellerId}`,
    undefined,
    'Failed to load membership',
  );
}

export async function createMembershipCheckout(body: {
  sellerId: string;
  membershipTier: SellerMembershipTierId;
  billingCycle: SellerBillingCycle;
  redirectUrl?: string;
  applyWalletCredits?: boolean;
}): Promise<MembershipCheckoutResponse> {
  return apiPost<MembershipCheckoutResponse>(
    '/seller-membership/checkout',
    body,
    undefined,
    'Failed to start membership checkout',
  );
}

export async function verifyMembershipCheckout(reference: string): Promise<{
  membership: SellerMembershipSummary;
}> {
  return apiPost<{ membership: SellerMembershipSummary }>(
    '/seller-membership/verify',
    { reference },
    undefined,
    'Failed to verify membership payment',
  );
}

export async function createListingFeeCheckout(body: {
  sellerId: string;
  redirectUrl?: string;
}): Promise<MembershipCheckoutResponse & { listingFeePaymentRef?: string }> {
  return apiPost(
    '/seller-membership/listing-fee/checkout',
    body,
    undefined,
    'Failed to start listing fee checkout',
  );
}

export async function verifyListingFeeCheckout(reference: string): Promise<{
  listingFeePaymentRef: string;
}> {
  return apiPost(
    '/seller-membership/listing-fee/verify',
    { reference },
    undefined,
    'Failed to verify listing fee payment',
  );
}

export async function createMembershipPlanChangeCheckout(body: {
  sellerId: string;
  membershipTier: SellerMembershipTierId;
  billingCycle: SellerBillingCycle;
  redirectUrl?: string;
  applyWalletCredits?: boolean;
}): Promise<MembershipCheckoutResponse> {
  return apiPost<MembershipCheckoutResponse>(
    '/seller-membership/change-plan',
    body,
    undefined,
    'Failed to start plan upgrade checkout',
  );
}

export async function createMembershipRenewalCheckout(body: {
  sellerId: string;
  redirectUrl?: string;
  applyWalletCredits?: boolean;
}): Promise<MembershipCheckoutResponse> {
  return apiPost<MembershipCheckoutResponse>(
    '/seller-membership/renewal/checkout',
    body,
    undefined,
    'Failed to start membership renewal checkout',
  );
}

export async function updateWalletSubscriptionPreference(
  sellerId: string,
  applyWalletToSubscription: boolean,
): Promise<SellerMembershipSummary> {
  return apiRequest<SellerMembershipSummary>(
    {
      method: 'PATCH',
      url: `/seller-membership/seller/${sellerId}/wallet-preferences`,
      data: { applyWalletToSubscription },
    },
    'Failed to update wallet preference',
  );
}

export async function cancelSellerMembership(body: {
  sellerId: string;
  immediate?: boolean;
  targetTier?: SellerMembershipTierId;
}): Promise<SellerMembershipSummary> {
  return apiPost<SellerMembershipSummary>(
    '/seller-membership/cancel',
    body,
    undefined,
    'Failed to cancel membership',
  );
}

export async function reactivateSellerMembership(sellerId: string): Promise<SellerMembershipSummary> {
  return apiPost<SellerMembershipSummary>(
    '/seller-membership/reactivate',
    { sellerId },
    undefined,
    'Failed to reactivate membership',
  );
}

export async function scheduleBillingCycleChange(
  sellerId: string,
  billingCycle: SellerBillingCycle = 'annual',
): Promise<SellerMembershipSummary> {
  return apiPost<SellerMembershipSummary>(
    '/seller-membership/schedule-billing-cycle',
    { sellerId, billingCycle },
    undefined,
    'Failed to schedule billing change',
  );
}

export async function cancelPendingBillingCycleChange(
  sellerId: string,
): Promise<SellerMembershipSummary> {
  return apiPost<SellerMembershipSummary>(
    '/seller-membership/cancel-billing-cycle-change',
    { sellerId },
    undefined,
    'Failed to cancel billing change',
  );
}

export async function fetchCreatorWallet(sellerId: string): Promise<CreatorWalletSummary> {
  return apiGet<CreatorWalletSummary>(
    `/seller-membership/wallet/${sellerId}`,
    undefined,
    'Failed to load My Wallet',
  );
}
