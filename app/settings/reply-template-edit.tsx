import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { getTextInputProps, getTextInputStyle, HubScreen, SectionCard } from '@/components/product';
import { useColorScheme } from '@/components/useColorScheme';
import { ReplyTemplateBodyEditor } from '@/src/components/reply-templates/ReplyTemplateBodyEditor';
import { fontSize, layout, lineHeight, palette, spacing } from '@/constants/tokens';
import { useReplyTemplates } from '@/src/hooks/use-reply-templates';
import { alertAction } from '@/src/lib/app-dialog';

export default function ReplyTemplateEditScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const rawId = params.id;
  const templateId = Array.isArray(rawId) ? rawId[0] : rawId;
  const isEdit = !!templateId;

  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const { templates, createTemplate, updateTemplate, isSaving } = useReplyTemplates();

  const existing = templateId ? templates.find((item) => item.id === templateId) : undefined;

  const [name, setName] = useState('');
  const [body, setBody] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    if (!existing) return;
    setName(existing.name);
    setBody(existing.body);
    setIsDefault(existing.isDefault);
  }, [existing]);

  const canSave = name.trim().length > 0 && body.trim().length > 0 && !isSaving;

  const onSave = async () => {
    if (!canSave) return;
    try {
      const input = {
        name: name.trim(),
        body: body.trim(),
        isDefault,
        sortOrder: existing?.sortOrder ?? templates.length,
      };
      if (isEdit && templateId) {
        await updateTemplate(templateId, input);
      } else {
        await createTemplate(input);
      }
      router.back();
    } catch (error) {
      const message = error instanceof Error ? error.message : t('replyTemplateEditScreen.saveFailedBody');
      void alertAction(t('replyTemplateEditScreen.saveFailedTitle'), message);
    }
  };

  if (isEdit && !existing) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>
      <HubScreen
        eyebrow={t('tabs.account')}
        title={isEdit ? t('replyTemplateEditScreen.editTitle') : t('replyTemplateEditScreen.createTitle')}>
        <SectionCard title={t('replyTemplateEditScreen.formTitle')}>
          <Text style={[styles.label, { color: theme.foregroundSubtitle }]}>{t('replyTemplateEditScreen.nameLabel')}</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t('replyTemplateEditScreen.namePlaceholder')}
            {...getTextInputProps(theme)}
            style={getTextInputStyle(theme, { borderColor: theme.border })}
          />

          <Text style={[styles.label, { color: theme.foregroundSubtitle }]}>{t('replyTemplateEditScreen.bodyLabel')}</Text>
          <ReplyTemplateBodyEditor
            value={body}
            onChange={setBody}
            placeholder={t('replyTemplateEditScreen.bodyPlaceholder')}
          />

          <View style={[styles.switchRow, { borderColor: theme.border }]}>
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Text style={[styles.switchTitle, { color: theme.foreground }]}>{t('replyTemplateEditScreen.defaultLabel')}</Text>
              <Text style={[styles.switchBody, { color: theme.mutedForeground }]}>{t('replyTemplateEditScreen.defaultBody')}</Text>
            </View>
            <Switch value={isDefault} onValueChange={setIsDefault} />
          </View>
        </SectionCard>

        <Pressable
          accessibilityRole="button"
          disabled={!canSave}
          onPress={() => void onSave()}
          style={[styles.saveButton, { backgroundColor: canSave ? theme.primary : theme.border }]}>
          {isSaving ? (
            <ActivityIndicator color={theme.primaryForeground} />
          ) : (
            <Text style={[styles.saveLabel, { color: theme.primaryForeground }]}>{t('replyTemplateEditScreen.saveCta')}</Text>
          )}
        </Pressable>

        <Pressable accessibilityRole="button" onPress={() => router.back()}>
          <Text style={[styles.cancel, { color: theme.mutedForeground }]}>{t('common.cancel')}</Text>
        </Pressable>
      </HubScreen>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: layout.tabBarScrollInset,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodyRelaxed,
    marginBottom: spacing.xs,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderTopWidth: 1,
    paddingTop: spacing.md,
    marginTop: spacing.sm,
  },
  switchTitle: {
    fontSize: fontSize.body,
    fontWeight: '600',
  },
  switchBody: {
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodyRelaxed,
  },
  saveButton: {
    borderRadius: spacing.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  saveLabel: {
    fontSize: fontSize.body,
    fontWeight: '600',
  },
  cancel: {
    textAlign: 'center',
    marginTop: spacing.md,
    fontSize: fontSize.bodySmall,
  },
});
