import type { MembershipPlansResponse, SellerMembershipSummary, SellerMembershipTierId } from '../types/sellerMembership';

export function formatMembershipMoney(amount: number, currency: string): string {
  const code = String(currency || 'CAD').toUpperCase();
  const value = Number(amount);
  if (!Number.isFinite(value)) {
    return `${code} 0.00`;
  }
  return `${code} ${value.toFixed(2)}`;
}

export function formatWalletBalance(
  wallet?: {
    balanceCad?: number;
    balanceLocal?: number;
    currency?: string;
  } | null,
): string {
  if (!wallet) {
    return formatMembershipMoney(0, 'CAD');
  }
  const currency = wallet.currency || 'CAD';
  const amount =
    wallet.balanceLocal != null ? wallet.balanceLocal : wallet.balanceCad || 0;
  return formatMembershipMoney(amount, currency);
}

export function formatWalletTransactionAmount(tx?: {
  amountCad?: number;
  amountLocal?: number;
  currency?: string;
} | null): string {
  if (!tx) {
    return formatMembershipMoney(0, 'CAD');
  }
  const currency = tx.currency || 'CAD';
  const amount = tx.amountLocal != null ? tx.amountLocal : tx.amountCad || 0;
  return formatMembershipMoney(amount, currency);
}

export function formatMilestoneCredit(
  amountCad: number,
  plans?: MembershipPlansResponse | null,
): string {
  if (!amountCad) return formatMembershipMoney(0, plans?.currency || 'CAD');
  const currency = plans?.currency || 'CAD';
  const tierWithRate = plans?.tiers?.[0]?.subscription?.monthly;
  const rate = tierWithRate?.conversionRate || 1;
  return formatMembershipMoney(amountCad * rate, currency);
}

export function formatCommissionPercent(value: number): string {
  const normalized = value <= 1 ? value * 100 : value;
  return `${normalized.toFixed(1).replace(/\.0$/, '')}%`;
}

export function getBillingCycleLabel(cycle: 'monthly' | 'annual' | 'none' | string): string {
  if (cycle === 'annual') return 'Annual';
  if (cycle === 'monthly') return 'Monthly';
  if (cycle === 'none') return 'None';
  return String(cycle || '—');
}

export function isFreeSellerMembershipPlan(options: {
  membershipTier?: string | null;
  billingCycle?: string | null;
  requiresPayment?: boolean;
}): boolean {
  if (options.membershipTier === 'test_drive') {
    return true;
  }

  return options.billingCycle === 'none' && options.requiresPayment !== true;
}

export function formatSubscriptionStatus(
  status: string | undefined,
  options: {
    requiresPayment?: boolean;
    isSubscriptionActive?: boolean;
    membershipTier?: string | null;
    billingCycle?: string | null;
  } = {},
): string {
  const { requiresPayment, isSubscriptionActive, membershipTier, billingCycle } = options;
  const normalized = String(status || 'none').toLowerCase();

  if (requiresPayment && !isSubscriptionActive) {
    return 'Payment required';
  }

  if (
    isFreeSellerMembershipPlan({ membershipTier, billingCycle, requiresPayment }) &&
    normalized !== 'past_due' &&
    normalized !== 'canceled'
  ) {
    return 'Active';
  }

  switch (normalized) {
    case 'active':
      return 'Active';
    case 'past_due':
      return 'Past due';
    case 'canceled':
      return 'Canceled';
    case 'trialing':
      return 'Trialing';
    case 'none':
      return 'Not active';
    default:
      return normalized.charAt(0).toUpperCase() + normalized.slice(1).replace(/_/g, ' ');
  }
}

export type SubscriptionStatusTone = 'success' | 'warning' | 'danger' | 'muted';

