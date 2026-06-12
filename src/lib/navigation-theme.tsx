import { HeaderBackButton } from '@react-navigation/elements';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { type Href, useGlobalSearchParams, usePathname, useRouter } from 'expo-router';
import type { TFunction } from 'i18next';
import type { ComponentProps } from 'react';

import type { ThemePalette } from '@/constants/tokens';

type StackHeaderBackProps = ComponentProps<typeof HeaderBackButton> & {
  canGoBack?: boolean;
};

/**
 * 嵌套路由其首屏在「子 Stack」内 canGoBack=false，但根 Stack 上仍有历史（例如从 Tab 推到 deal/drafts）。
 * 此时需显式用 router.back() 弹出父级路由，否则导航栏不会出现返回按钮。
 *
 * 少数叠栈 / modal 场景下 canGoBack 为 false 但 canDismiss 为 true，用 dismiss 兜底。
 */
export function StackHeaderBack(props: StackHeaderBackProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useGlobalSearchParams<{ source?: string | string[] }>();
  const { canGoBack, onPress, ...rest } = props;

  const fallbackHref = getStackBackFallbackHref(pathname, searchParams);
  const goBack = () => {
    // Refresh leaves `/onboarding` index under the current step; router.back() hits the
    // dispatcher and it immediately replace-forwards — feels like back does nothing once.
    if (fallbackHref && shouldPreferExplicitOnboardingBack(pathname)) {
      router.replace(fallbackHref);
      return;
    }
    if (fallbackHref && shouldPreferExplicitInboxThreadBack(pathname)) {
      router.replace(fallbackHref);
      return;
    }
    if (router.canGoBack()) {
      router.back();
      return;
    }
    if (router.canDismiss()) {
      router.dismiss();
      return;
    }
    if (fallbackHref) {
      router.replace(fallbackHref);
    }
  };

  if (canGoBack) {
    return <HeaderBackButton {...rest} onPress={goBack} />;
  }
  if (router.canGoBack()) {
    return <HeaderBackButton {...rest} onPress={goBack} />;
  }
  if (router.canDismiss()) {
    return <HeaderBackButton {...rest} onPress={goBack} />;
  }
  if (fallbackHref) {
    return <HeaderBackButton {...rest} onPress={goBack} />;
  }
  return null;
}

type StackBackSearchParams = { source?: string | string[] };

function searchParamValue(value: string | string[] | undefined): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value[0];
  return undefined;
}

/**
 * Inbox thread detail may be opened via drafts「回到邮件」的 push，栈里没有列表页；
 * 此时 router.back() 会跳出 Inbox Tab。显式 replace 回列表更稳定。
 */
export function shouldPreferExplicitInboxThreadBack(pathname: string): boolean {
  const parts = pathname.split('/').filter(Boolean);
  return parts[0] === 'inbox' && parts.length === 2;
}

/** Onboarding linear steps should not use router.back() — the stack often hides `/onboarding` index. */
export function shouldPreferExplicitOnboardingBack(pathname: string): boolean {
  return (
    pathname === '/onboarding/consent' ||
    pathname === '/onboarding/email' ||
    pathname === '/onboarding/complete'
  );
}

/** Fallback when the stack has no history (e.g. deep link or refresh). Unit-tested without expo-router. */
export function getStackBackFallbackHref(
  pathname: string,
  searchParams?: StackBackSearchParams,
): Href | null {
  if (pathname === '/onboarding/email') {
    if (searchParamValue(searchParams?.source) === 'account') {
      return '/account' as Href;
    }
    return '/onboarding/consent' as Href;
  }
  if (pathname === '/onboarding/consent') {
    return '/onboarding/profile' as Href;
  }
  if (pathname === '/onboarding/complete') {
    return '/onboarding/email' as Href;
  }

  const parts = pathname.split('/').filter(Boolean);
  if (parts.length <= 1) return null;

  if (parts[0] === 'deal' && parts[1]) {
    return `/deal/${parts[1]}` as Href;
  }
  if (parts[0] === 'drafts') {
    return '/drafts';
  }
  if (parts[0] === 'settings') {
    return '/account';
  }

  return `/${parts.slice(0, -1).join('/')}` as Href;
}

export function stackHeaderOptions(theme: ThemePalette, t: TFunction): NativeStackNavigationOptions {
  return {
    headerBackTitle: t('navigation.back'),
    headerShadowVisible: false,
    headerTransparent: false,
    headerStyle: {
      backgroundColor: theme.background,
    },
    headerTintColor: theme.foreground,
    headerTitleAlign: 'left',
    headerTitleStyle: {
      color: theme.foreground,
      fontSize: 17,
      fontWeight: '700',
    },
    headerLeft: (props) => <StackHeaderBack {...props} />,
  };
}
