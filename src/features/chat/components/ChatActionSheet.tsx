import { type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { BottomSheet } from '../../../components/ui/BottomSheet';
import { AppText } from '../../../components/ui/AppText';
import { colors, radius, spacing } from '../../../design-system';

export interface ChatActionSheetOption {
  key: string;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  destructive?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

/**
 * A confirmation step. Rendered very differently from the menu (icon, explicit consequence,
 * "Yes, …" button) so it never looks like the menu just reopened.
 */
export interface ChatActionSheetConfirm {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
}

export interface ChatActionSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  options?: ChatActionSheetOption[];
  /** Extra content above the options (e.g. a reactions row). */
  header?: ReactNode;
  busy?: boolean;
  /** Label of the closing button (defaults to "Cancel"). */
  cancelLabel?: string;
  /** When set, the sheet shows this confirmation instead of the options list. */
  confirm?: ChatActionSheetConfirm | null;
}

function ConfirmBody({
  confirm,
  busy,
  onClose,
}: {
  confirm: ChatActionSheetConfirm;
  busy: boolean;
  onClose: () => void;
}) {
  const destructive = confirm.destructive ?? true;
  return (
    <View style={styles.confirm}>
      <View style={[styles.confirmIcon, destructive && styles.confirmIconDanger]}>
        <Ionicons
          name={confirm.icon}
          size={28}
          color={destructive ? colors.error : colors.primary}
        />
      </View>
      <AppText variant="h3" style={styles.confirmTitle}>
        {confirm.title}
      </AppText>
      <AppText variant="bodySmall" color="textSecondary" style={styles.confirmMessage}>
        {confirm.message}
      </AppText>

      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={confirm.onConfirm}
        style={({ pressed }) => [
          styles.confirmButton,
          destructive ? styles.confirmButtonDanger : styles.confirmButtonPrimary,
          (pressed || busy) && styles.confirmButtonPressed,
        ]}
      >
        {busy ? (
          <ActivityIndicator color={colors.textInverse} />
        ) : (
          <AppText variant="bodyMedium" style={styles.confirmButtonLabel}>
            {confirm.confirmLabel}
          </AppText>
        )}
      </Pressable>

      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={onClose}
        style={({ pressed }) => [styles.cancel, styles.confirmCancel, pressed && styles.optionPressed]}
      >
        <AppText variant="bodyMedium" color="textSecondary">
          {confirm.cancelLabel ?? 'Cancel'}
        </AppText>
      </Pressable>
    </View>
  );
}

/**
 * In-app action sheet for chat menus. Replaces `Alert.alert` menus, which on Android show at most
 * three buttons (the rest — including Cancel — silently disappear and the dialog can't be
 * dismissed) and on iOS can hang when one alert opens another.
 */
export function ChatActionSheet({
  visible,
  onClose,
  title,
  message,
  options = [],
  header,
  busy = false,
  cancelLabel = 'Cancel',
  confirm = null,
}: ChatActionSheetProps) {
  if (confirm) {
    return (
      <BottomSheet
        visible={visible}
        onClose={busy ? () => undefined : onClose}
        dismissOnBackdropPress={!busy}
        scrollable={false}
      >
        <View style={styles.body}>
          <ConfirmBody confirm={confirm} busy={busy} onClose={onClose} />
        </View>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={busy ? () => undefined : onClose}
      dismissOnBackdropPress={!busy}
      title={title}
      scrollable={false}
    >
      <View style={styles.body}>
        {message ? (
          <AppText variant="bodySmall" color="textSecondary" style={styles.message}>
            {message}
          </AppText>
        ) : null}

        {header}

        {busy ? (
          <View style={styles.busy}>
            <ActivityIndicator color={colors.primary} />
            <AppText variant="bodySmall" color="textSecondary">
              Please wait…
            </AppText>
          </View>
        ) : (
          <View style={styles.options}>
            {options.map((option) => (
              <Pressable
                key={option.key}
                accessibilityRole="button"
                disabled={option.disabled}
                onPress={option.onPress}
                style={({ pressed }) => [
                  styles.option,
                  pressed && styles.optionPressed,
                  option.disabled && styles.optionDisabled,
                ]}
              >
                {option.icon ? (
                  <Ionicons
                    name={option.icon}
                    size={20}
                    color={option.destructive ? colors.error : colors.textPrimary}
                  />
                ) : null}
                <AppText
                  variant="body"
                  style={[styles.optionLabel, option.destructive && styles.destructive]}
                >
                  {option.label}
                </AppText>
              </Pressable>
            ))}

            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => [styles.cancel, pressed && styles.optionPressed]}
            >
              <AppText variant="bodyMedium" color="textSecondary">
                {cancelLabel}
              </AppText>
            </Pressable>
          </View>
        )}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  message: {
    lineHeight: 20,
  },
  options: {
    gap: spacing.xs,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.medium,
  },
  optionPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  optionDisabled: {
    opacity: 0.45,
  },
  optionLabel: {
    color: colors.textPrimary,
    flex: 1,
  },
  destructive: {
    color: colors.error,
  },
  cancel: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
    borderRadius: radius.medium,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  confirm: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  confirmIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    marginBottom: spacing.xs,
  },
  confirmIconDanger: {
    backgroundColor: colors.errorBg,
  },
  confirmTitle: {
    color: colors.textPrimary,
    fontWeight: '700',
    textAlign: 'center',
  },
  confirmMessage: {
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  confirmButton: {
    alignSelf: 'stretch',
    minHeight: 48,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  confirmButtonDanger: {
    backgroundColor: colors.error,
  },
  confirmButtonPrimary: {
    backgroundColor: colors.primary,
  },
  confirmButtonPressed: {
    opacity: 0.85,
  },
  confirmButtonLabel: {
    color: colors.textInverse,
    fontWeight: '700',
  },
  confirmCancel: {
    alignSelf: 'stretch',
    borderRadius: radius.pill,
    marginTop: 0,
  },
  busy: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
});
