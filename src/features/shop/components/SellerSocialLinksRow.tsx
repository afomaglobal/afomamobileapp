import { Linking, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';

import { colors, radius } from '../../../design-system';
import type { SellerSocialLink, SellerSocialPlatform } from '../utils/sellerSocialLinks';

const ICON_SIZE = 14;
const BUTTON_SIZE = 32;

const PLATFORM_STYLE: Record<
  SellerSocialPlatform,
  { backgroundColor: string; icon: keyof typeof FontAwesome6.glyphMap; brand?: boolean }
> = {
  facebook: {
    backgroundColor: '#1877F2',
    icon: 'facebook-f',
    brand: true,
  },
  tiktok: {
    backgroundColor: '#010101',
    icon: 'tiktok',
    brand: true,
  },
  instagram: {
    backgroundColor: '#E4405F',
    icon: 'instagram',
    brand: true,
  },
};

const PLATFORM_LABEL: Record<SellerSocialPlatform, string> = {
  facebook: 'Facebook',
  tiktok: 'TikTok',
  instagram: 'Instagram',
};

export interface SellerSocialLinksRowProps {
  links: SellerSocialLink[];
  style?: StyleProp<ViewStyle>;
}

async function openSocialLink(url: string): Promise<void> {
  const canOpen = await Linking.canOpenURL(url);
  if (canOpen) {
    await Linking.openURL(url);
  }
}

export function SellerSocialLinksRow({ links, style }: SellerSocialLinksRowProps) {
  if (links.length === 0) {
    return null;
  }

  return (
    <View style={[styles.row, style]} accessibilityRole="toolbar" accessibilityLabel="Shop social links">
      {links.map((link) => {
        const config = PLATFORM_STYLE[link.platform];
        return (
          <Pressable
            key={`${link.platform}-${link.url}`}
            accessibilityRole="link"
            accessibilityLabel={`Open ${PLATFORM_LABEL[link.platform]} profile`}
            onPress={() => {
              void openSocialLink(link.url);
            }}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: config.backgroundColor },
              pressed && styles.pressed,
            ]}
          >
            <FontAwesome6
              name={config.icon}
              size={ICON_SIZE}
              color={colors.textInverse}
              brand={config.brand}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.88,
  },
});