export function getSubscriptionStatusTone(
  status: string | undefined,
  options: {
    requiresPayment?: boolean;
    isSubscriptionActive?: boolean;
    membershipTier?: string | null;
    billingCycle?: string | null;
  } = {},
): SubscriptionStatusTone {
  const { requiresPayment, isSubscriptionActive, membershipTier, billingCycle } = options;
  const normalized = String(status || 'none').toLowerCase();

  if (requiresPayment && !isSubscriptionActive) return 'warning';
  if (
    isFreeSellerMembershipPlan({ membershipTier, billingCycle, requiresPayment }) &&
    normalized !== 'past_due' &&
    normalized !== 'canceled'
  ) {
    return 'success';
  }
  if (normalized === 'active' && isSubscriptionActive) return 'success';
  if (normalized === 'past_due') return 'danger';
  return 'muted';
}

export function tierRequiresPayment(tierId: string, billingCycle: string): boolean {
  if (tierId === 'test_drive') return false;
  return billingCycle === 'monthly' || billingCycle === 'annual';
}

const TIER_RANK: Record<SellerMembershipTierId, number> = {
  test_drive: 0,
  growth_creator: 1,
  pro_exporter: 2,
};

export function getDowngradeOptionsForTier(
  currentTierId: SellerMembershipTierId | string | undefined,
): SellerMembershipTierId[] {
  if (!currentTierId) return [];
  const currentRank = TIER_RANK[currentTierId as SellerMembershipTierId] ?? 0;
  return (Object.keys(TIER_RANK) as SellerMembershipTierId[]).filter(
    (id) => TIER_RANK[id] < currentRank,
  );
}

export function resolveDowngradeOptions(
  membership: Pick<SellerMembershipSummary, 'membershipTier' | 'downgradeOptions' | 'canCancel'> | null | undefined,
): SellerMembershipTierId[] {
  if (!membership?.canCancel) return [];
  if (membership.downgradeOptions?.length) {
    return membership.downgradeOptions;
  }
  return getDowngradeOptionsForTier(membership.membershipTier);
}

const TIER_LABELS: Record<string, string> = {
  test_drive: 'Test Drive (free)',
  growth_creator: 'Growth Creator',
  pro_exporter: 'Pro Exporter',
};

export function getMembershipTierLabel(
  tierId: string | null | undefined,
  plans?: MembershipPlansResponse | null,
): string {
  if (!tierId) return '—';
  const fromPlans = plans?.tiers?.find((tier) => tier.id === tierId)?.name;
  return fromPlans || TIER_LABELS[tierId] || tierId;
}

export function countListingsToDeactivate(
  activeProductCount: number,
  targetTierId: string,
  plans?: MembershipPlansResponse | null,
): number {
  const tier = plans?.tiers?.find((item) => item.id === targetTierId);
  const maxActive = tier?.maxActiveProducts;
  if (maxActive == null) return 0;
  return Math.max(0, activeProductCount - maxActive);
}

export function buildDowngradeConfirmMessage(
  targetTierId: string,
  membership: {
    nextBillingDate?: string | null;
    activeProductCount?: number;
  },
  plans?: MembershipPlansResponse | null,
): string {
  const tierLabel = getMembershipTierLabel(targetTierId, plans);
  const effectiveDate = membership.nextBillingDate
    ? new Date(membership.nextBillingDate).toLocaleDateString()
    : 'the end of your billing period';
  const listingsToDeactivate = countListingsToDeactivate(
    membership.activeProductCount ?? 0,
    targetTierId,
    plans,
  );

  let message = `Your current plan stays active until ${effectiveDate}, then moves to ${tierLabel}.`;

  if (listingsToDeactivate > 0) {
    message += `\n\n${listingsToDeactivate} listing${listingsToDeactivate === 1 ? '' : 's'} will be moved to Draft because ${tierLabel} allows fewer active listings.`;
  }

  if (targetTierId === 'growth_creator') {
    message += '\n\nGrowth Creator billing starts when your current plan ends.';
  }

  return message;
}
