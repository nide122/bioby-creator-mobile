import type { BadgeTone } from '@/components/product';
import type { ThemePalette } from '@/constants/tokens';
import type { LeadValueBand } from '@/src/types/domain';

export type LeadValueBandAccent = {
  dot: string;
  iconBg: string;
  iconBorder: string;
  iconColor: string;
  detailAccent: boolean;
};

const AMBER_SOFT = 'rgba(250, 204, 21, 0.12)';
const AMBER_BORDER = 'rgba(250, 204, 21, 0.28)';
const AMBER_STRONG = '#FACC15';
const SLATE_DOT = 'rgba(163, 170, 181, 0.55)';

export function leadValueBandBadgeTone(band: LeadValueBand): BadgeTone {
  switch (band) {
    case 'high_value':
      return 'mint';
    case 'needs_negotiation':
      return 'warning';
    case 'archived':
      return 'neutral';
  }
}

export function leadValueBandAccent(band: LeadValueBand | undefined, theme: ThemePalette): LeadValueBandAccent {
  switch (band) {
    case 'high_value':
      return {
        dot: theme.accentMintStrong,
        iconBg: theme.accentMintSoft,
        iconBorder: 'rgba(167, 243, 208, 0.22)',
        iconColor: theme.accentMintStrong,
        detailAccent: true,
      };
    case 'needs_negotiation':
      return {
        dot: AMBER_STRONG,
        iconBg: AMBER_SOFT,
        iconBorder: AMBER_BORDER,
        iconColor: AMBER_STRONG,
        detailAccent: false,
      };
    case 'archived':
      return {
        dot: SLATE_DOT,
        iconBg: theme.secondary,
        iconBorder: theme.border,
        iconColor: theme.foregroundEyebrow,
        detailAccent: false,
      };
    default:
      return {
        dot: SLATE_DOT,
        iconBg: theme.muted,
        iconBorder: 'transparent',
        iconColor: theme.primary,
        detailAccent: false,
      };
  }
}
