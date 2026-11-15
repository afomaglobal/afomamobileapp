import { apiGet } from '../../../../services/api/request';
import type { CreatorWalletSummary, SellerMembershipSummary } from '../types/sellerMembership';

/*
 * Read-only membership API for the mobile apps. Plans, subscriptions and listing fees are
 * chosen and paid for on the website only (App Store 3.1.1 / Play payments policy), so the
 * checkout, plan-change and billing endpoints are intentionally not wrapped here.
 */

export async function fetchSellerMembership(sellerId: string): Promise<SellerMembershipSummary> {
  return apiGet<SellerMembershipSummary>(
    `/seller-membership/seller/${sellerId}`,
    undefined,
    'Failed to load membership',
  );
}

export async function fetchCreatorWallet(sellerId: string): Promise<CreatorWalletSummary> {
  return apiGet<CreatorWalletSummary>(
    `/seller-membership/wallet/${sellerId}`,
    undefined,
    'Failed to load My Wallet',
  );
}
