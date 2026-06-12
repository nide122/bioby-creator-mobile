import { type Href, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { SettingsGroup, SettingsRow } from '@/components/product';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, lineHeight, palette, spacing } from '@/constants/tokens';
import Ionicons from '@expo/vector-icons/Ionicons';
import { alertAction } from '@/src/lib/app-dialog';

export default function DataExportSettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  const exportWorkspace = () => {
    void alertAction(t('dataExportScreen.workspaceAlert.title'), t('dataExportScreen.workspaceAlert.message'));
  };

  const exportInbox = () => {
    void alertAction(t('dataExportScreen.inboxAlert.title'), t('dataExportScreen.inboxAlert.message'));
  };

  return (
    <ScrollView
      testID="screen-data-export"
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}>
      <Text style={[styles.lead, { color: theme.mutedForeground }]}>{t('dataExportScreen.lead')}</Text>

      <SettingsGroup title={t('dataExportScreen.exportHeading')}>
        <ExportRow
          title={t('dataExportScreen.rows.workspaceTitle')}
          subtitle={t('dataExportScreen.rows.workspaceSubtitle')}
          onPress={exportWorkspace}
          testID="data-export-workspace"
        />
        <ExportRow
          title={t('dataExportScreen.rows.inboxTitle')}
          subtitle={t('dataExportScreen.rows.inboxSubtitle')}
          onPress={exportInbox}
          testID="data-export-inbox"
        />
      </SettingsGroup>

      <SettingsGroup title={t('dataExportScreen.recordsHeading')}>
        <ExportRow
          title={t('dataExportScreen.rows.paymentsTitle')}
          subtitle={t('dataExportScreen.rows.paymentsSubtitle')}
          onPress={() => router.push('/payments' as Href)}
          testID="data-export-payments"
        />
        <ExportRow
          title={t('dataExportScreen.rows.disputesTitle')}
          subtitle={t('dataExportScreen.rows.disputesSubtitle')}
          onPress={() => router.push('/disputes' as Href)}
          testID="data-export-disputes"
        />
      </SettingsGroup>

      <View style={[styles.note, { backgroundColor: theme.muted }]}>
        <Text style={[styles.noteText, { color: theme.mutedForeground }]}>{t('dataExportScreen.footer')}</Text>
      </View>
    </ScrollView>
  );
}

function ExportRow({
  title,
  subtitle,
  onPress,
  testID,
}: {
  title: string;
  subtitle: string;
  onPress: () => void;
  testID?: string;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  return (
    <SettingsRow testID={testID} onPress={onPress}>
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, { color: theme.foreground }]}>{title}</Text>
        <Text style={[styles.rowSubtitle, { color: theme.mutedForeground }]}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={theme.foregroundEyebrow} />
    </SettingsRow>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
    paddingBottom: layout.tabBarScrollInset,
    gap: spacing.lg,
  },
  lead: { fontSize: fontSize.body, lineHeight: lineHeight.bodyRelaxed },
  rowBody: { flex: 1, gap: 2, paddingVertical: spacing.xs },
  rowTitle: { fontSize: fontSize.body, fontWeight: '600' },
  rowSubtitle: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.bodyRelaxed },
  note: { borderRadius: spacing.md, padding: spacing.md },
  noteText: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.bodyRelaxed },
});
