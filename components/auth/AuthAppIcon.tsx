import { Image, type ImageStyle, type StyleProp } from 'react-native';

const appIcon = require('../../assets/images/bioby-logo.png');

type Props = {
  size?: number;
  style?: StyleProp<ImageStyle>;
};

/** Transparent BioBy mark for auth / landing headers. */
export function AuthAppIcon({ size = 48, style }: Props) {
  return (
    <Image
      source={appIcon}
      style={[{ width: size, height: size }, style]}
      resizeMode="contain"
      accessibilityRole="image"
      accessibilityLabel="BioBy"
    />
  );
}
