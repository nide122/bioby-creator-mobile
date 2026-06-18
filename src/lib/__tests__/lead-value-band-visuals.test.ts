import { leadValueBandAccent, leadValueBandBadgeTone } from '@/src/lib/lead-value-band-visuals';
import { palette } from '@/constants/tokens';

describe('lead-value-band-visuals', () => {
  const theme = palette.dark;

  it('maps bands to badge tones', () => {
    expect(leadValueBandBadgeTone('high_value')).toBe('mint');
    expect(leadValueBandBadgeTone('needs_negotiation')).toBe('warning');
    expect(leadValueBandBadgeTone('archived')).toBe('neutral');
  });

  it('uses mint accents for high value rows', () => {
    expect(leadValueBandAccent('high_value', theme).detailAccent).toBe(true);
    expect(leadValueBandAccent('high_value', theme).iconColor).toBe(theme.accentMintStrong);
  });

  it('uses amber accents for negotiation rows', () => {
    expect(leadValueBandAccent('needs_negotiation', theme).detailAccent).toBe(false);
    expect(leadValueBandAccent('needs_negotiation', theme).iconBg).toContain('250, 204, 21');
  });
});
