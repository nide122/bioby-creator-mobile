import React, { useMemo } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs, useSegments } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, View } from 'react-native';
import { initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AccountAvatarButton } from '@/components/account/AccountAvatarButton';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { layout, palette } from '@/constants/tokens';
import { corporateCleanClass, webClassName } from '@/src/lib/corporate-clean-web';
import { useDecisionQueue } from '@/src/hooks/use-decisions';
import { shouldShowTabAccountAvatar } from '@/src/lib/should-show-tab-account-avatar';

function TabBarIcon(props: {
  focused: boolean;
  name: React.ComponentProps<typeof Ionicons>['name'];
  selectedName: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
}) {
  return (
    <Ionicons
      name={props.focused ? props.selectedName : props.name}
      color={props.color}
      size={props.focused ? 24 : 23}
    />
  );
}

function TabAccountAvatarOverlay() {
  const segments = useSegments();
  const insets = useSafeAreaInsets();

  if (!shouldShowTabAccountAvatar(segments)) {
    return null;
  }

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        top: insets.top + 12,
        right: layout.tabScreenPaddingX,
        zIndex: 30,
      }}>
      <AccountAvatarButton />
    </View>
  );
}

export default function TabLayout() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const navColors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const queue = useDecisionQueue();
  const visiblePendingCount = queue.pending.length;

  /**
   * Android + edge-to-edge：`paddingTop` 过大会把整排 Tab 往下顶，标签容易落到系统导航键后面
   *（见 expo/expo#37016）。首帧 `insets.bottom` 偶发为 0，用 `initialWindowMetrics` 兜底。
   */
  const bottomInset = useMemo(() => {
    if (Platform.OS === 'web') {
      return 0;
    }
    const initialBottom = initialWindowMetrics?.insets.bottom ?? 0;
    const merged = Math.max(insets.bottom, initialBottom);
    if (Platform.OS === 'android') {
      return Math.max(merged, 8);
    }
    return Math.max(insets.bottom, 8);
  }, [insets.bottom]);

  const tabBarStyle = useMemo(
    () => ({
      backgroundColor: theme.background,
      borderTopColor: theme.border,
      ...Platform.select({
        web: {
          borderTopWidth: StyleSheet.hairlineWidth,
          minHeight: layout.tabBarHeight,
          height: layout.tabBarHeight,
          paddingTop: 0,
          paddingBottom: 0,
          zIndex: 20,
        },
        ios: {
          borderTopWidth: StyleSheet.hairlineWidth,
          paddingTop: 4,
          paddingBottom: bottomInset,
        },
        android: {
          borderTopWidth: StyleSheet.hairlineWidth,
          paddingTop: 2,
          paddingBottom: bottomInset,
          elevation: 0,
        },
        default: {
          borderTopWidth: StyleSheet.hairlineWidth,
          paddingTop: 4,
          paddingBottom: bottomInset,
        },
      }),
    }),
    [bottomInset, theme.background, theme.border]
  );

  return (
    <View style={styles.root}>
      <Tabs
        initialRouteName="index"
        screenOptions={{
          tabBarActiveTintColor: navColors.tint,
          tabBarInactiveTintColor: theme.foregroundEyebrow,
          tabBarStyle,
          tabBarBackground:
            Platform.OS === 'web'
              ? () => <View style={{ flex: 1 }} className={webClassName(corporateCleanClass.tabBar)} />
              : undefined,
          tabBarItemStyle: Platform.select({
            web: {
              minHeight: layout.tabBarHeight,
              paddingTop: 4,
              paddingBottom: 6,
              justifyContent: 'center',
            },
            ios: { paddingVertical: 4 },
            android: { paddingTop: 4, paddingBottom: 2 },
            default: { paddingVertical: 4 },
          }),
          tabBarIconStyle: Platform.select({
            web: { marginTop: 0, marginBottom: 2 },
            default: { marginBottom: 0 },
          }),
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
            letterSpacing: 0.15,
            lineHeight: 14,
            ...Platform.select({
              web: { marginTop: 0, marginBottom: 0 },
              /** Android 再压一点垂直间距，避免单行标签被裁切 */
              android: { marginTop: 0 },
              default: { marginTop: 2 },
            }),
          },
          headerShown: false,
        }}>
        <Tabs.Screen
          name="index"
          options={{
            tabBarButtonTestID: 'tab-today',
            title: t('tabs.today'),
            tabBarLabel: t('tabs.today'),
            tabBarBadge: visiblePendingCount > 0 ? visiblePendingCount : undefined,
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon focused={focused} name="layers-outline" selectedName="layers" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="inbox"
          options={{
            tabBarButtonTestID: 'tab-inbox',
            title: t('tabs.inbox'),
            tabBarLabel: t('tabs.inbox'),
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon focused={focused} name="mail-outline" selectedName="mail" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="deals"
          options={{
            tabBarButtonTestID: 'tab-deals',
            title: t('tabs.deals'),
            tabBarLabel: t('tabs.deals'),
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon focused={focused} name="briefcase-outline" selectedName="briefcase" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="growth"
          options={{
            tabBarButtonTestID: 'tab-assets',
            title: t('tabs.assets'),
            tabBarLabel: t('tabs.assets'),
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon focused={focused} name="folder-open-outline" selectedName="folder-open" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="trust"
          options={{
            title: t('tabs.trust'),
            tabBarLabel: t('tabs.trust'),
            href: null,
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon focused={focused} name="shield-checkmark-outline" selectedName="shield-checkmark" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="account"
          options={{
            href: null,
            title: t('tabs.account'),
          }}
        />
      </Tabs>
      <TabAccountAvatarOverlay />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
