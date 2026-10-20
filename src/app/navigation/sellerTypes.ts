import type { NavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { SellerReviewListItem } from '../../features/seller/reviews/types/sellerReview';
import type { SellerCoupon } from '../../features/seller/coupons/types/sellerCoupon';
import type { SellerCommissionRecord } from '../../features/seller/earnings/types/sellerEarning';
import type { SellerOrderSummary } from '../../features/seller/orders/types/sellerOrder';
import type { SellerSetupSectionId } from '../../features/seller/types/sellerProfile';
import type {
  SellerBillingCycle,
  SellerMembershipTierId,
  MembershipWalletSnapshot,
} from '../../features/seller/membership/types/sellerMembership';

export type SellerStackParamList = {
  SellerAccount: undefined;
  SellerDashboard: undefined;
  SellerListingManagement: undefined;
  SellerProducts: { listingKind?: 'all' | 'products' | 'services' } | undefined;
  SellerProductType: { createMode?: 'all' | 'products' | 'services' } | undefined;
  SellerProductSubtype: undefined;
  SellerStandardProduct: { productId?: string } | undefined;
  SellerCustomizableProduct: { productId?: string } | undefined;
  SellerDownloadableProduct: { productId?: string } | undefined;
  SellerServiceProduct: { productId?: string } | undefined;
  SellerProductAiListing: {
    productType: import('../../features/admin/product-management/types/adminProductAiPrefill').AdminProductAiListingType;
  };
  SellerServiceTeamsSettings: undefined;
  SellerProductVariations: { productId: string };
  SellerOrders: undefined;
  SellerOrderDetail: {
    orderId: string;
    initialOrder?: SellerOrderSummary;
  };
  SellerShippingConfig: undefined;
  SellerCoupons: { notice?: string } | undefined;
  SellerCouponDetail: {
    couponId: string;
    initialCoupon?: SellerCoupon;
  };
  SellerCouponForm: {
    couponId?: string;
    initialCoupon?: SellerCoupon;
  };
  SellerAttributes: undefined;
  SellerEarnings: { payoutStatus?: 'Pending' | 'Paid' } | undefined;
  SellerEarningDetail: {
    commissionId: string;
    initialRecord?: SellerCommissionRecord;
  };
  SellerReviews: undefined;
  SellerReviewDetail: {
    reviewId: string;
    initialReview?: SellerReviewListItem;
  };
  SellerSetup: undefined;
  SellerPersonalInformation: undefined;
  SellerShopProfile: undefined;
  SellerShopSettings: undefined;
  SellerSetupSection: {
    section: SellerSetupSectionId;
  };
  SellerMembership: {
    sellerId: string;
  };
  SellerMembershipCheckout: {
    sellerId: string;
    membershipTier: SellerMembershipTierId;
    billingCycle: SellerBillingCycle;
    email?: string;
    mode?: 'registration' | 'activation' | 'upgrade' | 'renewal';
    walletBalanceCad?: number;
    wallet?: MembershipWalletSnapshot;
  };
  SellerCreatorWallet: {
    sellerId: string;
  };
};

/** Seller stack helpers — use for cross-screen navigation utils (accepts per-screen stack props). */
export type SellerNavigation = NavigationProp<SellerStackParamList>;
export type SellerStackNavigation = NativeStackNavigationProp<SellerStackParamList>;
