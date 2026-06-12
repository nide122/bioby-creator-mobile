import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import { GoogleIcon } from '@/components/oauth/GoogleIcon';
import { MicrosoftIcon } from '@/components/oauth/MicrosoftIcon';
import { fontSize, layout, palette, radii } from '@/constants/tokens';
import { alertAction } from '@/src/lib/app-dialog';

type Provider = 'google' | 'microsoft';

type Props = {
  provider: Provider;
  label: string;
};

export function OAuthUnconfiguredButton({ provider, label }: Props) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  const onPress = () => {
    void alertAction(
      t('auth.oauth.notConfiguredTitle'),
      t(`auth.oauth.notConfiguredMessage.${provider}`),
    );
  };

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.btn,
        {
          borderColor: theme.border,
          backgroundColor: theme.card,
          opacity: 0.72,
        },
      ]}>
      {provider === 'google' ? <GoogleIcon size={20} /> : <MicrosoftIcon size={20} />}
      <Text style={[styles.label, { color: theme.foreground }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    gap: 10,
    borderWidth: 1,
    borderRadius: radii.md,
    minHeight: layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  label: { fontSize: fontSize.body, fontWeight: '600' },
});
