import { Platform } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { AuthSession } from '@/src/api/auth-types';
import { isApiConfigured } from '@/src/api/api-config';
import { mapAuthSessionToStore } from '@/src/auth/apply-auth-session';
import type { SocialPlatformKey } from '@/src/api/mock-creator-profile';
import type { CreatorPlatformProfile, PresetPlatformKey } from '@/src/types/creator-profile';
import { useDraftApprovalStore } from '@/src/stores/draft-approval-store';

/** Onboarding creator profile basics. */
export type CreatorProfileBasics = {
  displayName: string;
  /** Creator niche summary. */
  niche: string;
  /** Main collaboration platforms. */
  platforms: string[];
  /** Per-platform profile slots (YouTube / TikTok / Instagram). */
  platformProfiles?: Record<PresetPlatformKey, CreatorPlatformProfile>;
  /** User-entered social profile URL. */
  profileUrl?: string;
  /** Resolved platform. */
  platform?: SocialPlatformKey;
  platformLabel?: string;
  handle?: string;
  bio?: string;
  nicheTags?: string[];
  followerCountLabel?: string;
  confidence?: 'high' | 'low';
};

export type MailboxConnection = {
  email: string;
  method: 'smtp';
  connectedAt: string;
};

export type AgentSendMode = 'agent_assist' | 'review_only';
export type CreatorFocusMode = 'quiet' | 'work';
export type ClassificationStrictness = 'relaxed' | 'standard' | 'strict';

type SessionState = {
  /** Demo auth state before real access tokens. */
  isAuthenticated: boolean;
  /** Demo account email. */
  accountEmail: string | null;

  profileBasics: CreatorProfileBasics | null;
  /** ISO timestamp for consent completion. */
  complianceAcceptedAt: string | null;
  /** AI send policy: safe follow-ups or review-only. */
  agentSendMode: AgentSendMode | null;
  /** Notification/work posture: quiet pushes vs focused work session. */
  creatorFocusMode: CreatorFocusMode;
  /** Inbox filter preset for classification strictness. */
  classificationStrictness: ClassificationStrictness;
  /** True while strictness change triggers server-side inbox reclassification. */
  inboxReclassificationActive: boolean;
  /** User completed inbox filter onboarding step. */
  inboxFilterStepFinished: boolean;
  /** Inbox setup completed or skipped. */
  emailWizardFinished: boolean;
  /** User skipped inbox setup. */
  emailSkipped: boolean;
  /** Rate card onboarding step completed or skipped. */
  rateCardStepFinished: boolean;
  /** User skipped rate card setup during onboarding. */
  rateCardSkipped: boolean;
  /** Connected deal inbox; MVP stores connection status only. */
  mailboxConnection: MailboxConnection | null;
  /** Free workspace is assigned by default; kept for future paid-plan migration. */
  planAcknowledged: boolean;
  /** All onboarding steps complete. */
  onboardingComplete: boolean;

  /** JWT cold-start restore finished (API mode). Not cleared on sign-out. */
  authBootstrapReady: boolean;

  /** First workspace tour banner. */
  productTourDismissed: boolean;

  /** Display name from registration, used to prefill onboarding. */
  pendingDisplayName: string | null;

  /** JWT tenant boundary (maps mobile workspace → backend tenant). */
  tenantPublicId: string | null;
  /** Active workspace label from JWT / account overview. */
  tenantDisplayName: string | null;
  membershipRole: string | null;
  /** Dev skip / test workspace: use local mock data even when API URL is set. */
  isLocalDemoWorkspace: boolean;

  /** Apply backend AuthResponse / Me after register, login, or bootstrap. */
  applyAuthSession: (session: AuthSession) => void;
  signInDemo: (email: string, options?: { displayNameHint?: string }) => void;
  signOutDemo: () => void;
  /** Clears local session (call logoutAccount before this when API is configured). */
  clearLocalSession: () => void;
  /** Developer shortcut to demo workspace. */
  jumpToWorkspaceDemo: () => void;

  setProfileBasics: (value: CreatorProfileBasics) => void;
  acceptCompliance: (agentSendMode?: AgentSendMode) => void;
  /** Inbox setup completed. */
  completeEmailWizard: (mailbox?: string) => void;
  /** Inbox setup skipped for later. */
  skipEmailWizard: () => void;
  /** Rate card setup completed during onboarding. */
  completeRateCardStep: () => void;
  /** Rate card setup skipped during onboarding. */
  skipRateCardStep: () => void;
  acknowledgePlan: () => void;
  /** Caller should ensure required steps are complete. */
  finalizeOnboarding: () => void;

  dismissProductTour: () => void;

  setAgentSendMode: (mode: AgentSendMode) => void;
  setCreatorFocusMode: (mode: CreatorFocusMode) => void;
  setClassificationStrictness: (strictness: ClassificationStrictness) => void;
  setInboxReclassificationActive: (active: boolean) => void;
  completeInboxFilterStep: (strictness: ClassificationStrictness) => void;
  setAuthBootstrapReady: (ready: boolean) => void;

  /** Keep auth state while replaying onboarding. */
  replayOnboardingDemo: () => void;

  resetDemoSession: () => void;
};

