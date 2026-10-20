import { Platform, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { colors } from '../../../design-system';
import { buildLegalDocumentHtml } from '../utils/buildLegalDocumentHtml';

export interface LegalContentWebViewProps {
  htmlContent: string;
  /** Only enable when this WebView is nested inside another scroller. */
  nestedScrollEnabled?: boolean;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webView: {
    flex: 1,
    backgroundColor: colors.background,
  },
});

const sharedWebViewProps = {
  originWhitelist: ['*'] as string[],
  source: { html: '' },
  style: styles.webView,
  scrollEnabled: true,
  showsVerticalScrollIndicator: true,
};

export function LegalContentWebView({
  htmlContent,
  nestedScrollEnabled = false,
}: LegalContentWebViewProps) {
  const source = { html: buildLegalDocumentHtml(htmlContent) };

  return (
    <View style={styles.container}>
      {Platform.OS === 'android' ? (
        <WebView
          {...sharedWebViewProps}
          source={source}
          nestedScrollEnabled={nestedScrollEnabled}
          overScrollMode="never"
        />
      ) : (
        <WebView
          {...sharedWebViewProps}
          source={source}
          nestedScrollEnabled={nestedScrollEnabled}
          decelerationRate="normal"
        />
      )}
    </View>
  );
}
