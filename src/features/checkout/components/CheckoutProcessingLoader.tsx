import { ActivityIndicator, Modal, StyleSheet, View } from 'react-native';

import { AppText } from '../../../components/ui/AppText';
import { colors, spacing } from '../../../design-system';
import type { CheckoutConfirmingVariant } from '../utils/checkoutLoadingCopy';

interface CheckoutProcessingLoaderProps {
  message?: string;
  /** Full-window scrim + spinner. Prefer `layer` on payment (avoids Modal blink after Safari/Chrome). */
  overlay?: boolean;
  /** @default 'layer' when overlay is true */
  presentation?: 'layer' | 'modal';
  visible?: boolean;
  /** @deprecated Variant only affects legacy full-screen layout. */
  variant?: CheckoutConfirmingVariant;
}

const DEFAULT_MESSAGE = 'Processing your payment';

export function CheckoutProcessingLoader({
  message,
  overlay = false,
  presentation = 'layer',
  visible = true,
}: CheckoutProcessingLoaderProps) {
  const label = message?.trim() || DEFAULT_MESSAGE;

  const body = (
    <View style={styles.loaderContent}>
      <ActivityIndicator size="large" color={colors.primary} />
      <AppText variant="bodyMedium" style={styles.overlayLabel}>
        {label}
      </AppText>
    </View>
  );

  if (overlay) {
    if (!visible) {
      return null;
    }

    if (presentation === 'layer') {
      return (
        <View
          style={styles.layerScrim}
          pointerEvents="auto"
          accessibilityRole="progressbar"
          accessibilityLabel={label}
        >
          {body}
        </View>
      );
    }

    return (
      <Modal
        visible
        transparent
        animationType="none"
        statusBarTranslucent
        presentationStyle="overFullScreen"
        onRequestClose={() => {}}
      >
        <View style={styles.modalScrim} pointerEvents="auto" accessibilityRole="progressbar">
          {body}
        </View>
      </Modal>
    );
  }

  return (
    <View style={styles.fullScreen} accessibilityRole="progressbar">
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  layerScrim: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    elevation: 1000,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: spacing.xl,
  },
  modalScrim: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: spacing.xl,
  },
  loaderContent: {
    alignItems: 'center',
    gap: spacing.md,
  },
  overlayLabel: {
    color: colors.textInverse,
    fontWeight: '600',
    textAlign: 'center',
  },
});
