import { useCallback, useMemo, useRef, useState } from 'react';
import type { QueryClient } from '@tanstack/react-query';

import {
  deleteContractSummary,
  deleteEmailDocumentSummary,
  previewContractFromAttachment,
  previewContractFromUpload,
  removeDocumentSummary,
  saveContractSummary,
  saveEmailDocumentSummary,
  toSaveContractSummaryInput,
  upsertDocumentSummary,
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

function normalizeAttachmentId(attachmentId?: string): string | undefined {
  return typeof attachmentId === 'string' && attachmentId.length > 0 ? attachmentId : undefined;
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
  const [uploadDraft, setUploadDraft] = useState<ContractSummary | null>(null);
  const [attachmentDrafts, setAttachmentDrafts] = useState<Record<string, ContractSummary>>({});
  const [parsingAttachmentIds, setParsingAttachmentIds] = useState<string[]>([]);
  const [parsingUpload, setParsingUpload] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [savingTarget, setSavingTarget] = useState<'contract' | 'document' | null>(null);
  const cancelledAttachmentParseRef = useRef<Set<string>>(new Set());
  const cancelledUploadParseRef = useRef(false);

  const draft = uploadDraft;
  const displayed = uploadDraft ?? saved ?? null;
  const parsing = parsingUpload;
  const unsaved = useMemo(() => {
    if (!uploadDraft) return false;
    if (uploadDraft.status === 'DRAFT' || !uploadDraft.persisted) return true;
    return saved ? !summariesEqual(uploadDraft, saved) : true;
  }, [uploadDraft, saved]);

  const isAttachmentDraftUnsaved = useCallback(
    (attachmentId: string) => !!attachmentDrafts[attachmentId],
    [attachmentDrafts]
  );

  const isAttachmentParsing = useCallback(
    (attachmentId: string) => parsingAttachmentIds.includes(attachmentId),
    [parsingAttachmentIds]
  );

  const patchDraft = useCallback(
    (patch: Partial<ContractSummary>) => {
      setUploadDraft((current) => {
        const base = cloneSummary(current ?? saved ?? ({} as ContractSummary));
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
    [emailMessageId, opportunityId, saved]
  );

  const patchAttachmentDraft = useCallback(
    (attachmentId: string, patch: Partial<ContractSummary>) => {
      setAttachmentDrafts((current) => {
        const base = cloneSummary(current[attachmentId] ?? ({} as ContractSummary));
        return {
          ...current,
          [attachmentId]: {
            ...base,
            ...patch,
            emailAttachmentId: attachmentId,
            emailMessageId: emailMessageId ?? base.emailMessageId,
            opportunityId: opportunityId ?? base.opportunityId,
            status: 'DRAFT',
            persisted: false,
          },
        };
      });
    },
    [emailMessageId, opportunityId]
  );

  const parseFromAttachment = useCallback(
    async (messageId: string, attachmentId: string) => {
      if (!opportunityId) return null;
      cancelledAttachmentParseRef.current.delete(attachmentId);
      setParsingAttachmentIds((current) =>
        current.includes(attachmentId) ? current : [...current, attachmentId]
      );
      try {
        const preview = await previewContractFromAttachment(opportunityId, messageId, attachmentId);
        if (cancelledAttachmentParseRef.current.has(attachmentId)) {
          return null;
        }
        setAttachmentDrafts((current) => ({
          ...current,
          [attachmentId]: {
            ...preview,
            emailMessageId: messageId,
            emailAttachmentId: attachmentId,
            status: 'DRAFT',
            persisted: false,
          },
        }));
        return preview;
      } finally {
        setParsingAttachmentIds((current) => current.filter((id) => id !== attachmentId));
      }
    },
    [opportunityId]
  );

  const parseFromUpload = useCallback(
    async (picked: PickedContractPdf) => {
      if (!opportunityId) return null;
      cancelledUploadParseRef.current = false;
      setParsingUpload(true);
      try {
        const preview = await previewContractFromUpload(opportunityId, picked);
        if (cancelledUploadParseRef.current) {
          return null;
        }
        setUploadDraft({
          ...preview,
          status: 'DRAFT',
          persisted: false,
        });
        return preview;
      } finally {
        setParsingUpload(false);
      }
    },
    [opportunityId]
  );

  const saveDraft = useCallback(
    async (attachmentId?: string) => {
      const id = normalizeAttachmentId(attachmentId);
      const activeDraft = id ? attachmentDrafts[id] : uploadDraft;
      if (!opportunityId || !activeDraft) return null;
      setSaving(true);
      setSavingTarget('contract');
      try {
        const payload: ContractSummary = {
          ...activeDraft,
          emailMessageId: activeDraft.emailMessageId ?? emailMessageId ?? null,
        };
        const persisted = await saveContractSummary(opportunityId, payload);
        if (id) {
          setAttachmentDrafts((current) => {
            const next = { ...current };
            delete next[id];
            return next;
          });
        } else {
          setUploadDraft(null);
        }
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
    },
    [attachmentDrafts, emailMessageId, opportunityId, queryClient, threadQueryKey, uploadDraft]
  );

  const saveDocumentDraft = useCallback(
    async (overrideMessageId?: string, attachmentId?: string) => {
      const messageId = overrideMessageId ?? emailMessageId ?? uploadDraft?.emailMessageId;
      const id = normalizeAttachmentId(attachmentId);
      const activeDraft = id ? attachmentDrafts[id] : uploadDraft;
      if (!messageId || !activeDraft) return null;
      const targetAttachmentId = id ?? activeDraft.emailAttachmentId;
      if (!targetAttachmentId) return null;
      setSaving(true);
      setSavingTarget('document');
      try {
        const persisted = await saveEmailDocumentSummary(messageId, {
          ...activeDraft,
          emailAttachmentId: targetAttachmentId,
        });
        if (id) {
          setAttachmentDrafts((current) => {
            const next = { ...current };
            delete next[id];
            return next;
          });
        } else {
          setUploadDraft(null);
        }
        if (queryClient && emailQueryKey) {
          queryClient.setQueryData<EmailMessageDetail>(emailQueryKey, (current) =>
            current
              ? {
                  ...current,
                  documentSummaries: upsertDocumentSummary(current.documentSummaries, persisted),
                }
              : current
          );
          await queryClient.invalidateQueries({ queryKey: emailQueryKey });
        }
        return persisted;
      } finally {
        setSaving(false);
        setSavingTarget(null);
      }
    },
    [attachmentDrafts, emailMessageId, emailQueryKey, queryClient, uploadDraft]
  );

  const cancelDraft = useCallback((attachmentId?: string) => {
    const id = normalizeAttachmentId(attachmentId);
    if (id) {
      cancelledAttachmentParseRef.current.add(id);
      setAttachmentDrafts((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      setParsingAttachmentIds((current) => current.filter((value) => value !== id));
      return;
    }
    cancelledUploadParseRef.current = true;
    setUploadDraft(null);
    setParsingUpload(false);
  }, []);

  const deleteSavedContract = useCallback(async () => {
    if (!opportunityId) return false;
    const linkedAttachmentId = saved?.emailAttachmentId;
    const linkedMessageId = saved?.emailMessageId ?? emailMessageId;
    setDeleting(true);
    try {
      await deleteContractSummary(opportunityId);
      setUploadDraft(null);
      if (queryClient && threadQueryKey) {
        queryClient.setQueryData<InboxThreadDetail>(threadQueryKey, (current) =>
          current ? { ...current, contractSummary: undefined } : current
        );
        await queryClient.invalidateQueries({ queryKey: threadQueryKey });
      }
      if (queryClient && emailQueryKey && linkedAttachmentId && linkedMessageId) {
        queryClient.setQueryData<EmailMessageDetail>(emailQueryKey, (current) =>
          current
            ? {
                ...current,
                documentSummaries: removeDocumentSummary(current.documentSummaries, linkedAttachmentId),
              }
            : current
        );
        await queryClient.invalidateQueries({ queryKey: emailQueryKey });
      }
      return true;
    } finally {
      setDeleting(false);
    }
  }, [emailMessageId, emailQueryKey, opportunityId, queryClient, saved, threadQueryKey]);

  const deleteSavedDocument = useCallback(
    async (overrideMessageId?: string, attachmentId?: string) => {
      const messageId = overrideMessageId ?? emailMessageId ?? uploadDraft?.emailMessageId;
      const targetAttachmentId = attachmentId ?? uploadDraft?.emailAttachmentId;
      if (!messageId || !targetAttachmentId) return false;
      setDeleting(true);
      try {
        await deleteEmailDocumentSummary(messageId, targetAttachmentId);
        setAttachmentDrafts((current) => {
          if (!attachmentId) return current;
          const next = { ...current };
          delete next[attachmentId];
          return next;
        });
        if (queryClient && emailQueryKey) {
          queryClient.setQueryData<EmailMessageDetail>(emailQueryKey, (current) =>
            current
              ? {
                  ...current,
                  documentSummaries: removeDocumentSummary(current.documentSummaries, targetAttachmentId),
                }
              : current
          );
          await queryClient.invalidateQueries({ queryKey: emailQueryKey });
        }
        return true;
      } finally {
        setDeleting(false);
      }
    },
    [emailMessageId, emailQueryKey, queryClient, uploadDraft?.emailAttachmentId]
  );

  const beginEditingSaved = useCallback(() => {
    if (!saved) return;
    setUploadDraft(cloneSummary(saved));
  }, [saved]);

  return {
    displayed,
    savedDocument,
    draft: uploadDraft,
    attachmentDrafts,
    parsingAttachmentIds,
    isAttachmentParsing,
    saved,
    parsing,
    saving,
    deleting,
    savingTarget,
    unsaved,
    isAttachmentDraftUnsaved,
    patchDraft,
    patchAttachmentDraft,
    parseFromAttachment,
    parseFromUpload,
    saveDraft,
    saveDocumentDraft,
    cancelDraft,
    deleteSavedContract,
    deleteSavedDocument,
    beginEditingSaved,
    setDraft: setUploadDraft,
  };
}
