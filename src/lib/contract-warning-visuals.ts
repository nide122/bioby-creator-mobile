import type { ThemePalette } from '@/constants/tokens';
import type { InboxRiskSeverity } from '@/src/types/domain';

export type ContractWarningVisuals = {
  rail: string;
  border: string;
  background: string;
  iconBg: string;
  icon: string;
  title: string;
  body: string;
  muted: string;
  iconName: 'warning' | 'alert-circle' | 'information-circle';
};

export function contractWarningVisuals(
  severity: InboxRiskSeverity,
  theme: ThemePalette
): ContractWarningVisuals {
  switch (severity) {
    case 'danger':
      return {
        rail: '#F87171',
        border: 'rgba(248, 113, 113, 0.35)',
        background: theme.secondary,
        iconBg: 'rgba(248, 113, 113, 0.12)',
        icon: '#DC2626',
        title: theme.foreground,
        body: theme.foregroundSubtitle,
        muted: theme.mutedForeground,
        iconName: 'warning',
      };
    case 'warning':
      return {
        rail: '#FBBF24',
        border: 'rgba(251, 191, 36, 0.35)',
        background: theme.secondary,
        iconBg: 'rgba(251, 191, 36, 0.12)',
        icon: '#D97706',
        title: theme.foreground,
        body: theme.foregroundSubtitle,
        muted: theme.mutedForeground,
        iconName: 'alert-circle',
      };
    default:
      return {
        rail: theme.primary,
        border: `${theme.primary}35`,
        background: theme.secondary,
        iconBg: `${theme.primary}14`,
        icon: theme.primary,
        title: theme.foreground,
        body: theme.foregroundSubtitle,
        muted: theme.mutedForeground,
        iconName: 'information-circle',
      };
  }
}
