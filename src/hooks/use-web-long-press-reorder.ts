import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { reorderRateCardPackages } from '@/src/lib/rate-card-package-reorder';
import type { RateCardPackage } from '@/src/types/domain';

export const WEB_LONG_PRESS_MS = 200;

export type WebDragPointer = { x: number; y: number };
export type WebDragSize = { width: number; height: number };

type PendingDrag = {
  packageId: string;
  eventTarget: EventTarget | null;
  clientX: number;
  clientY: number;
};

export function resolvePackageCardElement(from: EventTarget | null | undefined): HTMLElement | null {
  let node = from as HTMLElement | null;
  while (node) {
    if (node.dataset?.packageCard) return node;
    node = node.parentElement;
  }
  return null;
}

export function findPackageIdAtPointer(clientX: number, clientY: number): string | null {
  if (typeof document === 'undefined') return null;

  const elements =
    typeof document.elementsFromPoint === 'function'
      ? document.elementsFromPoint(clientX, clientY)
      : [document.elementFromPoint(clientX, clientY)].filter(Boolean);

  for (const element of elements) {
    let node = element as HTMLElement | null;
    while (node) {
      if (node.dataset?.dragGhost === 'true') break;
      const id = node.dataset?.packageId;
      if (id) return id;
      node = node.parentElement;
    }
  }
  return null;
}

export function measurePackageCard(
  packageId: string,
  clientX: number,
  clientY: number,
  eventTarget?: EventTarget | null,
) {
  const card =
    resolvePackageCardElement(eventTarget) ??
    (typeof document !== 'undefined'
      ? document.querySelector<HTMLElement>(`[data-package-card="${packageId}"]`)
      : null);
  const rect = card?.getBoundingClientRect();
  if (!rect) {
    return {
      ghostSize: { width: 320, height: 112 } satisfies WebDragSize,
      grabOffset: { x: 24, y: 28 } satisfies WebDragPointer,
    };
  }
  return {
    ghostSize: { width: rect.width, height: rect.height } satisfies WebDragSize,
    grabOffset: { x: clientX - rect.left, y: clientY - rect.top } satisfies WebDragPointer,
  };
}

export function previewWebPackageOrder(
  packages: RateCardPackage[],
  draggingId: string | null,
  dragOverId: string | null,
): RateCardPackage[] {
  if (!draggingId || !dragOverId || draggingId === dragOverId) return packages;
  return reorderRateCardPackages(packages, draggingId, dragOverId);
}

