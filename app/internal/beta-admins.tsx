import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  Badge,
  HubScreen,
  QueryRetryCard,
  SectionCard,
  SegmentedControl,
  TextField,
} from '@/components/product';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import { ApiError } from '@/src/api/api-client';
import {
  fetchInternalBetaAccess,
  fetchInternalBetaAdmins,
  saveInternalBetaAdmin,
  setInternalBetaAdminActive,
  type InternalBetaAdmin,
  type InternalBetaRole,
} from '@/src/api/internal-beta-api';
import { alertAction, confirmAction } from '@/src/lib/app-dialog';

const ROLE_OPTIONS = [
  { id: 'BETA_VIEWER', label: '只读查看' },
  { id: 'BETA_ADMIN', label: '管理员' },
] as const;

export default function InternalBetaAdminsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<InternalBetaRole>('BETA_VIEWER');

  const access = useQuery({
    queryKey: ['internal', 'beta-access'],
    queryFn: fetchInternalBetaAccess,
    retry: false,
  });
  const admins = useQuery({
    queryKey: ['internal', 'beta-admins'],
    queryFn: fetchInternalBetaAdmins,
    retry: false,
  });

  const refreshAdmins = async () => {
    await queryClient.invalidateQueries({ queryKey: ['internal', 'beta-admins'] });
  };
  const saveMutation = useMutation({
    mutationFn: () => saveInternalBetaAdmin(email.trim(), role),
    onSuccess: async () => {
      setEmail('');
      await refreshAdmins();
    },
    onError: (error) => void alertAction('添加失败', errorMessage(error)),
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) => setInternalBetaAdminActive(id, active),
    onSuccess: refreshAdmins,
    onError: (error) => void alertAction('操作失败', errorMessage(error)),
  });

  if (access.isPending || admins.isPending) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator accessibilityLabel="加载管理员列表" color={theme.primary} />
      </View>
    );
  }

  const forbidden =
    access.data?.role !== 'BETA_ADMIN'
    || (admins.error instanceof ApiError && admins.error.status === 403);
  if (forbidden) {
    return <PlaceholderScreen title="没有管理员权限" description="只有 BETA_ADMIN 可以管理内测控制台成员。" />;
  }
  if (admins.error) {
    return (
      <PlaceholderScreen title="管理员列表加载失败" description="请检查后端服务和数据库连接。">
        <QueryRetryCard message={errorMessage(admins.error)} onRetry={() => void admins.refetch()} />
      </PlaceholderScreen>
    );
  }

  return (
    <HubScreen
      testID="screen-internal-beta-admins"
      eyebrow="Internal only"
      title="管理员管理"
      lead="添加已注册的 Creator 账号，并控制其内测控制台权限。"
      refreshing={admins.isRefetching}
      onRefresh={() => void admins.refetch()}>
      <SectionCard title="添加或恢复成员" subtitle="账号必须先完成产品注册；重复添加会更新角色并恢复权限。">
        <TextField
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="KOL 或管理员的注册邮箱"
          accessibilityLabel="注册邮箱"
        />
        <SegmentedControl options={ROLE_OPTIONS} value={role} onChange={setRole} disabled={saveMutation.isPending} />
        <Pressable
          accessibilityRole="button"
          disabled={!email.trim() || saveMutation.isPending}
          onPress={() => saveMutation.mutate()}
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: theme.primary },
            (!email.trim() || saveMutation.isPending) && styles.disabled,
            pressed && styles.pressed,
          ]}>
          <Text style={[styles.buttonLabel, { color: theme.primaryForeground }]}>
            {saveMutation.isPending ? '保存中…' : '添加成员'}
          </Text>
        </Pressable>
      </SectionCard>

      <SectionCard title={`现有成员（${admins.data?.length ?? 0}）`} subtitle="停用后该账号会立即失去控制台访问权限。">
        {(admins.data ?? []).map((admin) => (
          <AdminRow
            key={admin.id}
            admin={admin}
            currentEmail={access.data.email}
            busy={statusMutation.isPending}
            onToggle={async () => {
              if (admin.active) {
                const confirmed = await confirmAction({
                  title: '停用成员',
                  message: `确定停用 ${admin.email} 的控制台权限吗？`,
                  confirmLabel: '停用',
                  cancelLabel: '取消',
                  destructive: true,
                });
                if (!confirmed) return;
              }
              statusMutation.mutate({ id: admin.id, active: !admin.active });
            }}
          />
        ))}
      </SectionCard>
    </HubScreen>
  );
}

function AdminRow({
  admin,
  currentEmail,
  busy,
  onToggle,
}: {
  admin: InternalBetaAdmin;
  currentEmail: string;
  busy: boolean;
  onToggle: () => void;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const isSelf = admin.email.toLowerCase() === currentEmail.toLowerCase();
  return (
    <View style={[styles.adminRow, { borderColor: theme.border }]}>
      <View style={styles.identity}>
        <View style={styles.nameLine}>
          <Text style={[styles.name, { color: theme.foreground }]}>{admin.displayName?.trim() || admin.email}</Text>
          <Badge label={admin.active ? '有效' : '已停用'} tone={admin.active ? 'mint' : 'neutral'} />
        </View>
        <Text style={[styles.email, { color: theme.mutedForeground }]}>{admin.email}</Text>
        <Text style={[styles.meta, { color: theme.foregroundEyebrow }]}>
          {admin.role === 'BETA_ADMIN' ? '管理员：可查看及管理成员' : '只读：仅可查看 KOL 数据'}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        disabled={busy || isSelf}
        onPress={onToggle}
        style={({ pressed }) => [
          styles.secondaryButton,
          { borderColor: theme.border },
          (busy || isSelf) && styles.disabled,
          pressed && styles.pressed,
        ]}>
        <Text style={[styles.secondaryLabel, { color: theme.foreground }]}>
          {isSelf ? '当前账号' : admin.active ? '停用' : '恢复'}
        </Text>
      </Pressable>
    </View>
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '未知错误';
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  primaryButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
  },
  buttonLabel: { fontSize: fontSize.bodySmall, fontWeight: '700' },
  adminRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  identity: { flex: 1, minWidth: 0, gap: 3 },
  nameLine: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  name: { fontSize: fontSize.body, fontWeight: '700' },
  email: { fontSize: fontSize.caption },
  meta: { fontSize: fontSize.caption, lineHeight: lineHeight.caption },
  secondaryButton: {
    minHeight: 38,
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
  },
  secondaryLabel: { fontSize: fontSize.caption, fontWeight: '700' },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.75 },
});
