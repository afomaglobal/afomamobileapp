import { useCallback, useEffect, useRef } from 'react';
import {
  useFocusEffect,
  useNavigation,
  type NavigationProp,
  type ParamListBase,
} from '@react-navigation/native';

import {
  leaveProtectedScreen,
  openAuthLogin,
  type AuthReturnTo,
} from '../utils/authNavigation';

type GateState = 'idle' | 'prompted' | 'awayAtLogin';

interface UseAuthGateRedirectOptions {
  /** True when the screen needs sign-in and the user doesn't have it. */
  needsLogin: boolean;
  /** Skip while auth/session state is still loading. */
  isLoading: boolean;
  returnTo?: AuthReturnTo;
}

/**
 * Opens the login modal when a protected screen gains focus without access — once.
 *
 * Previously every focus re-opened login, so pressing Back on the login screen refocused the
 * protected screen, which immediately pushed login again (the screen just "blinked"). Now, if the
 * user comes back from login still signed out, the protected screen leaves instead.
 */
export function useAuthGateRedirect({ needsLogin, isLoading, returnTo }: UseAuthGateRedirectOptions) {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const stateRef = useRef<GateState>('idle');

  // Login is presented as a modal on top, which blurs this screen.
  useEffect(
    () =>
      navigation.addListener('blur', () => {
        if (stateRef.current === 'prompted') {
          stateRef.current = 'awayAtLogin';
        }
      }),
    [navigation],
  );

  useFocusEffect(
    useCallback(() => {
      if (isLoading) {
        return;
      }

      if (!needsLogin) {
        stateRef.current = 'idle';
        return;
      }

      if (stateRef.current === 'awayAtLogin') {
        // Back from login without signing in — don't bounce them into login again.
        stateRef.current = 'idle';
        leaveProtectedScreen(navigation);
        return;
      }

      if (stateRef.current === 'prompted') {
        return;
      }

      stateRef.current = 'prompted';
      openAuthLogin(navigation, returnTo);
    }, [isLoading, navigation, needsLogin, returnTo]),
  );
}
