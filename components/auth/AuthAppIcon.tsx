import { Image, StyleSheet, View, type ImageStyle, type StyleProp } from 'react-native';

import { radii } from '@/constants/tokens';

const appIcon = require('../../assets/images/app-icon.png');

type Props = {
  size?: number;
  style?: StyleProp<ImageStyle>;
};

/** Squircle app icon used on auth / landing headers. */
export function AuthAppIcon({ size = 48, style }: Props) {
  return (
    <View
      style={[styles.frame, { width: size, height: size, borderRadius: size * 0.22 }]}
      accessibilityRole="image"
      accessibilityLabel="BioBy">
      <Image
        source={appIcon}
        style={[styles.image, { width: size, height: size, borderRadius: size * 0.22 }, style]}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
    borderRadius: radii.md,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
