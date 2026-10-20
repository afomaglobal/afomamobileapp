import type { SellerMembershipSummary } from '../../membership/types/sellerMembership';

/** Paid Growth / Pro with an active subscription — same tiers that include full AI listing on web. */
export function canOfferSellerAiListing(
  membership: Pick<SellerMembershipSummary, 'membershipTier' | 'isSubscriptionActive'> | null | undefined,
): boolean {
  if (!membership?.isSubscriptionActive) {
    return false;
  }

  return membership.membershipTier === 'growth_creator' || membership.membershipTier === 'pro_exporter';
}
