import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Badge, HubCallout, HubMetric, HubMetrics, QueryRetryCard, SectionCard } from '@/components/product';
import { getTextInputProps, getTextInputStyle } from '@/components/product';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, lineHeight, palette, spacing } from '@/constants/tokens';
import { ApiError } from '@/src/api/api-client';
import { alertAction, confirmAction } from '@/src/lib/app-dialog';
import { invalidateTenantScopedQueries } from '@/src/lib/tenant-query';
import {
  useInviteTeamMember,
  useRemoveTeamMember,
  useRevokeTeamInvite,
  useTeamMembers,
} from '@/src/hooks/use-account-settings';
import { useSessionStore } from '@/src/stores/session-store';
import type { TeamMember } from '@/src/types/domain';

export default function SettingsTeamScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const [inviteEmail, setInviteEmail] = useState('');

  const members = useTeamMembers();
  const inviteMutation = useInviteTeamMember();
  const removeMutation = useRemoveTeamMember();
  const revokeMutation = useRevokeTeamInvite();
  const membershipRole = useSessionStore((s) => s.membershipRole);
  const isLocalDemoWorkspace = useSessionStore((s) => s.isLocalDemoWorkspace);
  const isPublicDemo = useSessionStore((s) => s.demoWorkspaceKind === 'public');
  const canManageMembers = !isPublicDemo && (membershipRole === 'OWNER' || isLocalDemoWorkspace);

  const memberList = members.data ?? [];
  const activeCount = useMemo(
    () => memberList.filter((member) => member.status === 'ACTIVE').length,
    [memberList],
  );
  const pendingCount = useMemo(
    () => memberList.filter((member) => member.status === 'INVITED').length,
    [memberList],
  );

  if (members.isPending) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator accessibilityLabel={t('teamSettingsScreen.loadingA11y')} color={theme.primary} />
      </View>
    );
  }

  if (members.error) {
    const message = members.error.message || t('teamSettingsScreen.emptyDataFallback');
    return (
      <PlaceholderScreen
        title={t('teamSettingsScreen.loadFailedTitle')}
        description={t('teamSettingsScreen.retryDesc')}>
        <QueryRetryCard
          message={message}
          onRetry={() => void invalidateTenantScopedQueries(queryClient)}
        />
      </PlaceholderScreen>
    );
  }

  const onInvite = () => {
    if (!canManageMembers) return;
    const email = inviteEmail.trim();
    if (!email || inviteMutation.isPending) return;
    inviteMutation.mutate(
      { email },
      {
        onSuccess: (member) => {
          setInviteEmail('');
          if (member.inviteKind === 'EMAIL') {
            void alertAction(
              member.emailSent === false
                ? t('teamSettingsScreen.inviteEmailFailedTitle')
                : t('teamSettingsScreen.inviteEmailSuccessTitle'),
              member.emailSent === false
                ? t('teamSettingsScreen.inviteEmailFailedBody')
                : t('teamSettingsScreen.inviteEmailSuccessBody'),
            );
            return;
          }
          void alertAction(
            t('teamSettingsScreen.inviteInAppTitle'),
            t('teamSettingsScreen.inviteInAppBody'),
          );
        },
        onError: (error) => {
          void alertAction(
            t('teamSettingsScreen.inviteFailedTitle'),
            inviteErrorMessage(error, t),
          );
        },
      },
    );
  };

  const onRemove = (member: TeamMember) => {
    if (!canManageMembers || removeMutation.isPending || revokeMutation.isPending) return;
    void confirmAction({
      title: t('teamSettingsScreen.removeConfirmTitle'),
      message: t('teamSettingsScreen.removeConfirmMessage', {
        name: member.displayName || member.email,
      }),
      confirmLabel:
        member.status === 'INVITED'
          ? t('teamSettingsScreen.revokeInvite')
          : t('teamSettingsScreen.removeMember'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    }).then((confirmed) => {
      if (!confirmed) return;
      const mutation = member.inviteKind === 'EMAIL' ? revokeMutation : removeMutation;
      mutation.mutate(member.id, {
        onError: (error) => {
          void alertAction(
            t('teamSettingsScreen.removeFailedTitle'),
            removeErrorMessage(error, t),
          );
        },
      });
    });
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView
        testID="screen-team-settings"
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>
        <Text style={[styles.pageLead, { color: theme.mutedForeground }]}>{t('teamSettingsScreen.description')}</Text>

        {isPublicDemo ? (
          <HubCallout
            title={t('publicDemo.readOnlyTitle')}
            body={t('publicDemo.teamReadOnly')}
          />
        ) : null}

        <HubMetrics>
          <HubMetric value={String(activeCount)} label={t('teamSettingsScreen.metricMembers')} />
          <HubMetric value={String(pendingCount)} label={t('teamSettingsScreen.metricPending')} accent />
        </HubMetrics>

      <SectionCard title={t('teamSettingsScreen.membersTitle')} subtitle={t('teamSettingsScreen.membersSubtitle')}>
        {memberList.length === 0 ? (
          <Text style={[styles.lead, { color: theme.mutedForeground }]}>{t('teamSettingsScreen.membersEmpty')}</Text>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {memberList.map((member) => (
              <View
                key={`${member.inviteKind ?? 'MEMBER'}-${member.id}`}
                style={[styles.memberRow, { borderColor: theme.border, backgroundColor: theme.card }]}>
                <View style={styles.memberHeader}>
                  <View style={{ flex: 1, gap: spacing.xs }}>
                    <Text style={[styles.memberName, { color: theme.foreground }]}>
                      {member.displayName || member.email}
                    </Text>
                    <Text style={[styles.lead, { color: theme.mutedForeground }]}>
                      {t('teamSettingsScreen.memberMeta', {
                        email: member.email,
                        role: t(`teamSettingsScreen.memberRoles.${member.role}`),
                      })}
                    </Text>
                  </View>
                  <Badge
                    tone={member.status === 'INVITED' ? 'warning' : 'mint'}
                    label={
                      member.status === 'INVITED'
                        ? t('teamSettingsScreen.badgePending')
                        : t('teamSettingsScreen.badgeActive')
                    }
                  />
                </View>
                {canManageMembers && member.role !== 'OWNER' ? (
                  <View style={[styles.managementPanel, { borderColor: theme.border }]}>
                    <Pressable
                      accessibilityRole="button"
                      disabled={removeMutation.isPending}
                      onPress={() => onRemove(member)}
                      style={[styles.secondary, { borderColor: theme.border }]}>
                      <Text style={[styles.secondaryLabel, { color: theme.foreground }]}>
                        {member.status === 'INVITED'
                          ? t('teamSettingsScreen.revokeInvite')
                          : t('teamSettingsScreen.removeMember')}
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        )}
      </SectionCard>

      {canManageMembers ? (
        <SectionCard title={t('teamSettingsScreen.inviteMembersTitle')}>
          <Text style={[styles.lead, { color: theme.mutedForeground, marginBottom: spacing.sm }]}>
            {t('teamSettingsScreen.inviteLead')}
          </Text>
          <TextInput
            value={inviteEmail}
            onChangeText={setInviteEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder={t('teamSettingsScreen.inviteEmailPlaceholder')}
            {...getTextInputProps(theme)}
            style={getTextInputStyle(theme)}
          />
          <Pressable
            accessibilityRole="button"
            disabled={!inviteEmail.trim() || inviteMutation.isPending}
            onPress={onInvite}
            style={[
              styles.primary,
              {
                backgroundColor: inviteEmail.trim() && !inviteMutation.isPending
                  ? theme.primary
                  : theme.secondary,
              },
            ]}>
            {inviteMutation.isPending ? (
              <ActivityIndicator color={theme.primaryForeground} />
            ) : (
              <Text style={[styles.primaryLabel, { color: theme.primaryForeground }]}>
                {t('teamSettingsScreen.sendInvite')}
              </Text>
            )}
          </Pressable>
        </SectionCard>
      ) : null}

      <Text style={[styles.lead, { color: theme.mutedForeground }]}>
        {t('teamSettingsScreen.footnote')}
      </Text>
      </ScrollView>
    </View>
  );
}

function removeErrorMessage(error: unknown, t: (key: string) => string): string {
  if (error instanceof ApiError && error.code === 'FORBIDDEN') {
    return t('teamSettingsScreen.ownerOnlyLead');
  }
  if (error instanceof Error) return error.message;
  return t('teamSettingsScreen.removeFailedFallback');
}

function inviteErrorMessage(error: unknown, t: (key: string) => string): string {
  if (error instanceof ApiError) {
    if (error.code === 'FORBIDDEN') return t('teamSettingsScreen.ownerOnlyLead');
    if (error.code === 'INVITE_PENDING') return t('teamSettingsScreen.invitePendingError');
    if (error.code === 'ALREADY_MEMBER') return t('teamSettingsScreen.inviteAlreadyMember');
    return error.message;
  }
  if (error instanceof Error && error.message === 'INVITE_PENDING') {
    return t('teamSettingsScreen.invitePendingError');
  }
  if (error instanceof Error && error.message === 'ALREADY_MEMBER') {
    return t('teamSettingsScreen.inviteAlreadyMember');
  }
  return t('teamSettingsScreen.inviteFailedFallback');
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
    paddingBottom: layout.tabBarScrollInset,
    gap: spacing.lg,
  },
  pageLead: { fontSize: fontSize.body, lineHeight: lineHeight.bodyRelaxed },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  lead: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.bodyRelaxed },
  primary: {
    marginTop: spacing.md,
    borderRadius: 8,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: { fontSize: fontSize.body, fontWeight: '700' },
  secondary: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minHeight: 32,
    justifyContent: 'center',
  },
  secondaryLabel: { fontSize: fontSize.caption, fontWeight: '600' },
  memberRow: {
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.md,
    gap: spacing.md,
  },
  memberHeader: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  memberName: { fontSize: fontSize.bodySmall, fontWeight: '700', lineHeight: lineHeight.body },
  managementPanel: {
    borderTopWidth: 1,
    paddingTop: spacing.sm,
    alignItems: 'flex-start',
  },
});
