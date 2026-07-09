import { StyleSheet, Text, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Image as SvgImage,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg';

import { fontSize, spacing } from '@/constants/tokens';

const brandLogo = require('../../assets/images/brand-logo.png');

export const LANDING_BG = '#f8fafc';
export const LANDING_CARD = '#ffffff';
export const LANDING_BORDER = '#e2e8f0';
export const LANDING_MUTED = '#64748b';

export function LandingBackgroundAura() {
  return (
    <Svg pointerEvents="none" style={StyleSheet.absoluteFill} viewBox="0 0 390 844" fill="none">
      <Circle cx="352" cy="128" r="220" fill="url(#topAura)" />
      <Circle cx="34" cy="598" r="250" fill="url(#bottomAura)" />
      <Path
        d="M-26 328C48 286 112 292 168 334C230 380 292 358 416 258"
        stroke="url(#auraVein)"
        strokeWidth="1.2"
        strokeOpacity="0.16"
        strokeLinecap="round"
      />
      <Defs>
        <RadialGradient
          id="topAura"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(352 128) rotate(90) scale(220)">
          <Stop stopColor="#3b82f6" stopOpacity="0.14" />
          <Stop offset="1" stopColor="#3b82f6" stopOpacity="0" />
        </RadialGradient>
        <RadialGradient
          id="bottomAura"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(34 598) rotate(90) scale(250)">
          <Stop stopColor="#1e40af" stopOpacity="0.1" />
          <Stop offset="1" stopColor="#1e40af" stopOpacity="0" />
        </RadialGradient>
        <LinearGradient id="auraVein" x1="-26" y1="328" x2="416" y2="258" gradientUnits="userSpaceOnUse">
          <Stop stopColor="#3b82f6" />
          <Stop offset="0.56" stopColor="#2563eb" />
          <Stop offset="1" stopColor="#60a5fa" />
        </LinearGradient>
      </Defs>
    </Svg>
  );
}

/** Matches logo-color.svg layout so the mark keeps its designed inset. */
const BRAND_LOGO_VIEWBOX = 1024;
const BRAND_LOGO_INSET = { x: 147, y: 152, width: 727, height: 717 };

export function LandingBrandMark() {
  return (
    <View
      style={brandMarkStyles.frame}
      accessibilityRole="image"
      accessibilityLabel="BioBy logo">
      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${BRAND_LOGO_VIEWBOX} ${BRAND_LOGO_VIEWBOX}`}
        preserveAspectRatio="xMidYMid meet">
        <SvgImage
          x={BRAND_LOGO_INSET.x}
          y={BRAND_LOGO_INSET.y}
          width={BRAND_LOGO_INSET.width}
          height={BRAND_LOGO_INSET.height}
          href={brandLogo}
          preserveAspectRatio="xMidYMid meet"
        />
      </Svg>
    </View>
  );
}

const brandMarkStyles = StyleSheet.create({
  /** Transparent marks sit directly on the dark landing chrome. */
  frame: {
    width: 17,
    height: 17,
  },
});

type MineMapProps = {
  rateLabel: string;
  rateValue: string;
  rightsLabel: string;
  rightsValue: string;
  payoutLabel: string;
  payoutValue: string;
};

export function LandingMineMap({
  rateLabel,
  rateValue,
  rightsLabel,
  rightsValue,
  payoutLabel,
  payoutValue,
}: MineMapProps) {
  return (
    <View style={mineStyles.mapCard}>
      <Svg style={mineStyles.mapSvg} viewBox="0 0 330 130" fill="none">
        <Path
          d="M18 108C56 72 94 62 132 78C172 96 208 88 306 26"
          stroke="url(#vein)"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <Path
          d="M20 30C60 48 102 47 140 32C188 14 228 30 306 74"
          stroke="rgba(37, 99, 235, 0.12)"
          strokeWidth="1"
          strokeLinecap="round"
        />
        <Circle cx="76" cy="86" r="14" fill="#3b82f6" fillOpacity="0.12" />
        <Circle cx="76" cy="86" r="6" fill="#3b82f6" />
        <Circle cx="186" cy="74" r="14" fill="#2563eb" fillOpacity="0.12" />
        <Circle cx="186" cy="74" r="6" fill="#2563eb" />
        <Circle cx="272" cy="42" r="14" fill="#60a5fa" fillOpacity="0.12" />
        <Circle cx="272" cy="42" r="6" fill="#60a5fa" />
        <Defs>
          <LinearGradient id="vein" x1="18" y1="108" x2="306" y2="26" gradientUnits="userSpaceOnUse">
            <Stop stopColor="#3b82f6" />
            <Stop offset="0.52" stopColor="#2563eb" />
            <Stop offset="1" stopColor="#60a5fa" />
          </LinearGradient>
        </Defs>
      </Svg>
      <View style={mineStyles.chipRow}>
        <SignalChip label={rateLabel} value={rateValue} accent="#2563eb" />
        <SignalChip label={rightsLabel} value={rightsValue} accent="#1d4ed8" />
        <SignalChip label={payoutLabel} value={payoutValue} accent="#3b82f6" />
      </View>
    </View>
  );
}

function SignalChip({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <View style={mineStyles.chip}>
      <Text style={[mineStyles.chipLabel, { color: accent }]}>{label}</Text>
      <Text style={mineStyles.chipValue}>{value}</Text>
    </View>
  );
}

const mineStyles = StyleSheet.create({
  mapCard: {
    borderRadius: 28,
    backgroundColor: LANDING_CARD,
    borderWidth: 1,
    borderColor: LANDING_BORDER,
    overflow: 'hidden',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.08,
    shadowRadius: 36,
    elevation: 5,
  },
  mapSvg: { width: '100%', height: 146 },
  chipRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: LANDING_BORDER,
  },
  chip: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    borderRightWidth: 1,
    borderRightColor: LANDING_BORDER,
  },
  chipLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  chipValue: { color: '#111827', fontSize: fontSize.bodySmall, fontWeight: '800' },
});
