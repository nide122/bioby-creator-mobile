import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AgentSendModePicker } from '@/components/product/AgentSendModePicker';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, lineHeight, palette, spacing } from '@/constants/tokens';
import { updateAgentSendMode } from '@/src/api/account-api';
import { type AgentSendMode, useSessionStore } from '@/src/stores/session-store';

export default function ReplyStyleSettingsScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const agentSendMode = useSessionStore((s) => s.agentSendMode);
  const setAgentSendMode = useSessionStore((s) => s.setAgentSendMode);

  const value: AgentSendMode = agentSendMode === 'review_only' ? 'review_only' : 'agent_assist';

  return (
    <ScrollView
      testID="screen-reply-style"
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}>
      <Text style={[styles.lead, { color: theme.mutedForeground }]}>{t('replyStyleScreen.lead')}</Text>
      <AgentSendModePicker
        value={value}
        onChange={(mode) => {
          setAgentSendMode(mode);
          void updateAgentSendMode(mode);
        }}
        copy={{
          assistTitle: t('onboardingConsentScreen.modeAssistTitle'),
          assistSubtitle: t('onboardingConsentScreen.modeAssistSubtitle'),
          reviewTitle: t('onboardingConsentScreen.modeReviewTitle'),
          reviewSubtitle: t('onboardingConsentScreen.modeReviewSubtitle'),
        }}
        boundaryTitle={t('onboardingConsentScreen.boundaryTitle')}
        boundaryBody={t('onboardingConsentScreen.boundaryBody')}
      />
      <View style={[styles.note, { backgroundColor: theme.muted }]}>
        <Text style={[styles.noteText, { color: theme.mutedForeground }]}>{t('replyStyleScreen.savedNote')}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
    paddingBottom: layout.tabBarScrollInset,
    gap: spacing.lg,
  },
  lead: {
    fontSize: fontSize.body,
    lineHeight: lineHeight.bodyRelaxed,
  },
  note: {
    borderRadius: spacing.md,
    padding: spacing.md,
  },
  noteText: {
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodyRelaxed,
  },
});
