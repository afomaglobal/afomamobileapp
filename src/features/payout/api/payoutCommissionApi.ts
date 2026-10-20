import { apiGet } from '../../../services/api/request';
import type { PayoutCommissionDetail } from '../types/payoutCommission';
import { isLikelyPayoutAccessToken } from '../utils/payoutAccessToken';

/**
 * Load commission details for get-paid deep links.
 * Email links use a signed payout access token; authenticated users may also load by commission id.
 */
export async function getPayoutCommission(
  accessTokenOrCommissionId: string,
): Promise<PayoutCommissionDetail> {
  if (isLikelyPayoutAccessToken(accessTokenOrCommissionId)) {
    return apiGet<PayoutCommissionDetail>(
      `/commission/payout-access?token=${encodeURIComponent(accessTokenOrCommissionId.trim())}`,
      undefined,
      'Failed to load payout details',
    );
  }

  return apiGet<PayoutCommissionDetail>(
    `/commission/${encodeURIComponent(accessTokenOrCommissionId)}`,
    undefined,
    'Failed to load payout details',
  );
}
