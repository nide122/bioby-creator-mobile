import { useCallback, useMemo, useState } from 'react';
import type { QueryClient } from '@tanstack/react-query';

import {
  previewContractFromAttachment,
  previewContractFromUpload,
  saveContractSummary,
  saveEmailDocumentSummary,
  toSaveContractSummaryInput,
  type ContractSummary,
} from '@/src/api/contract-summary-api';
import type { EmailMessageDetail } from '@/src/api/mailbox-api';
import type { PickedContractPdf } from '@/src/lib/pick-contract-pdf';
import type { InboxThreadDetail } from '@/src/types/domain';

function cloneSummary(summary: ContractSummary): ContractSummary {
  return {
    ...summary,
    deliverables: [...(summary.deliverables ?? [])],
    usageRights: [...(summary.usageRights ?? [])],
    deadlines: [...(summary.deadlines ?? [])],
    riskFlags: summary.riskFlags?.map((flag) => ({ ...flag })),
  };
}

function summariesEqual(a: ContractSummary | null | undefined, b: ContractSummary | null | undefined): boolean {
  if (!a || !b) return false;
  return JSON.stringify(toSaveContractSummaryInput(a)) === JSON.stringify(toSaveContractSummaryInput(b));
}

type Options = {
  opportunityId?: string;
  saved?: ContractSummary | null;
  queryClient?: QueryClient;
  threadQueryKey?: unknown[];
  emailMessageId?: string;
  savedDocument?: ContractSummary | null;
  emailQueryKey?: unknown[];
};

export function useContractSummaryEditor({
  opportunityId,
  saved,
  queryClient,
  threadQueryKey,
  emailMessageId,
  savedDocument,
  emailQueryKey,
}: Options) {
  const [draft, setDraft] = useState<ContractSummary | null>(null);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingTarget, setSavingTarget] = useState<'contract' | 'document' | null>(null);

  const displayed = draft ?? saved ?? null;
  const unsaved = useMemo(() => {
    if (!draft) return false;
    if (draft.status === 'DRAFT' || !draft.persisted) return true;
    return saved ? !summariesEqual(draft, saved) : true;
  }, [draft, saved]);

  const patchDraft = useCallback(
    (patch: Partial<ContractSummary>) => {
      setDraft((current) => {
        const base = cloneSummary(current ?? saved ?? draft ?? ({} as ContractSummary));
        return {
          ...base,
          ...patch,
          opportunityId: opportunityId ?? base.opportunityId,
          emailMessageId: emailMessageId ?? base.emailMessageId,
          status: 'DRAFT',
          persisted: false,
        };
      });
    },
    [draft, emailMessageId, opportunityId, saved]
  );

  const parseFromAttachment = useCallback(
    async (messageId: string, attachmentId: string) => {
      if (!opportunityId) return null;
      setParsing(true);
      try {
        const preview = await previewContractFromAttachment(opportunityId, messageId, attachmentId);
        setDraft({
          ...preview,
          emailMessageId: messageId,
          emailAttachmentId: attachmentId,
        });
        return preview;
      } finally {
        setParsing(false);
      }
    },
    [opportunityId]
  );

  const parseFromUpload = useCallback(
    async (picked: PickedContractPdf) => {
      if (!opportunityId) return null;
      setParsing(true);
      try {
        const preview = await previewContractFromUpload(opportunityId, picked);
        setDraft(preview);
        return preview;
      } finally {
        setParsing(false);
      }
    },
    [opportunityId]
  );

  const saveDraft = useCallback(async () => {
    if (!opportunityId || !draft) return null;
    setSaving(true);
    setSavingTarget('contract');
    try {
      const payload: ContractSummary = {
        ...draft,
        emailMessageId: draft.emailMessageId ?? emailMessageId ?? null,
      };
      const persisted = await saveContractSummary(opportunityId, payload);
      setDraft(null);
      if (queryClient && threadQueryKey) {
        queryClient.setQueryData<InboxThreadDetail>(threadQueryKey, (current) =>
          current ? { ...current, contractSummary: persisted } : current
        );
        await queryClient.invalidateQueries({ queryKey: threadQueryKey });
      }
      return persisted;
    } finally {
      setSaving(false);
      setSavingTarget(null);
    }
  }, [draft, emailMessageId, opportunityId, queryClient, threadQueryKey]);

  const saveDocumentDraft = useCallback(async (overrideMessageId?: string) => {
    const messageId = overrideMessageId ?? emailMessageId ?? draft?.emailMessageId;
    if (!messageId || !draft) return null;
    setSaving(true);
    setSavingTarget('document');
    try {
      const persisted = await saveEmailDocumentSummary(messageId, draft);
      setDraft(null);
      if (queryClient && emailQueryKey) {
        queryClient.setQueryData<EmailMessageDetail>(emailQueryKey, (current) =>
          current ? { ...current, documentSummary: persisted } : current
        );
        await queryClient.invalidateQueries({ queryKey: emailQueryKey });
      }
      return persisted;
    } finally {
      setSaving(false);
      setSavingTarget(null);
    }
  }, [draft, emailMessageId, emailQueryKey, queryClient]);

  const cancelDraft = useCallback(() => {
    setDraft(null);
  }, []);

  const beginEditingSaved = useCallback(() => {
    if (!saved) return;
    setDraft(cloneSummary(saved));
  }, [saved]);

  return {
    displayed,
    savedDocument,
    draft,
    saved,
    parsing,
    saving,
    savingTarget,
    unsaved,
    patchDraft,
    parseFromAttachment,
    parseFromUpload,
    saveDraft,
    saveDocumentDraft,
    cancelDraft,
    beginEditingSaved,
    setDraft,
  };
}
