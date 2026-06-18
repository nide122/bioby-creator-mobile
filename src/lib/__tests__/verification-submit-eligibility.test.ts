import {
  canSubmitVerification,
  evidenceStatusFromForm,
  isValidPostLink,
  mergeEvidenceStatuses,
} from '@/src/lib/verification-submit-eligibility';

describe('verification-submit-eligibility', () => {
  const base = {
    postLink: 'https://tiktok.com/@creator/video/1',
    screenshotAttested: true,
    firstDayMetrics: '120k views day one',
    creatorNote: 'Published with #ad pinned comment.',
  };

  it('requires post link, screenshot attestation, metrics, and note', () => {
    expect(canSubmitVerification(base, true)).toBe(true);
    expect(canSubmitVerification({ ...base, postLink: 'not-a-url' }, true)).toBe(false);
    expect(canSubmitVerification({ ...base, screenshotAttested: false }, true)).toBe(false);
    expect(canSubmitVerification({ ...base, firstDayMetrics: 'short' }, true)).toBe(false);
    expect(canSubmitVerification(base, false)).toBe(false);
  });

  it('tracks evidence readiness from the form before submit', () => {
    expect(
      evidenceStatusFromForm(
        { postLink: '', screenshotAttested: false, firstDayMetrics: '', creatorNote: '' },
        false,
      ),
    ).toEqual({
      'post-link': 'missing',
      screenshot: 'missing',
      metrics: 'missing',
    });
    expect(evidenceStatusFromForm(base, false)).toEqual({
      'post-link': 'done',
      screenshot: 'done',
      metrics: 'reviewing',
    });
  });

  it('validates http(s) post links', () => {
    expect(isValidPostLink('https://example.com/post')).toBe(true);
    expect(isValidPostLink('http://example.com/post')).toBe(true);
    expect(isValidPostLink('example.com/post')).toBe(false);
  });

  it('merges api evidence after submit', () => {
    const merged = mergeEvidenceStatuses(
      [{ id: 'post-link', status: 'done' }],
      evidenceStatusFromForm(base, true),
      true,
    );
    expect(merged.find((item) => item.id === 'post-link')?.status).toBe('done');
    expect(merged.find((item) => item.id === 'screenshot')?.status).toBe('done');
    expect(merged.find((item) => item.id === 'metrics')?.status).toBe('reviewing');
  });

  it('shows submitted defaults when api evidence is still missing', () => {
    const merged = mergeEvidenceStatuses(
      [
        { id: 'post-link', status: 'missing' },
        { id: 'screenshot', status: 'missing' },
        { id: 'metrics', status: 'missing' },
      ],
      {
        'post-link': 'missing',
        screenshot: 'missing',
        metrics: 'missing',
      },
      true,
    );
    expect(merged).toEqual([
      { id: 'post-link', status: 'done' },
      { id: 'screenshot', status: 'done' },
      { id: 'metrics', status: 'reviewing' },
    ]);
  });
});
