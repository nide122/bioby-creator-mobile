import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { BILIBILI_PATH, XIAOHONGSHU_PATH } from '@/src/lib/platform-brand-paths';
import { resolvePlatformIconKey, type PlatformIconKey } from '@/src/lib/platform-icon-key';

type Props = {
  platform: string;
  size?: number;
};

const BRAND_COLORS: Record<PlatformIconKey, string> = {
  youtube: '#FF0000',
  instagram: '#E4405F',
  tiktok: '#010101',
  xiaohongshu: '#FF2442',
  bilibili: '#00A1D6',
  douyin: '#111111',
  twitter: '#1DA1F2',
  linkedin: '#0A66C2',
  facebook: '#1877F2',
  twitch: '#9146FF',
  pinterest: '#E60023',
};

const IONICONS: Partial<Record<PlatformIconKey, keyof typeof Ionicons.glyphMap>> = {
  youtube: 'logo-youtube',
  instagram: 'logo-instagram',
  tiktok: 'logo-tiktok',
  twitter: 'logo-twitter',
  linkedin: 'logo-linkedin',
  facebook: 'logo-facebook',
  twitch: 'logo-twitch',
  pinterest: 'logo-pinterest',
};

function BrandSvgIcon({ size, color, path }: { size: number; color: string; path: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityRole="image">
      <Path d={path} fill={color} />
    </Svg>
  );
}

function DouyinIcon({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityRole="image">
      <Path
        d="M14.5 4.5c.4 1.8 1.6 3.2 3.5 3.7v3.1c-1.3 0-2.5-.4-3.5-1v6.4c0 3.2-2.6 5.2-5.4 4.6-2.3-.5-3.9-2.6-3.9-5 0-2.8 2.2-5 5-5 .3 0 .6 0 .9.1V12c-.2-.1-.5-.1-.8-.1-1.2 0-2.2 1-2.2 2.2 0 1.3 1 2.2 2.2 2.2 1.1 0 2-.9 2-2.1V4.5h1.2z"
        fill="#111111"
      />
      <Path
        d="M14.5 4.5c.4 1.8 1.6 3.2 3.5 3.7v3.1c-1.3 0-2.5-.4-3.5-1v6.4c0 3.2-2.6 5.2-5.4 4.6-2.3-.5-3.9-2.6-3.9-5 0-2.8 2.2-5 5-5 .3 0 .6 0 .9.1V12c-.2-.1-.5-.1-.8-.1-1.2 0-2.2 1-2.2 2.2 0 1.3 1 2.2 2.2 2.2 1.1 0 2-.9 2-2.1V4.5h1.2z"
        fill="#25F4EE"
        opacity={0.35}
      />
      <Path
        d="M14.5 4.5c.4 1.8 1.6 3.2 3.5 3.7v3.1c-1.3 0-2.5-.4-3.5-1v6.4c0 3.2-2.6 5.2-5.4 4.6-2.3-.5-3.9-2.6-3.9-5 0-2.8 2.2-5 5-5 .3 0 .6 0 .9.1V12c-.2-.1-.5-.1-.8-.1-1.2 0-2.2 1-2.2 2.2 0 1.3 1 2.2 2.2 2.2 1.1 0 2-.9 2-2.1V4.5h1.2z"
        fill="#FE2C55"
        opacity={0.35}
      />
    </Svg>
  );
}

function renderBrandGlyph(key: PlatformIconKey, size: number, color: string) {
  const ionicon = IONICONS[key];
  if (ionicon) {
    return <Ionicons name={ionicon} size={size} color={color} />;
  }
  if (key === 'bilibili') return <BrandSvgIcon size={size} color={color} path={BILIBILI_PATH} />;
  if (key === 'xiaohongshu') return <BrandSvgIcon size={size} color={color} path={XIAOHONGSHU_PATH} />;
  if (key === 'douyin') return <DouyinIcon size={size} />;
  return null;
}

export function PlatformIcon({ platform, size = 18 }: Props) {
  const key = resolvePlatformIconKey(platform);
  if (!key) return null;

  const color = BRAND_COLORS[key];
  const box = size + 10;

  return (
    <View
      style={[
        styles.wrap,
        {
          width: box,
          height: box,
          borderRadius: box * 0.28,
          backgroundColor: '#FFFFFF',
        },
      ]}
      accessibilityRole="image"
      accessibilityLabel={platform.trim()}>
      {renderBrandGlyph(key, size, color)}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
