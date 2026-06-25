import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';

import { ApiError } from '@/src/api/api-client';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import { useDealPacket } from '@/src/hooks/use-deal-packet';
import { useInboxThreadDetail } from '@/src/hooks/use-inbox-thread-detail';
import { useInboxThreads } from '@/src/hooks/use-inbox-threads';
import { useContractSummaryEditor } from '@/src/hooks/use-contract-summary-editor';
import { localizePacketTermLabel } from '@/src/lib/deal-copy-i18n';
import { buildDealPanelTermLines, mergeDealPanelDeliverables } from '@/src/lib/deal-panel-fields';
import { pickContractPdf } from '@/src/lib/pick-contract-pdf';
import { alertAction, confirmAction } from '@/src/lib/app-dialog';
import { useTenantQueryKey } from '@/src/lib/tenant-query';
import type { ContractSummaryCardProps } from '@/components/deals/ContractSummaryCard';
import type { DealSummary } from '@/src/types/domain';

export function useDealTermsAndContract(
  deal: DealSummary | undefined,
  options?: { emailMessageId?: string; emailQueryKey?: unknown[] },
) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const apiMode = shouldUseBackendApi();

  const packetQuery = useDealPacket(deal?.id);
  const inboxThreads = useInboxThreads();
  const matchedThreadId = useMemo(
    () =>
      deal?.opportunityThreadId ??
      inboxThreads.data?.find((row) => row.brandName === deal?.brandPlaceholder)?.id,
    [deal?.opportunityThreadId, deal?.brandPlaceholder, inboxThreads.data],
  );
  const threadQuery = useInboxThreadDetail(matchedThreadId);
  const threadQueryKey = useTenantQueryKey('inbox', 'thread', matchedThreadId, { api: apiMode });
  const thread = threadQuery.data;
  const packet = packetQuery.data?.packet;
  const deliverables = packet?.deliverables ?? [];

  const contractEditor = useContractSummaryEditor({
    opportunityId: matchedThreadId,
    saved: thread?.contractSummary ?? null,
    queryClient,
    threadQueryKey,
    emailMessageId: options?.emailMessageId,
    emailQueryKey: options?.emailQueryKey,
  });

  const termLines = useMemo(
    () => (deal ? buildDealPanelTermLines(deal, thread) : []),
    [deal, thread],
  );
  const deliverableLines = useMemo(
    () =>
      mergeDealPanelDeliverables(
        thread,
        deliverables,
        contractEditor.displayed?.deliverables,
        (row) => {
          const label = localizePacketTermLabel(row.label, t);
          return row.value.trim() ? `${label}: ${row.value}` : label;
        },
      ),
    [thread, deliverables, contractEditor.displayed?.deliverables, t],
  );
  const usageRights = thread?.usageRights ?? contractEditor.displayed?.usageRights ?? [];

  const showContractBlock =
    !!matchedThreadId &&
    (apiMode ||
      !!contractEditor.displayed ||
      contractEditor.parsing ||
      !!thread?.contractSummary);

  const uploadContractPdf = async () => {
    if (!matchedThreadId) {
      void alertAction(t('contractSummary.title'), t('contractSummary.missingThread'));
      return;
    }
    try {
      const picked = await pickContractPdf();
      if (!picked) return;
      await contractEditor.parseFromUpload(picked);
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : t('contractSummary.failed');
      void alertAction(t('contractSummary.title'), message);
    }
  };

  const saveContractSummary = async () => {
    try {
      await contractEditor.saveDraft();
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : t('contractSummary.failed');
      void alertAction(t('contractSummary.title'), message);
    }
  };

  const deleteSavedContract = async () => {
    const ok = await confirmAction({
      title: t('contractSummary.deleteConfirmTitle'),
      message: t('contractSummary.deleteContractConfirmMessage'),
      confirmLabel: t('contractSummary.deleteConfirmAction'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await contractEditor.deleteSavedContract();
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : t('contractSummary.failed');
      void alertAction(t('contractSummary.title'), message);
    }
  };

  const showDeleteSavedContract =
    !!contractEditor.saved?.persisted && !contractEditor.unsaved && !contractEditor.draft;

  const contractCardProps: ContractSummaryCardProps = {
    embedded: true,
    collapsible: true,
    saveLayout: 'contract',
    summary: contractEditor.displayed,
    loading: contractEditor.parsing,
    saving: contractEditor.saving,
    savingTarget: contractEditor.savingTarget,
    deleting: contractEditor.deleting,
    unsaved: contractEditor.unsaved,
    editable: !!contractEditor.displayed && contractEditor.displayed.status !== 'FAILED',
    onChange: contractEditor.patchDraft,
    onSave: () => void saveContractSummary(),
    onCancel: contractEditor.cancelDraft,
    onDelete: showDeleteSavedContract ? () => void deleteSavedContract() : undefined,
    onUploadPdf: matchedThreadId && apiMode ? () => void uploadContractPdf() : undefined,
    uploadDisabled: contractEditor.parsing || contractEditor.saving || contractEditor.deleting,
  };

  return {
    loading: packetQuery.isLoading || threadQuery.isLoading,
    matchedThreadId,
    termLines,
    deliverableLines,
    usageRights,
    showContractBlock,
    contractCardProps,
    contractEditor,
    deleteSavedContract,
  };
}
