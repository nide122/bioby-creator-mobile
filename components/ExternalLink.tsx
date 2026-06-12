import type { Href } from 'expo-router';
import { Link } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Platform, Pressable } from 'react-native';

import { webSafePressableStyle } from '@/src/lib/web-safe-pressable-style';

export function ExternalLink(
  props: Omit<React.ComponentProps<typeof Link>, 'href'> & { href: Href }
) {
  const { style, children, pointerEvents, ...rest } = props as Omit<
    React.ComponentProps<typeof Link>,
    'href'
  > & {
    href: Href;
    pointerEvents?: 'box-none' | 'none' | 'box-only' | 'auto';
  };
  const resolvedStyle: StyleProp<ViewStyle> =
    Platform.OS === 'web'
      ? webSafePressableStyle(style as StyleProp<ViewStyle>)
      : (style as StyleProp<ViewStyle>);
  const pressableStyle: StyleProp<ViewStyle> = [
    resolvedStyle,
    pointerEvents ? ({ pointerEvents } as const) : null,
  ];

  return (
    <Link
      target="_blank"
      {...rest}
      href={props.href}
      asChild
      onPress={(e) => {
        if (Platform.OS !== 'web') {
          e.preventDefault();
          if (typeof props.href === 'string') {
            WebBrowser.openBrowserAsync(props.href);
          }
        }
      }}>
      <Pressable style={pressableStyle}>{children}</Pressable>
    </Link>
  );
}
