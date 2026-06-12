import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Badge, HubMetric, HubMetrics, HubScreen, QueryRetryCard, SectionCard } from '@/components/product';
import { getTextInputProps, getTextInputStyle } from '@/components/product';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, lineHeight, palette, spacing } from '@/constants/tokens';
import { ApiError } from '@/src/api/api-client';
import { invalidateTenantScopedQueries } from '@/src/lib/tenant-query';
import {
  useInviteTeamMember,
  useRevokeTeamInvite,
  useTeamMembers,
  useTeamRoles,
} from '@/src/hooks/use-account-settings';
import type { InvitableTeamRole, TeamMember, TeamRoleCard, TeamRoleId } from '@/src/types/domain';
import { alertAction } from '@/src/lib/app-dialog';
import { localizeMemberRole, localizeTeamRoles } from '@/src/lib/team-role-i18n';
import { useSessionStore } from '@/src/stores/session-store';

const INVITABLE_ROLES: InvitableTeamRole[] = ['AGENT', 'FINANCE', 'VIEWER'];

function invitableRoleId(role: InvitableTeamRole): TeamRoleId {
  return role.toLowerCase() as TeamRoleId;
}

export default function SettingsTeamScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<InvitableTeamRole>('AGENT');

  const team = useTeamRoles();
  const members = useTeamMembers();
  const inviteMutation = useInviteTeamMember();
  const revokeMutation = useRevokeTeamInvite();
  const membershipRole = useSessionStore((s) => s.membershipRole);
  const isLocalDemoWorkspace = useSessionStore((s) => s.isLocalDemoWorkspace);
  const canManageMembers = membershipRole === 'OWNER' || isLocalDemoWorkspace;

  const pendingCount = useMemo(
    () => (members.data ?? []).filter((m) => m.status === 'INVITED').length,
    [members.data],
  );

  if (team.isPending || members.isPending) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator accessibilityLabel={t('teamSettingsScreen.loadingA11y')} color={theme.primary} />
      </View>
    );
  }

  if (team.error || !team.data || members.error) {
    const msg =
      team.error?.message ?? members.error?.message ?? t('teamSettingsScreen.emptyDataFallback');
    return (
      <PlaceholderScreen
        title={t('teamSettingsScreen.loadFailedTitle')}
        description={t('teamSettingsScreen.retryDesc')}>
        <QueryRetryCard
          message={msg}
          onRetry={() => {
            void invalidateTenantScopedQueries(queryClient);
            void queryClient.invalidateQueries({ queryKey: ['account', 'team-roles'] });
          }}
        />
      </PlaceholderScreen>
    );
  }

  const memberList = members.data ?? [];
  const localizedTeamRoles = useMemo(() => localizeTeamRoles(team.data, t), [team.data, t]);
  const selectedRoleCard = localizedTeamRoles.find((role) => role.id === invitableRoleId(inviteRole));

  const onInvite = () => {
    if (!canManageMembers) return;
    const email = inviteEmail.trim();
    if (!email || inviteMutation.isPending) return;
    inviteMutation.mutate(
      { email, role: inviteRole },
      {
        onSuccess: () => {
          setInviteEmail('');
        },
        onError: (err) => {
          void alertAction(
            t('teamSettingsScreen.inviteFailedTitle'),
            inviteErrorMessage(err, t),
          );
        },
      },
    );
  };

  const onRevoke = (member: TeamMember) => {
    if (!canManageMembers || revokeMutation.isPending) return;
    revokeMutation.mutate(member.id, {
      onError: (err) => {
        void alertAction(
          t('teamSettingsScreen.revokeFailedTitle'),
          revokeErrorMessage(err, t),
        );
      },
    });
  };

  return (
    <HubScreen
      eyebrow={t('tabs.account')}
      title={t('teamSettingsScreen.title')}
      lead={t('teamSettingsScreen.description')}
      toolbar={
        <HubMetrics>
          <HubMetric value={String(team.data.length)} label={t('teamSettingsScreen.metricRoles')} />
          <HubMetric value={String(pendingCount)} label={t('teamSettingsScreen.metricPending')} accent />
        </HubMetrics>
      }>
      <SectionCard title={t('teamSettingsScreen.membersTitle')} subtitle={t('teamSettingsScreen.membersSubtitle')}>
        {memberList.length === 0 ? (
          <Text style={[styles.lead, { color: theme.mutedForeground }]}>{t('teamSettingsScreen.membersEmpty')}</Text>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {memberList.map((member) => (
              <View
                key={member.id}
                style={[styles.assignmentRow, { borderColor: theme.border, backgroundColor: theme.card }]}>
                <View style={{ flex: 1, gap: spacing.xs }}>
                  <Text style={[styles.assignmentTitle, { color: theme.foreground }]}>
                    {member.displayName || member.email}
                  </Text>
                  <Text style={[styles.lead, { color: theme.mutedForeground }]}>
                    {t('teamSettingsScreen.memberMeta', {
                      email: member.email,
                      role: localizeMemberRole(member.role, t),
                    })}
                  </Text>
                </View>
                {member.status === 'INVITED' ? (
                  canManageMembers ? (
                    <View style={styles.memberActions}>
                      <Badge tone="warning" label={t('teamSettingsScreen.badgePending')} />
                      <Pressable
                        accessibilityRole="button"
                        disabled={revokeMutation.isPending}
                        onPress={() => onRevoke(member)}
                        style={[styles.secondary, { borderColor: theme.border }]}>
                        <Text style={[styles.secondaryLabel, { color: theme.foreground }]}>
                          {t('teamSettingsScreen.revokeInvite')}
                        </Text>
                      </Pressable>
                    </View>
                  ) : (
                    <Badge tone="warning" label={t('teamSettingsScreen.badgePending')} />
                  )
                ) : (
                  <Badge tone="mint" label={t('teamSettingsScreen.badgeActive')} />
                )}
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
          <Text style={[styles.fieldLabel, { color: theme.mutedForeground }]}>
            {t('teamSettingsScreen.inviteRoleLabel')}
          </Text>
          <View style={styles.roleRow}>
            {INVITABLE_ROLES.map((role) => {
              const selected = inviteRole === role;
              return (
                <Pressable
                  key={role}
                  accessibilityRole="button"
                  onPress={() => setInviteRole(role)}
                  style={[
                    styles.roleChip,
                    {
                      borderColor: selected ? theme.primary : theme.border,
                      backgroundColor: selected ? `${theme.primary}14` : theme.card,
                    },
                  ]}>
                  <Text style={[styles.roleChipLabel, { color: selected ? theme.primary : theme.foreground }]}>
                    {t(`teamSettingsScreen.roles.${role.toLowerCase()}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {selectedRoleCard ? (
            <View style={styles.rolePreview}>
              <RoleDescriptionCard role={selectedRoleCard} />
            </View>
          ) : null}
          <Pressable
            accessibilityRole="button"
            disabled={!inviteEmail.trim() || inviteMutation.isPending}
            onPress={onInvite}
            style={[
              styles.primary,
              {
                backgroundColor: inviteEmail.trim() && !inviteMutation.isPending ? theme.primary : theme.secondary,
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

      {!canManageMembers
        ? localizedTeamRoles.map((role) => (
            <SectionCard key={role.id} title={role.title}>
              <RoleDescriptionCard role={role} />
            </SectionCard>
          ))
        : null}

      <Text style={[styles.lead, { color: theme.mutedForeground }]}>{t('teamSettingsScreen.footnote')}</Text>
    </HubScreen>
  );
}

function revokeErrorMessage(err: unknown, t: (key: string) => string): string {
  if (err instanceof ApiError && err.code === 'FORBIDDEN') {
    return t('teamSettingsScreen.ownerOnlyLead');
  }
  if (err instanceof Error) return err.message;
  return t('teamSettingsScreen.revokeFailedFallback');
}

function inviteErrorMessage(err: unknown, t: (key: string) => string): string {
  if (err instanceof ApiError) {
    if (err.code === 'USER_NOT_FOUND') return t('teamSettingsScreen.inviteUserNotFound');
    if (err.code === 'FORBIDDEN') return t('teamSettingsScreen.ownerOnlyLead');
    return err.message;
  }
  if (err instanceof Error && err.message === 'INVITE_PENDING') {
    return t('teamSettingsScreen.invitePendingError');
  }
  if (err instanceof Error && err.message === 'ALREADY_MEMBER') {
    return t('teamSettingsScreen.inviteAlreadyMember');
  }
  return t('teamSettingsScreen.inviteFailedFallback');
}

function RoleDescriptionCard({ role }: { role: TeamRoleCard }) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  return (
    <>
      <Text style={[styles.summary, { color: theme.foreground }]}>{role.summary}</Text>
      <View style={styles.roleBadges}>
        <Badge tone="mint" label={t('teamSettingsScreen.allowedCount', { count: role.allowed.length })} />
        <Badge tone="warning" label={t('teamSettingsScreen.deniedCount', { count: role.denied.length })} />
      </View>
      <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
        <PermissionList label={t('teamSettingsScreen.permissionAllowed')} values={role.allowed} tone="mint" />
        <PermissionList label={t('teamSettingsScreen.permissionDenied')} values={role.denied} tone="warning" />
      </View>
    </>
  );
}

function PermissionList({
  label,
  tone,
  values,
}: {
  label: string;
  tone: 'mint' | 'warning';
  values: string[];
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  return (
    <View style={[styles.permissionBox, { borderColor: theme.border, backgroundColor: theme.card }]}>
      <Badge tone={tone} label={label} />
      {values.map((value) => (
        <Text key={value} style={[styles.permissionText, { color: theme.foreground }]}>
          {value}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  lead: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.bodyRelaxed },
  summary: { fontSize: fontSize.body, lineHeight: lineHeight.bodyRelaxed, marginBottom: spacing.sm },
  roleBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
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
  assignmentRow: {
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.md,
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  assignmentTitle: { fontSize: fontSize.bodySmall, fontWeight: '700', lineHeight: lineHeight.body },
  memberActions: { gap: spacing.sm, alignItems: 'flex-end' },
  fieldLabel: { fontSize: fontSize.caption, marginTop: spacing.md, marginBottom: spacing.xs },
  rolePreview: { marginTop: spacing.sm },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  roleChip: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  roleChipLabel: { fontSize: fontSize.caption, fontWeight: '600' },
  permissionBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.md,
    gap: spacing.xs,
  },
  permissionText: { fontSize: fontSize.caption, lineHeight: lineHeight.body },
});