const initialSession = {
  isAuthenticated: false,
  accountEmail: null as string | null,
  pendingDisplayName: null as string | null,
  tenantPublicId: null as string | null,
  tenantDisplayName: null as string | null,
  membershipRole: null as string | null,
  isLocalDemoWorkspace: false,
  profileBasics: null as CreatorProfileBasics | null,
  complianceAcceptedAt: null as string | null,
  agentSendMode: null as AgentSendMode | null,
  creatorFocusMode: 'quiet' as CreatorFocusMode,
  classificationStrictness: 'standard' as ClassificationStrictness,
  inboxReclassificationActive: false,
  inboxFilterStepFinished: false,
  emailWizardFinished: false,
  emailSkipped: false,
  rateCardStepFinished: false,
  rateCardSkipped: false,
  mailboxConnection: null as MailboxConnection | null,
  planAcknowledged: false,
  onboardingComplete: false,
  productTourDismissed: false,
  authBootstrapReady: !isApiConfigured(),
};

const sessionStateCreator: (
  set: (partial: Partial<SessionState> | ((state: SessionState) => Partial<SessionState>)) => void,
  get: () => SessionState
) => SessionState = (set, get) => ({
  ...initialSession,

  applyAuthSession: (session) => set(mapAuthSessionToStore(session)),

  signInDemo: (email, options) =>
    set({
      isAuthenticated: true,
      accountEmail: email.trim(),
      pendingDisplayName: options?.displayNameHint?.trim() || null,
    }),

  signOutDemo: () => {
    get().clearLocalSession();
  },

  clearLocalSession: () => {
    useDraftApprovalStore.getState().resetDraftApprovals();
    set((state) => ({ ...initialSession, authBootstrapReady: state.authBootstrapReady }));
  },

  jumpToWorkspaceDemo: () =>
    set({
      isAuthenticated: true,
      isLocalDemoWorkspace: true,
      accountEmail: 'demo@bioby.ai',
      pendingDisplayName: null,
      tenantPublicId: null,
      tenantDisplayName: null,
      membershipRole: null,
      profileBasics: {
        displayName: 'Mia Skin Notes',
        niche: 'Skincare reviews / Sensitive skin',
        platforms: ['YouTube', 'TikTok', 'Instagram'],
        profileUrl: 'https://www.tiktok.com/@skin.notes',
        platform: 'tiktok',
        platformLabel: 'TikTok',
        handle: 'skin.notes',
        bio: 'Skincare creator focused on sensitive-skin trials and clear ingredient stories.',
        nicheTags: ['Skincare reviews', 'Sensitive skin'],
        followerCountLabel: '128k followers',
        confidence: 'high',
        platformProfiles: {
          youtube: {
            platform: 'youtube',
            status: 'linked',
            profileUrl: 'https://www.youtube.com/@MiaSkinNotes',
            handle: 'MiaSkinNotes',
            followerCountLabel: '72k subscribers',
            confidence: 'high',
          },
          tiktok: {
            platform: 'tiktok',
            status: 'linked',
            profileUrl: 'https://www.tiktok.com/@skin.notes',
            handle: 'skin.notes',
            followerCountLabel: '128k followers',
            confidence: 'high',
          },
          instagram: {
            platform: 'instagram',
            status: 'linked',
            profileUrl: 'https://www.instagram.com/miaskinnotes',
            handle: 'miaskinnotes',
            followerCountLabel: '145k followers',
            confidence: 'high',
          },
        },
      },
      complianceAcceptedAt: new Date().toISOString(),
      agentSendMode: 'agent_assist',
      creatorFocusMode: 'quiet',
      classificationStrictness: 'standard',
      inboxFilterStepFinished: true,
      emailWizardFinished: true,
      emailSkipped: false,
      rateCardStepFinished: true,
      rateCardSkipped: false,
      mailboxConnection: {
        email: 'brand@demo.bioby.ai',
        method: 'smtp',
        connectedAt: new Date().toISOString(),
      },
      planAcknowledged: true,
      onboardingComplete: true,
    }),

  setProfileBasics: (value) => set({ profileBasics: value, pendingDisplayName: null }),

  acceptCompliance: (agentSendMode = 'agent_assist') =>
    set({ complianceAcceptedAt: new Date().toISOString(), agentSendMode }),

  completeEmailWizard: (mailbox) =>
    set((state) => ({
      emailWizardFinished: true,
      emailSkipped: false,
      mailboxConnection: {
        email: (mailbox ?? state.accountEmail ?? 'mailbox@example.com').trim(),
        method: 'smtp',
        connectedAt: new Date().toISOString(),
      },
    })),

  skipEmailWizard: () =>
    set({
      emailWizardFinished: true,
      emailSkipped: true,
      mailboxConnection: null,
    }),

  completeRateCardStep: () =>
    set({
      rateCardStepFinished: true,
      rateCardSkipped: false,
    }),

  skipRateCardStep: () =>
    set({
      rateCardStepFinished: true,
      rateCardSkipped: true,
    }),

  acknowledgePlan: () => set({ planAcknowledged: true }),

  finalizeOnboarding: () => {
    const s = get();
    if (
      !s.profileBasics ||
      !s.complianceAcceptedAt ||
      !s.inboxFilterStepFinished ||
      !s.emailWizardFinished ||
      !s.rateCardStepFinished
    ) {
      return;
    }
    set({ onboardingComplete: true, planAcknowledged: true });
  },

  dismissProductTour: () => set({ productTourDismissed: true }),

  setAgentSendMode: (mode) => set({ agentSendMode: mode }),
  setCreatorFocusMode: (mode) => set({ creatorFocusMode: mode }),
  setClassificationStrictness: (strictness) => set({ classificationStrictness: strictness }),
  setInboxReclassificationActive: (active) => set({ inboxReclassificationActive: active }),
  completeInboxFilterStep: (strictness) =>
    set({ classificationStrictness: strictness, inboxFilterStepFinished: true }),
  setAuthBootstrapReady: (ready) => set({ authBootstrapReady: ready }),

  replayOnboardingDemo: () =>
    set((state) => ({
      ...state,
      profileBasics: null,
      complianceAcceptedAt: null,
      agentSendMode: null,
      classificationStrictness: 'standard',
      inboxFilterStepFinished: false,
      emailWizardFinished: false,
      emailSkipped: false,
      rateCardStepFinished: false,
      rateCardSkipped: false,
      mailboxConnection: null,
      planAcknowledged: false,
      onboardingComplete: false,
      productTourDismissed: false,
    })),

  resetDemoSession: () => {
    get().clearLocalSession();
  },
});

