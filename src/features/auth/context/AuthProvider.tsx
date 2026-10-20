import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { registerSessionAccessTokenFallback } from '../../../services/api/client';
import { getAccessTokenSync, primeAccessTokenInMemory } from '../../../services/storage/secureStorage';
import { decodeJwtPayload, isJwtExpired } from '../../../services/auth/jwt';

import { requestOtp as requestOtpApi, verifyOtp as verifyOtpApi } from '../api/authApi';
import type { AuthContextValue, AuthState, StoredUserProfile } from '../types';
import { mergeGuestCartIntoAccount } from '../../cart/utils/mergeGuestCartIntoAccount';
import { resolveBackendUserDocumentId } from '../utils/resolveBackendUserDocumentId';
import {
  clearAuthenticatedSession,
  loadAuthenticatedSession,
  saveAuthenticatedSession,
  updateStoredProfile,
} from '../../../services/auth/authSession';
import { getStoredUserPricingInfo, clearStoredUserPricingInfo } from '../../../services/storage/userPricingStorage';
import { ApiError } from '../../../services/api/errors';

const initialState: AuthState = {
  user: null,
  role: null,
  fullAccess: false,
  isAuthenticated: false,
  isLoading: true,
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(initialState);

  useEffect(() => {
    registerSessionAccessTokenFallback(() => state.user?.accessToken ?? null);
    primeAccessTokenInMemory(state.user?.accessToken);
  }, [state.user?.accessToken]);

  const refreshSession = useCallback(async () => {
    setState((current) => ({ ...current, isLoading: true }));
    try {
      let session = await loadAuthenticatedSession();
      if (!session) {
        session = await loadAuthenticatedSession();
      }

      if (session) {
        primeAccessTokenInMemory(session.user.accessToken);
        setState({
          user: session.user,
          role: session.role,
          fullAccess: session.fullAccess,
          isAuthenticated: true,
          isLoading: false,
        });
        return;
      }

      let shouldClearSession = true;
      setState((current) => {
        const fallbackToken =
          getAccessTokenSync()?.trim() || current.user?.accessToken?.trim() || '';
        const payload = fallbackToken ? decodeJwtPayload(fallbackToken) : null;
        if (fallbackToken && current.user && payload && !isJwtExpired(payload)) {
          shouldClearSession = false;
          primeAccessTokenInMemory(fallbackToken);
          return {
            ...current,
            user: { ...current.user, accessToken: fallbackToken },
            isAuthenticated: true,
            isLoading: false,
          };
        }

        return {
          user: null,
          role: null,
          fullAccess: false,
          isAuthenticated: false,
          isLoading: false,
        };
      });

      if (shouldClearSession) {
        await clearAuthenticatedSession();
      }
    } catch {
      setState((current) => {
        const fallbackToken =
          getAccessTokenSync()?.trim() || current.user?.accessToken?.trim() || '';
        const payload = fallbackToken ? decodeJwtPayload(fallbackToken) : null;
        if (fallbackToken && current.user && payload && !isJwtExpired(payload)) {
          primeAccessTokenInMemory(fallbackToken);
          return { ...current, isLoading: false };
        }
        return {
          user: null,
          role: null,
          fullAccess: false,
          isAuthenticated: false,
          isLoading: false,
        };
      });
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const requestOtp = useCallback(async (email: string) => {
    const response = await requestOtpApi(email);
    if (!response.success || !response.otpToken) {
      throw new ApiError(response.error || response.message || 'Sign-in request failed');
    }
    return { otpToken: response.otpToken };
  }, []);

  const verifyOtp = useCallback(async ({ otp, otpToken }: { otp: string; otpToken: string }) => {
    const response = await verifyOtpApi(otp, otpToken);
    if (!response.success || !response.user) {
      throw new ApiError(response.message || 'Invalid OTP');
    }

    const session = await saveAuthenticatedSession(response.user);
    primeAccessTokenInMemory(session.user.accessToken);
    registerSessionAccessTokenFallback(() => session.user.accessToken);
    const userId = resolveBackendUserDocumentId(session.user);

    if (userId) {
      try {
        const userInfo = await getStoredUserPricingInfo();
        await mergeGuestCartIntoAccount(userId, userInfo);
      } catch {
        // Cart merge should not block successful sign-in.
      }
    }

    setState({
      user: session.user,
      role: session.role,
      fullAccess: session.fullAccess,
      isAuthenticated: true,
      isLoading: false,
    });
  }, []);

  const logout = useCallback(async () => {
    const { disconnectChatSocket } = await import('../../../services/socket/chatSocket');
    disconnectChatSocket();
    registerSessionAccessTokenFallback(() => null);
    primeAccessTokenInMemory(null);
    await clearAuthenticatedSession();
    await clearStoredUserPricingInfo();
    setState({
      user: null,
      role: null,
      fullAccess: false,
      isAuthenticated: false,
      isLoading: false,
    });
  }, []);

  const patchUserProfile = useCallback(async (patch: Partial<StoredUserProfile>) => {
    let nextStoredProfile: StoredUserProfile | null = null;

    setState((current) => {
      if (!current.user) {
        return current;
      }

      const { accessToken, ...storedProfile } = current.user;
      nextStoredProfile = { ...storedProfile, ...patch };

      return {
        ...current,
        user: {
          ...nextStoredProfile,
          accessToken,
        },
      };
    });

    if (nextStoredProfile) {
      await updateStoredProfile(nextStoredProfile);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      requestOtp,
      verifyOtp,
      logout,
      refreshSession,
      patchUserProfile,
    }),
    [state, requestOtp, verifyOtp, logout, refreshSession, patchUserProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
}
