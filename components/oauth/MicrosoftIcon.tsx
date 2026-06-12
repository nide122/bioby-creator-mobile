import Svg, { Path } from 'react-native-svg';

type Props = {
  size?: number;
};

/** Microsoft logo (4-color squares). */
export function MicrosoftIcon({ size = 20 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 21 21" accessibilityRole="image" accessibilityLabel="Microsoft">
      <Path fill="#F25022" d="M10 2H2v8h8V2z" />
      <Path fill="#00A4EF" d="M19 2h-8v8h8V2z" />
      <Path fill="#FFB900" d="M10 11H2v8h8v-8z" />
      <Path fill="#7FBA00" d="M19 11h-8v8h8v-8z" />
    </Svg>
  );
}