/** Web: persist onboarding progress across refresh (JWT lives in AsyncStorage separately). */
const persistSessionOnWeb = Platform.OS === 'web' && ( __DEV__ || isApiConfigured() );

export const useSessionStore = persistSessionOnWeb
  ? create<SessionState>()(
      persist(sessionStateCreator, {
        name: isApiConfigured() ? 'bioby-session-api-v1' : 'bioby-session-dev-v1',
        storage: createJSONStorage(() => sessionStorage),
        partialize: (s) => ({
          isAuthenticated: s.isAuthenticated,
          accountEmail: s.accountEmail,
          pendingDisplayName: s.pendingDisplayName,
          tenantPublicId: s.tenantPublicId,
          tenantDisplayName: s.tenantDisplayName,
          membershipRole: s.membershipRole,
          isLocalDemoWorkspace: s.isLocalDemoWorkspace,
          profileBasics: s.profileBasics,
          complianceAcceptedAt: s.complianceAcceptedAt,
          agentSendMode: s.agentSendMode,
          creatorFocusMode: s.creatorFocusMode,
          classificationStrictness: s.classificationStrictness,
          inboxFilterStepFinished: s.inboxFilterStepFinished,
          emailWizardFinished: s.emailWizardFinished,
          emailSkipped: s.emailSkipped,
          rateCardStepFinished: s.rateCardStepFinished,
          rateCardSkipped: s.rateCardSkipped,
          mailboxConnection: s.mailboxConnection,
          planAcknowledged: s.planAcknowledged,
          onboardingComplete: s.onboardingComplete,
          productTourDismissed: s.productTourDismissed,
        }),
      })
    )
  : create<SessionState>()(sessionStateCreator);
