import { StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { webClassName } from '@/src/lib/corporate-clean-web';

/** Light blue-white gradient with subtle wave lines for the landing hero. */
export function LandingHeroBackground() {
  return (
    <Svg
      pointerEvents="none"
      className={webClassName('landing-hero-waves')}
      style={StyleSheet.absoluteFill}
      viewBox="0 0 390 844"
      fill="none">
      <Path
        d="M-40 180C60 120 140 200 220 150C300 100 360 220 430 160"
        stroke="rgba(37, 99, 235, 0.14)"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <Path
        d="M-20 420C80 360 160 440 250 390C330 345 370 460 440 400"
        stroke="rgba(59, 130, 246, 0.1)"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <Path
        d="M0 620C90 560 170 640 260 590C340 545 380 660 450 600"
        stroke="rgba(30, 64, 175, 0.08)"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <Defs>
        <LinearGradient id="landingHeroFade" x1="195" y1="0" x2="195" y2="844" gradientUnits="userSpaceOnUse">
          <Stop stopColor="#eff6ff" stopOpacity="0.55" />
          <Stop offset="0.45" stopColor="#f8fafc" stopOpacity="0.2" />
          <Stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </LinearGradient>
      </Defs>
    </Svg>
  );
}
