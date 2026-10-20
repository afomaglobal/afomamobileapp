import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { AppText } from '../../../components/ui/AppText';
import { colors, spacing } from '../../../design-system';
import type { ShoppingStackParamList } from '../../../app/navigation/types';
import { buildStorefrontPrivacyPolicyUrl } from '../../../utils/storefrontUrl';

type Props = NativeStackScreenProps<ShoppingStackParamList, 'PrivacyPolicy'>;

export function PrivacyPolicyScreen(_props: Props) {
  const insets = useSafeAreaInsets();
  const privacyUrl = buildStorefrontPrivacyPolicyUrl();

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <AppText variant="h3">Privacy Policy</AppText>
        <Pressable
          accessibilityRole="link"
          onPress={() => void Linking.openURL(privacyUrl)}
          hitSlop={8}
        >
          <AppText variant="bodySmall" color="primary">
            Open in browser
          </AppText>
        </Pressable>
      </View>
      <WebView
        source={{ uri: privacyUrl }}
        originWhitelist={['https://*']}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}
        style={styles.webView}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  webView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
