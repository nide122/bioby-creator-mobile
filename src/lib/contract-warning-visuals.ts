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
        rail: '#FDA4AF',
        border: 'rgba(253, 164, 175, 0.28)',
        background: '#120D0F',
        iconBg: 'rgba(253, 164, 175, 0.12)',
        icon: '#F0B4BE',
        title: theme.foreground,
        body: theme.foregroundSubtitle,
        muted: theme.mutedForeground,
        iconName: 'warning',
      };
    case 'warning':
      return {
        rail: '#E8C468',
        border: 'rgba(232, 196, 104, 0.24)',
        background: '#100F0A',
        iconBg: 'rgba(232, 196, 104, 0.10)',
        icon: '#E8C468',
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
