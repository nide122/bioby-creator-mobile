import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Linking, Platform } from 'react-native';

import type { DeadlineEntityType } from '@/src/lib/deadline-reminder.shared';
import { parseDeadlineInstant } from '@/src/lib/deadline-reminder.shared';

export type DeadlineIcsEventInput = {
  entityType: DeadlineEntityType;
  entityId: string;
  deadlineAtISO: string;
  summary: string;
  description?: string;
};

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

export function formatIcsUtcInstant(iso: string): string | null {
  const ms = parseDeadlineInstant(iso);
  if (ms == null) {
    return null;
  }
  return new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

export function buildDeadlineIcsContent(input: DeadlineIcsEventInput, now: Date = new Date()): string | null {
  const start = formatIcsUtcInstant(input.deadlineAtISO);
  if (!start) {
    return null;
  }
  const stamp = formatIcsUtcInstant(now.toISOString());
  if (!stamp) {
    return null;
  }
  const uid = `bioby-deadline-${input.entityType}-${input.entityId}@bioby.ai`;
  const summary = escapeIcsText(input.summary.trim() || 'Bioby deadline');
  const description = input.description?.trim()
    ? `DESCRIPTION:${escapeIcsText(input.description.trim())}\r\n`
    : '';

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Bioby Creator//Deadline Export//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${start}`,
    `SUMMARY:${summary}`,
    description.trimEnd(),
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n');
}

function deadlineIcsFilename(entityType: DeadlineEntityType, entityId: string): string {
  return `bioby-deadline-${entityType}-${entityId}.ics`;
}

export async function exportAndShareDeadlineIcs(input: DeadlineIcsEventInput): Promise<void> {
  const content = buildDeadlineIcsContent(input);
  if (!content) {
    throw new Error('INVALID_DEADLINE');
  }
  const filename = deadlineIcsFilename(input.entityType, input.entityId);

  if (Platform.OS === 'web') {
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const uri = URL.createObjectURL(blob);
    try {
      const link = document.createElement('a');
      link.href = uri;
      link.download = filename;
      link.click();
    } finally {
      URL.revokeObjectURL(uri);
    }
    return;
  }

  const uri = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(uri, content, { encoding: FileSystem.EncodingType.UTF8 });
  try {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: 'text/calendar', dialogTitle: filename });
      return;
    }
    await Linking.openURL(uri);
  } finally {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  }
}
