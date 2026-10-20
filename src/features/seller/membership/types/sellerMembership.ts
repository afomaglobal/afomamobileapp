export type SellerMembershipTierId = 'test_drive' | 'growth_creator' | 'pro_exporter';

export type SellerBillingCycle = 'none' | 'monthly' | 'annual';

export type MembershipBillingProvider = 'stripe' | 'korapay' | 'wallet';

export interface WalletCreditBreakdown {
  walletAppliedCad: number;
  walletAppliedLocal: number;
  walletCurrency?: string;
  originalAmountCad: number;
  originalAmountLocal: number;
  amountDueCad: number;
  amountDueLocal: number;
  walletBalanceCad: number;
  walletBalanceLocal?: number;
  fullyCoveredByWallet: boolean;
}

export interface MembershipPriceQuote {
  amountCad: number;
  amountLocal: number;
  currency: string;
  conversionRate: number;
}

export interface MembershipPlanTier {
  id: SellerMembershipTierId;
  name: string;
  commissionRate: number;
  commissionPercent: number;
  maxActiveProducts: number | null;
  monthlyNewListingAllowance: number | null;
  listingRenewalMonths: number | null;
  listingFee: MembershipPriceQuote | null;
  subscription: {
    monthly: MembershipPriceQuote;
    annual: MembershipPriceQuote;
  };
  milestoneCredits: {
    sales5: number;
    sales10: number;
  };
  milestoneHeroSlot: boolean;
  features: {
    ai: string;
    visibility: string;
    managedListingsPerMonth: number;
  };
}

export interface MembershipPlansResponse {
  country: string | null;
  currency: string;
  provider: MembershipBillingProvider;
  tiers: MembershipPlanTier[];
}

export interface SellerMembershipSummary {
  membershipTier: SellerMembershipTierId;
  tierName: string;
  billingCycle: SellerBillingCycle;
  subscriptionStatus: string;
  subscriptionProvider: MembershipBillingProvider | null;
  nextBillingDate: string | null;
  verifiedBadge: boolean;
  commissionRate: number;
  commissionPercent: number;
  activeProductCount: number;
  maxActiveProducts: number | null;
  listingCreditsUsedThisMonth: number;
  monthlyNewListingAllowance: number | null;
  requiresPayment: boolean;
  isSubscriptionActive: boolean;
  status: string;
  wallet: {
    balanceCad: number;
    balanceLocal?: number;
    currency: string;
    conversionRate?: number;
  };
  features: MembershipPlanTier['features'];
  subscriptionCancelAtPeriodEnd?: boolean;
  pendingMembershipTier?: SellerMembershipTierId | null;
  pendingBillingCycle?: 'annual' | null;
  canScheduleAnnualBilling?: boolean;
  canCancelPendingBillingCycle?: boolean;
  upgradeOptions?: SellerMembershipTierId[];
  downgradeOptions?: SellerMembershipTierId[];
  canCancel?: boolean;
  canReactivate?: boolean;
  applyWalletToSubscription?: boolean;
}

export interface MembershipCheckoutResponse {
  requiresPayment: boolean;
  walletOnly?: boolean;
  completed?: boolean;
  provider?: MembershipBillingProvider;
  reference: string;
  clientSecret?: string;
  checkoutUrl?: string;
  subscriptionId?: string;
  paymentIntentId?: string;
  walletCredit?: WalletCreditBreakdown;
  membership?: SellerMembershipSummary;
  pricing?: MembershipPriceQuote & {
    tierId?: string;
    tierName?: string;
    billingCycle?: SellerBillingCycle;
    provider?: MembershipBillingProvider;
  };
}

export interface RegisterSellerMembershipInfo {
  tier: SellerMembershipTierId;
  billingCycle: SellerBillingCycle;
  status: string;
  requiresPayment: boolean;
}

export interface RegisterSellerResponse {
  Message?: string;
  sellerData?: {
    _id: string;
    email?: string;
    storeTitle?: string;
    status?: string;
  };
  membership?: RegisterSellerMembershipInfo;
}

export interface CreatorWalletTransaction {
  _id: string;
  type: 'credit' | 'debit' | 'redemption';
  amountCad: number;
  amountLocal: number;
  currency: string;
  source: string;
  description?: string;
  createdAt: string;
}

export interface CreatorWalletSummary {
  balanceCad: number;
  balanceLocal?: number;
  currency: string;
  conversionRate?: number;
  transactions: CreatorWalletTransaction[];
}

export interface MembershipWalletSnapshot {
  balanceCad: number;
  balanceLocal?: number;
  currency: string;
  conversionRate?: number;
}
