import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';

import { radii } from '@/constants/tokens';
import type { WebDragPointer, WebDragSize } from '@/src/hooks/use-web-long-press-reorder';

type ShellProps = {
  active: boolean;
  grabOffset: WebDragPointer;
  ghostSize: WebDragSize;
  seedPointer: WebDragPointer | null;
  children: ReactNode;
};

/** Positions drag preview with rAF so the package list does not re-render on every pointer move. */
export function WebPackageDragGhostShell({ active, grabOffset, ghostSize, seedPointer, children }: ShellProps) {
  const [pointer, setPointer] = useState<WebDragPointer | null>(seedPointer);
  const frameRef = useRef(0);
  const lastEventRef = useRef<PointerEvent | null>(null);

  useEffect(() => {
    if (active && seedPointer) {
      setPointer(seedPointer);
    }
    if (!active) {
      setPointer(null);
    }
  }, [active, seedPointer]);

  useEffect(() => {
    if (!active) return;

    const flush = () => {
      frameRef.current = 0;
      const event = lastEventRef.current;
      if (!event) return;
      setPointer({ x: event.clientX, y: event.clientY });
    };

    const onPointerMove = (event: PointerEvent) => {
      lastEventRef.current = event;
      if (!frameRef.current) {
        frameRef.current = window.requestAnimationFrame(flush);
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    };
  }, [active]);

  if (!active || !pointer) return null;

  const left = pointer.x - grabOffset.x;
  const top = pointer.y - grabOffset.y;

  const shell = (
    <View pointerEvents="none" dataSet={{ dragGhost: 'true' }} style={styles.content}>
      {children}
    </View>
  );

  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    return createPortal(
      <div
        data-drag-ghost="true"
        style={{
          position: 'fixed',
          left,
          top,
          width: ghostSize.width,
          zIndex: 10000,
          pointerEvents: 'none',
          transform: 'scale(1.02)',
          transformOrigin: 'top left',
          boxShadow: '0 10px 18px rgba(0, 0, 0, 0.18)',
        }}>
        {shell}
      </div>,
      document.body,
    );
  }

  return (
    <View
      pointerEvents="none"
      dataSet={{ dragGhost: 'true' }}
      style={[
        styles.shell,
        {
          left,
          top,
          width: ghostSize.width,
        },
      ]}>
      {children}
    </View>
  );
}

export function WebPackageDragPlaceholder({
  height,
  theme,
}: {
  height: number;
  theme: { border: string; secondary: string; primary: string };
}) {
  return (
    <View
      pointerEvents="none"
      style={[
        styles.placeholder,
        {
          height,
          borderColor: theme.border,
          backgroundColor: theme.secondary,
        },
      ]}>
      <View style={[styles.placeholderLine, { backgroundColor: theme.border }]} />
    </View>
  );
}

const ghostShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.18,
  shadowRadius: 18,
  elevation: 12,
} as ViewStyle;

const styles = StyleSheet.create({
  shell: {
    position: 'fixed',
    zIndex: 10000,
    transform: [{ scale: 1.02 }],
    ...ghostShadow,
  },
  content: {
    width: '100%',
  },
  placeholder: {
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderLine: {
    width: '42%',
    height: 3,
    borderRadius: 999,
    opacity: 0.85,
  },
});
