import { apiClient } from '../../../services/api/client';
import { toApiError } from '../../../services/api/errors';
import type { RequestOtpResponse, VerifyOtpResponse } from '../types';

export async function requestOtp(email: string): Promise<RequestOtpResponse> {
  try {
    const response = await apiClient.post<RequestOtpResponse>('/users/login', { email: email.trim() });
    return response.data;
  } catch (error) {
    throw toApiError(error, 'Sign-in request failed');
  }
}

export async function verifyOtp(otp: string, otpToken: string): Promise<VerifyOtpResponse> {
  try {
    const response = await apiClient.post<VerifyOtpResponse & { token?: string }>('/users/verify-otp', {
      otp,
      otpToken,
    });
    const data = response.data;
    if (data.user && !data.user.accessToken) {
      const topLevelToken = typeof data.token === 'string' ? data.token.trim() : '';
      if (topLevelToken) {
        return { ...data, user: { ...data.user, accessToken: topLevelToken } };
      }
    }
    return data;
  } catch (error) {
    throw toApiError(error, 'Failed to verify OTP');
  }
}
