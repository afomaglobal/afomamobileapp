import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { SellerStackParamList } from '../../../app/navigation/sellerTypes';
import { authReturnTo } from '../../auth/utils/authNavigation';
import { useAuth } from '../../auth/hooks/useAuth';
import { useRequireSeller } from '../hooks/useRequireSeller';
import { ServiceTeamsSettingsScreen } from '../../services/screens/ServiceTeamsSettingsScreen';

type Props = NativeStackScreenProps<SellerStackParamList, 'SellerServiceTeamsSettings'>;

export function SellerServiceTeamsSettingsScreen(_props: Props) {
  const { isAuthorized, sellerId } = useRequireSeller(authReturnTo.sellerProducts());
  const { user } = useAuth();

  if (!isAuthorized) {
    return null;
  }

  return (
    <ServiceTeamsSettingsScreen
      sellerId={sellerId}
      accessToken={user?.accessToken}
      title="Teams & settings"
    />
  );
}
