import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '../../../components/ui/AppText';
import { colors, radius, spacing } from '../../../design-system';
import {
  buildStorefrontPrivacyPolicyUrl,
  buildStorefrontTermsUrl,
} from '../../../utils/storefrontUrl';

export interface RegistrationAgreeFieldProps {
  value: boolean;
  onChange: (next: boolean) => void;
  error?: string;
  disabled?: boolean;
}

export function RegistrationAgreeField({
  value,
  onChange,
  error,
  disabled = false,
}: RegistrationAgreeFieldProps) {
  const openTerms = () => {
    void Linking.openURL(buildStorefrontTermsUrl());
  };

  const openPrivacy = () => {
    void Linking.openURL(buildStorefrontPrivacyPolicyUrl());
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: value }}
          disabled={disabled}
          onPress={() => onChange(!value)}
          style={({ pressed }) => [styles.checkboxHit, pressed && !disabled ? styles.pressed : null]}
        >
          <View style={[styles.checkbox, value && styles.checkboxSelected]}>
            {value ? (
              <AppText variant="caption" style={styles.checkmark}>
                ✓
              </AppText>
            ) : null}
          </View>
        </Pressable>
        <View style={styles.labelBlock}>
          <AppText variant="bodySmall" color="textSecondary" style={styles.labelLine}>
            I agree to the{' '}
            <AppText
              variant="bodySmall"
              color="primary"
              accessibilityRole="link"
              onPress={openTerms}
              style={styles.link}
            >
              Terms & Conditions
            </AppText>{' '}
            and{' '}
            <AppText
              variant="bodySmall"
              color="primary"
              accessibilityRole="link"
              onPress={openPrivacy}
              style={styles.link}
            >
              Privacy Policy
            </AppText>
          </AppText>
        </View>
      </View>
      {error ? (
        <AppText variant="caption" color="error">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.9,
  },
  checkboxHit: {
    paddingTop: 1,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radius.small,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    color: colors.textInverse,
    fontWeight: '700',
    lineHeight: 14,
  },
  labelBlock: {
    flex: 1,
  },
  labelLine: {
    lineHeight: 20,
  },
  link: {
    textDecorationLine: 'underline',
  },
});
