import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useDependencies } from '@/core/di/DependencyProvider';
import { useAppDispatch, useAppSelector } from '@/core/store/hooks';
import { colors, elevation, radii, screenGutter, sizes, spacing } from '@/shared/theme/tokens';
import { AppText } from '@/shared/ui/AppText';
import { Banner } from '@/shared/ui/Banner';
import { Button } from '@/shared/ui/Button';
import { Icon, type IconName } from '@/shared/ui/Icon';

import { selectIsSigningOut, selectSession } from '../state/authSelectors';
import { signOut } from '../state/authSlice';

const signedInSince = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function ProfileScreen() {
  const dispatch = useAppDispatch();
  const session = useAppSelector(selectSession);
  const isSigningOut = useAppSelector(selectIsSigningOut);
  const { config } = useDependencies();

  // The auth gate unmounts this screen as soon as the session ends, so a session is always present here.
  if (session === null) return null;
  const { user } = session;
  const dataSource = config.repository === 'mock' ? 'Demo data, kept in memory' : `API at ${config.apiBaseUrl ?? 'unknown'}`;

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant="largeTitle" accessibilityRole="header">
          Profile
        </AppText>

        <View style={styles.identity}>
          <View style={styles.avatar} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <AppText variant="title" tone="onAccent">
              {initialsOf(user.displayName)}
            </AppText>
          </View>
          <View style={styles.identityText}>
            <AppText variant="headline">{user.displayName}</AppText>
            <AppText variant="callout" tone="secondary">
              {user.email}
            </AppText>
          </View>
        </View>

        <View style={styles.card}>
          <InfoRow icon="mail-outline" label="Email" value={user.email} />
          <InfoRow icon="time-outline" label="Signed in at" value={signedInSince.format(new Date(session.startedAt))} />
          <InfoRow icon="server-outline" label="Task data" value={dataSource} last />
        </View>

        <Banner
          tone="info"
          title="Simulated sign-in"
          message="This training project uses a demo account. Nothing is sent to a real identity provider, and signing out clears your session from this device."
        />

        <Button label="Log out" icon="log-out-outline" variant="destructive" onPress={() => void dispatch(signOut())} loading={isSigningOut} />
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value, last = false }: { icon: IconName; label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.rowDivider]} accessible accessibilityLabel={`${label}: ${value}`}>
      <Icon name={icon} size={sizes.iconMd} color={colors.textTertiary} />
      <View style={styles.rowText}>
        <AppText variant="footnote" tone="tertiary">
          {label}
        </AppText>
        <AppText variant="callout">{value}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    gap: spacing.xxl,
    paddingHorizontal: screenGutter,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  avatar: {
    width: sizes.avatar,
    height: sizes.avatar,
    borderRadius: sizes.avatar / 2,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityText: {
    flex: 1,
    gap: spacing.xxs,
  },
  card: {
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    ...elevation.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  rowDivider: {
    borderBottomWidth: sizes.hairline,
    borderBottomColor: colors.separator,
  },
  rowText: {
    flex: 1,
    gap: spacing.xxs,
  },
});
