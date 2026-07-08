import {
  buildDeadlineIcsContent,
  formatIcsUtcInstant,
} from '@/src/lib/deadline-ics';

describe('deadline ics export', () => {
  it('formats UTC instants for ICS', () => {
    expect(formatIcsUtcInstant('2026-06-28T12:00:00Z')).toBe('20260628T120000Z');
  });

  it('builds a single-event calendar file', () => {
    const content = buildDeadlineIcsContent(
      {
        entityType: 'deal',
        entityId: '42',
        deadlineAtISO: '2026-06-28T12:00:00Z',
        summary: 'Post by: Summer launch',
        description: 'Publish by Friday',
      },
      new Date('2026-06-27T12:00:00Z'),
    );

    expect(content).toContain('BEGIN:VCALENDAR');
    expect(content).toContain('UID:bioby-deadline-deal-42@bioby.ai');
    expect(content).toContain('DTSTART:20260628T120000Z');
    expect(content).toContain('SUMMARY:Post by: Summer launch');
    expect(content).toContain('DESCRIPTION:Publish by Friday');
    expect(content).toContain('END:VCALENDAR');
  });

  it('returns null for invalid deadline', () => {
    expect(
      buildDeadlineIcsContent({
        entityType: 'opportunity',
        entityId: '7',
        deadlineAtISO: 'not-a-date',
        summary: 'Test',
      }),
    ).toBeNull();
  });
});
