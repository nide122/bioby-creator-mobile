import type { BadgeTone } from '@/components/product';
import type { ThemePalette } from '@/constants/tokens';
import type { InboxPriority } from '@/src/types/domain';

export type InboxPriorityAccent = {
  dot: string;
  iconBg: string;
  iconBorder: string;
  iconColor: string;
  detailAccent: boolean;
};

const RED_SOFT = 'rgba(248, 113, 113, 0.14)';
const RED_BORDER = 'rgba(248, 113, 113, 0.32)';
const RED_STRONG = '#EF4444';
const AMBER_SOFT = 'rgba(250, 204, 21, 0.12)';
const AMBER_BORDER = 'rgba(250, 204, 21, 0.28)';
const AMBER_STRONG = '#FACC15';
const SLATE_DOT = 'rgba(163, 170, 181, 0.55)';

export function inboxPriorityBadgeTone(priority: InboxPriority): BadgeTone {
  switch (priority) {
    case 'p0':
      return 'danger';
    case 'p1':
      return 'mint';
    case 'p2':
      return 'warning';
    case 'p3':
      return 'neutral';
  }
}

export function inboxPriorityAccent(
  priority: InboxPriority | undefined,
  theme: ThemePalette
): InboxPriorityAccent {
  switch (priority) {
    case 'p0':
      return {
        dot: RED_STRONG,
        iconBg: RED_SOFT,
        iconBorder: RED_BORDER,
        iconColor: RED_STRONG,
        detailAccent: true,
      };
    case 'p1':
      return {
        dot: theme.accentMintStrong,
        iconBg: theme.accentMintSoft,
        iconBorder: 'rgba(167, 243, 208, 0.22)',
        iconColor: theme.accentMintStrong,
        detailAccent: true,
      };
    case 'p2':
      return {
        dot: AMBER_STRONG,
        iconBg: AMBER_SOFT,
        iconBorder: AMBER_BORDER,
        iconColor: AMBER_STRONG,
        detailAccent: false,
      };
    case 'p3':
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
