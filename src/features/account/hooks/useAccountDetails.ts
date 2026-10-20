import { useCallback, useEffect, useState } from 'react';

import { ApiError, getErrorMessage } from '../../../services/api/errors';
import { getAccessToken, primeAccessTokenInMemory } from '../../../services/storage/secureStorage';
import { getUserProfile, updateUserProfile } from '../../../services/api/usersApi';
import { updateStoredProfile } from '../../../services/auth/authSession';
import type { AuthUser } from '../../auth/types';
import { useAuth } from '../../auth/hooks/useAuth';
import {
  accountDetailsFormFromCachedUser,
  accountDetailsFormFromProfile,
  buildUpdateUserProfileRequest,
  emptyAccountDetailsFormValues,
  hasAccountDetailsFormErrors,
  validateAccountDetailsForm,
  type AccountDetailsFormErrors,
  type AccountDetailsFormField,
  type AccountDetailsFormValues,
  mapUserProfileToStoredProfile,
} from '../utils/accountDetailsForm';
import type { CountryStateSelection } from '../../../utils/regionOptions';

const GATEWAY_RETRY_STATUSES = new Set([502, 503, 504]);
const GATEWAY_RETRY_DELAY_MS = 1200;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isGatewayError(err: unknown): boolean {
  return err instanceof ApiError && err.statusCode != null && GATEWAY_RETRY_STATUSES.has(err.statusCode);
}

function formatAccountLoadError(err: unknown): string {
  if (isGatewayError(err)) {
    return 'The server is temporarily busy. Tap Try again in a moment.';
  }
  return getErrorMessage(err, 'Failed to load account details');
}

export function useAccountDetails(authUserId?: string, cachedUser?: AuthUser | null) {
  const { refreshSession, user: authUser } = useAuth();
  const accessToken = authUser?.accessToken?.trim() || cachedUser?.accessToken?.trim() || '';
  const [values, setValues] = useState<AccountDetailsFormValues>(() =>
    cachedUser ? accountDetailsFormFromCachedUser(cachedUser) : emptyAccountDetailsFormValues(),
  );
  const [fieldErrors, setFieldErrors] = useState<AccountDetailsFormErrors>({});
  const [isLoading, setIsLoading] = useState(Boolean(authUserId && accessToken));
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    if (!authUserId) {
      setLoadError('User ID is missing.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError(null);
    setSaveSuccessMessage(null);

    const fetchProfile = async () => {
      const storedToken = (await getAccessToken())?.trim();
      if (storedToken) {
        primeAccessTokenInMemory(storedToken);
      }
      return getUserProfile(authUserId, storedToken ?? accessToken);
    };

    try {
      let profile: Awaited<ReturnType<typeof getUserProfile>>;
      try {
        profile = await fetchProfile();
      } catch (firstErr) {
        if (isGatewayError(firstErr)) {
          await sleep(GATEWAY_RETRY_DELAY_MS);
          profile = await fetchProfile();
        } else {
          throw firstErr;
        }
      }
      setValues(accountDetailsFormFromProfile(profile, cachedUser));
    } catch (err) {
      const isAuthFailure =
        err instanceof ApiError &&
        err.statusCode === 401 &&
        /token|authorized|sign in/i.test(err.message);

      if (isAuthFailure) {
        try {
          const storedToken = (await getAccessToken())?.trim();
          if (storedToken) {
            primeAccessTokenInMemory(storedToken);
          } else {
            await refreshSession();
          }
          await sleep(200);
          const profile = await fetchProfile();
          setValues(accountDetailsFormFromProfile(profile, cachedUser));
          return;
        } catch (retryErr) {
          setLoadError(formatAccountLoadError(retryErr));
        }
      } else {
        setLoadError(formatAccountLoadError(err));
      }

      if (cachedUser) {
        setValues(accountDetailsFormFromCachedUser(cachedUser));
      }
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, authUserId, cachedUser, refreshSession]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const updateField = useCallback((field: AccountDetailsFormField, nextValue: string) => {
    setValues((current) => ({ ...current, [field]: nextValue }));
    setFieldErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const next = { ...current };
      delete next[field];
      return next;
    });
    setSaveError(null);
    setSaveSuccessMessage(null);
  }, []);

  const updateCountryState = useCallback((selection: CountryStateSelection) => {
    setValues((current) => ({
      ...current,
      country: selection.country,
      state: selection.state,
      countryCode: selection.countryCode,
      stateCode: selection.stateCode,
    }));
    setFieldErrors((current) => {
      const next = { ...current };
      delete next.country;
      delete next.state;
      return next;
    });
    setSaveError(null);
    setSaveSuccessMessage(null);
  }, []);

  const saveProfile = useCallback(async () => {
    if (!authUserId || isSaving) {
      return false;
    }

    const validationErrors = validateAccountDetailsForm(values);
    setFieldErrors(validationErrors);
    setSaveError(null);
    setSaveSuccessMessage(null);

    if (hasAccountDetailsFormErrors(validationErrors)) {
      return false;
    }

    setIsSaving(true);

    try {
      const body = buildUpdateUserProfileRequest(values);
      const response = await updateUserProfile(authUserId, body);
      const storedProfile = mapUserProfileToStoredProfile(response, authUserId, cachedUser ?? undefined);

      await updateStoredProfile(storedProfile);
      await refreshSession();

      setValues(accountDetailsFormFromProfile(response, storedProfile));
      setSaveSuccessMessage('Account details updated successfully.');
      return true;
    } catch (err) {
      setSaveError(getErrorMessage(err, 'Failed to update account details'));
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [accessToken, authUserId, cachedUser, isSaving, refreshSession, values]);

  return {
    values,
    fieldErrors,
    isLoading,
    isSaving,
    loadError,
    saveError,
    saveSuccessMessage,
    updateField,
    updateCountryState,
    saveProfile,
    retry: loadProfile,
  };
}