export function useWebLongPressPackageReorder(
  orderedPackages: RateCardPackage[],
  onReorder: (next: RateCardPackage[]) => void,
) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [grabOffset, setGrabOffset] = useState<WebDragPointer>({ x: 24, y: 28 });
  const [ghostSize, setGhostSize] = useState<WebDragSize>({ width: 320, height: 112 });
  const [ghostActive, setGhostActive] = useState(false);
  const [ghostSeedPointer, setGhostSeedPointer] = useState<WebDragPointer | null>(null);
  const [suppressCardPress, setSuppressCardPress] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDragRef = useRef<PendingDrag | null>(null);
  const pendingPointerMoveRef = useRef<((event: PointerEvent) => void) | null>(null);
  const pendingPointerEndRef = useRef<(() => void) | null>(null);
  const dragOverIdRef = useRef<string | null>(null);
  const draggingIdRef = useRef<string | null>(null);
  const orderedPackagesRef = useRef(orderedPackages);
  orderedPackagesRef.current = orderedPackages;
  draggingIdRef.current = draggingId;

  const stopPendingPointerTrack = useCallback(() => {
    if (pendingPointerMoveRef.current) {
      window.removeEventListener('pointermove', pendingPointerMoveRef.current);
      pendingPointerMoveRef.current = null;
    }
    if (pendingPointerEndRef.current) {
      window.removeEventListener('pointerup', pendingPointerEndRef.current);
      window.removeEventListener('pointercancel', pendingPointerEndRef.current);
      pendingPointerEndRef.current = null;
    }
  }, []);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current !== null) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    pendingDragRef.current = null;
    stopPendingPointerTrack();
  }, [stopPendingPointerTrack]);

  const clearDragState = useCallback(() => {
    clearLongPressTimer();
    dragOverIdRef.current = null;
    setDraggingId(null);
    setDragOverId(null);
    setGhostActive(false);
    setGhostSeedPointer(null);
  }, [clearLongPressTimer]);

  const activateDrag = useCallback(
    (pending: PendingDrag) => {
      const measured = measurePackageCard(pending.packageId, pending.clientX, pending.clientY, pending.eventTarget);
      setGrabOffset(measured.grabOffset);
      setGhostSize(measured.ghostSize);
      setGhostSeedPointer({ x: pending.clientX, y: pending.clientY });
      dragOverIdRef.current = pending.packageId;
      setDraggingId(pending.packageId);
      setDragOverId(pending.packageId);
      setGhostActive(true);
      setSuppressCardPress(true);
      stopPendingPointerTrack();
    },
    [stopPendingPointerTrack],
  );

  const onCardPointerDown = useCallback(
    (packageId: string, clientX: number, clientY: number, eventTarget?: EventTarget | null) => {
      if (Platform.OS !== 'web') return;
      if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return;

      clearLongPressTimer();

      const pending: PendingDrag = {
        packageId,
        eventTarget: eventTarget ?? null,
        clientX,
        clientY,
      };
      pendingDragRef.current = pending;

      const onPointerMove = (event: PointerEvent) => {
        if (!pendingDragRef.current || pendingDragRef.current.packageId !== packageId) return;
        pendingDragRef.current = {
          ...pendingDragRef.current,
          clientX: event.clientX,
          clientY: event.clientY,
        };
      };
      pendingPointerMoveRef.current = onPointerMove;
      window.addEventListener('pointermove', onPointerMove);

      const onPointerEnd = () => {
        if (!draggingIdRef.current) clearLongPressTimer();
      };
      pendingPointerEndRef.current = onPointerEnd;
      window.addEventListener('pointerup', onPointerEnd);
      window.addEventListener('pointercancel', onPointerEnd);

      longPressTimerRef.current = setTimeout(() => {
        longPressTimerRef.current = null;
        const snapshot = pendingDragRef.current;
        if (!snapshot || snapshot.packageId !== packageId) return;
        activateDrag(snapshot);
      }, WEB_LONG_PRESS_MS);
    },
    [activateDrag, clearLongPressTimer],
  );

  useEffect(() => {
    return () => clearLongPressTimer();
  }, [clearLongPressTimer]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !draggingId) return;

    const previousCursor = document.body.style.cursor;
    document.body.style.cursor = 'grabbing';
    let frame = 0;
    let lastEvent: PointerEvent | null = null;

    const flushPointer = () => {
      frame = 0;
      if (!lastEvent) return;
      const overId = findPackageIdAtPointer(lastEvent.clientX, lastEvent.clientY) ?? draggingId;
      if (dragOverIdRef.current !== overId) {
        dragOverIdRef.current = overId;
        setDragOverId(overId);
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      lastEvent = event;
      if (!frame) {
        frame = window.requestAnimationFrame(flushPointer);
      }
    };

    const finishDrag = (event: PointerEvent) => {
      if (frame) {
        window.cancelAnimationFrame(frame);
        frame = 0;
      }
      const fromId = draggingId;
      const toId = findPackageIdAtPointer(event.clientX, event.clientY);
      clearDragState();
      setSuppressCardPress(true);
      window.setTimeout(() => setSuppressCardPress(false), 250);
      if (fromId && toId && fromId !== toId) {
        onReorder(reorderRateCardPackages(orderedPackagesRef.current, fromId, toId));
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', finishDrag);
    window.addEventListener('pointercancel', finishDrag);

    return () => {
      document.body.style.cursor = previousCursor;
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', finishDrag);
      window.removeEventListener('pointercancel', finishDrag);
    };
  }, [clearDragState, draggingId, onReorder]);

  return {
    draggingId,
    dragOverId,
    grabOffset,
    ghostSize,
    ghostActive,
    ghostSeedPointer,
    suppressCardPress,
    isDragging: draggingId !== null,
    onCardPointerDown,
    clearDragState,
  };
}
