import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '../../../components/ui/AppButton';
import { AppCard } from '../../../components/ui/AppCard';
import { AppInput } from '../../../components/ui/AppInput';
import { AppText } from '../../../components/ui/AppText';
import { ErrorState } from '../../../components/ecommerce/ErrorState';
import { colors, spacing } from '../../../design-system';
import { getErrorMessage } from '../../../services/api/errors';
import {
  createServiceStaff,
  deleteServiceStaff,
  fetchSellerAvailability,
  fetchSellerStaffManage,
  updateSellerAvailability,
  updateServiceStaff,
  type ServiceAvailabilityRecord,
} from '../api/serviceBookingApi';
import { WeeklyHoursEditor, type WeeklyHourRow } from '../components/WeeklyHoursEditor';
import { createDefaultWeeklyHours } from '../utils/serviceBookingConstants';
import type { ServiceStaffMember } from '../types/service';

export interface ServiceTeamsSettingsScreenProps {
  sellerId: string | undefined;
  accessToken: string | undefined;
  title?: string;
}

export function ServiceTeamsSettingsScreen({
  sellerId,
  accessToken,
  title = 'Teams & settings',
}: ServiceTeamsSettingsScreenProps) {
  const insets = useSafeAreaInsets();
  const [availability, setAvailability] = useState<ServiceAvailabilityRecord | null>(null);
  const [weeklyHours, setWeeklyHours] = useState<WeeklyHourRow[]>(createDefaultWeeklyHours());
  const [staff, setStaff] = useState<ServiceStaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingHours, setSavingHours] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffTitle, setNewStaffTitle] = useState('');

  const load = useCallback(async () => {
    if (!sellerId || !accessToken) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [avail, team] = await Promise.all([
        fetchSellerAvailability(sellerId, accessToken),
        fetchSellerStaffManage(sellerId, accessToken),
      ]);
      setAvailability(avail);
      setWeeklyHours(
        avail?.weeklyHours?.length
          ? (avail.weeklyHours as WeeklyHourRow[])
          : createDefaultWeeklyHours(),
      );
      setStaff(team.staff ?? []);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load service settings'));
    } finally {
      setLoading(false);
    }
  }, [accessToken, sellerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveHours = async () => {
    if (!sellerId || !accessToken) {
      return;
    }
    setSavingHours(true);
    try {
      const updated = await updateSellerAvailability(
        sellerId,
        {
          timezone: availability?.timezone || 'UTC',
          weeklyHours,
          blockedDates: availability?.blockedDates || [],
          slotIntervalMinutes: availability?.slotIntervalMinutes || 30,
          minLeadTimeHours: availability?.minLeadTimeHours ?? 2,
          maxAdvanceDays: availability?.maxAdvanceDays ?? 60,
        },
        accessToken,
      );
      setAvailability(updated);
      Alert.alert('Saved', 'Shop appointment hours updated.');
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err, 'Could not save hours'));
    } finally {
      setSavingHours(false);
    }
  };

  const addStaff = async () => {
    if (!sellerId || !accessToken || !newStaffName.trim()) {
      return;
    }
    try {
      await createServiceStaff(
        sellerId,
        {
          displayName: newStaffName.trim(),
          title: newStaffTitle.trim(),
          scheduleMode: 'inherit',
          active: true,
        },
        accessToken,
      );
      setNewStaffName('');
      setNewStaffTitle('');
      await load();
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err, 'Could not add team member'));
    }
  };

  const toggleStaffActive = async (member: ServiceStaffMember) => {
    if (!sellerId || !accessToken || !member._id) {
      return;
    }
    try {
      await updateServiceStaff(
        sellerId,
        String(member._id),
        { active: member.active === false },
        accessToken,
      );
      await load();
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err, 'Could not update team member'));
    }
  };

  const removeStaff = (member: ServiceStaffMember) => {
    if (!sellerId || !accessToken || !member._id) {
      return;
    }
    Alert.alert('Remove team member', `Remove ${member.displayName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          void deleteServiceStaff(sellerId, String(member._id), accessToken)
            .then(() => load())
            .catch((err) =>
              Alert.alert('Error', getErrorMessage(err, 'Could not remove team member')),
            );
        },
      },
    ]);
  };

  if (!sellerId || !accessToken) {
    const message = !accessToken
      ? 'Sign in again to manage service settings.'
      : 'Your seller shop is not set up yet. Finish seller onboarding to manage teams and hours.';

    return (
      <View style={styles.centered}>
        <AppText variant="body" color="textMuted">
          {message}
        </AppText>
      </View>
    );
  }

  if (loading && !availability) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error && !availability) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ErrorState message={error} onAction={() => void load()} />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        { paddingTop: spacing.md, paddingBottom: insets.bottom + spacing.xl },
      ]}
    >
      <AppText variant="h2">{title}</AppText>
      <AppText variant="bodySmall" color="textMuted">
        Shop hours and team members for bookable services.
      </AppText>

      <AppCard style={styles.card}>
        <View style={styles.sectionHeader}>
          <AppText variant="h3">Shop hours</AppText>
          <AppText variant="bodySmall" color="textMuted">
            Default availability for bookable services. Team members can inherit these hours or set
            their own on each service.
          </AppText>
        </View>
        <WeeklyHoursEditor weeklyHours={weeklyHours} onChange={setWeeklyHours} />
        <AppButton label="Save hours" loading={savingHours} onPress={() => void saveHours()} />
      </AppCard>

      <AppCard style={styles.card}>
        <AppText variant="h3">Service team</AppText>
        {staff.map((member) => (
          <View key={member._id} style={styles.staffRow}>
            <View style={styles.staffInfo}>
              <AppText variant="bodyMedium">{member.displayName}</AppText>
              {member.title ? (
                <AppText variant="caption" color="textMuted">
                  {member.title}
                </AppText>
              ) : null}
            </View>
            <Switch
              value={member.active !== false}
              onValueChange={() => void toggleStaffActive(member)}
            />
            <AppButton
              label="Remove"
              variant="ghost"
              onPress={() => removeStaff(member)}
            />
          </View>
        ))}
        <AppInput
          label="Display name"
          value={newStaffName}
          onChangeText={setNewStaffName}
          placeholder="Team member name"
        />
        <AppInput
          label="Role (optional)"
          value={newStaffTitle}
          onChangeText={setNewStaffTitle}
          placeholder="e.g. Senior stylist"
        />
        <AppButton label="Add team member" variant="secondary" onPress={() => void addStaff()} />
      </AppCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  card: {
    gap: spacing.md,
  },
  sectionHeader: {
    gap: spacing.xs,
  },
  staffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  staffInfo: {
    flex: 1,
  },
});
