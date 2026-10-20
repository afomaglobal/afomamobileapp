import { Alert, Platform, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';

export async function copyProductLink(url: string): Promise<void> {
  await Clipboard.setStringAsync(url);
}

export async function shareProductLink(params: {
  title: string;
  url: string;
}): Promise<void> {
  const { title, url } = params;

  await Share.share(
    Platform.select({
      ios: { message: title, url, title },
      default: { message: `${title}\n${url}`, title },
    })!,
  );
}

function promptStorefrontLinkShare(params: {
  alertTitle: string;
  title: string;
  url: string;
  copiedMessage: string;
}): void {
  const { alertTitle, title, url, copiedMessage } = params;

  Alert.alert(alertTitle, title, [
    {
      text: 'Copy link',
      onPress: () => {
        void copyProductLink(url).then(() => {
          Alert.alert('Link copied', copiedMessage);
        });
      },
    },
    {
      text: 'Share',
      onPress: () => {
        void shareProductLink({ title, url });
      },
    },
    { text: 'Cancel', style: 'cancel' },
  ]);
}

export function promptProductShare(params: { title: string; url: string }): void {
  promptStorefrontLinkShare({
    alertTitle: 'Share product',
    title: params.title,
    url: params.url,
    copiedMessage: 'Product link copied to clipboard.',
  });
}

export function promptShopShare(params: { title: string; url: string }): void {
  promptStorefrontLinkShare({
    alertTitle: 'Share shop',
    title: params.title,
    url: params.url,
    copiedMessage: 'Shop link copied to clipboard.',
  });
}
