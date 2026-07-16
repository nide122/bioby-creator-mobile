import { HeaderBackButton } from '@react-navigation/elements';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { type Href, useLocalSearchParams, usePathname, useRouter } from 'expo-router';
import type { TFunction } from 'i18next';
import type { ComponentProps } from 'react';

import type { ThemePalette } from '@/constants/tokens';
import {
  navigateReturnTo,
  resolveReturnTarget,
  inboxThreadHref,
  inboxThreadMessagesHref,
} from '@/src/lib/open-brand-detail';

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
  const searchParams = useLocalSearchParams<{
    source?: string | string[];
    threadId?: string | string[];
    returnTo?: string | string[];
    parentReturnTo?: string | string[];
    directReturn?: string | string[];
    returnToMessages?: string | string[];
  }>();
  const { canGoBack, onPress, ...rest } = props;

  const fallbackHref = getStackBackFallbackHref(pathname, searchParams);
  const goBack = () => {
    const parentReturnTo = searchParamValue(searchParams?.parentReturnTo);
    const navigateBack = (target: Href | string) => {
      if (typeof target === 'string') {
        navigateReturnTo(router, target, parentReturnTo);
        return;
      }
      if (typeof router.canDismiss === 'function' && router.canDismiss()) {
        router.dismissTo(target);
        return;
      }
      router.replace(target);
    };
    // Refresh leaves `/onboarding` index under the current step; router.back() hits the
    // dispatcher and it immediately replace-forwards — feels like back does nothing once.
    if (fallbackHref && shouldPreferExplicitOnboardingBack(pathname)) {
      navigateBack(fallbackHref);
      return;
    }
    if (fallbackHref && shouldPreferExplicitInboxThreadMessagesBack(pathname)) {
      router.replace(fallbackHref as Href);
      return;
    }
    if (fallbackHref && shouldPreferExplicitInboxThreadBack(pathname)) {
      navigateBack(fallbackHref);
      return;
    }
    if (fallbackHref && shouldPreferExplicitBrandBack(pathname, searchParams)) {
      navigateBack(fallbackHref);
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

type StackBackSearchParams = {
  source?: string | string[];
  threadId?: string | string[];
  returnTo?: string | string[];
  parentReturnTo?: string | string[];
  directReturn?: string | string[];
  returnToMessages?: string | string[];
};

function searchParamValue(value: string | string[] | undefined): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value[0];
  return undefined;
}

/**
 * The thread's original-message list must return to its thread detail. Relying on
 * router.back() can pop the parent Tabs history and jump back to Today instead.
 */
export function shouldPreferExplicitInboxThreadMessagesBack(pathname: string): boolean {
  const parts = pathname.split('/').filter(Boolean);
  return parts[0] === 'inbox' && parts[1] !== 'message' && parts[2] === 'messages' && parts.length === 3;
}

/**
 * Inbox thread detail may be opened via drafts「回到邮件」的 push，栈里没有列表页；
 * 此时 router.back() 会跳出 Inbox Tab。显式 replace 回列表更稳定。
 */
export function shouldPreferExplicitInboxThreadBack(pathname: string): boolean {
  const parts = pathname.split('/').filter(Boolean);
  return parts[0] === 'inbox' && parts.length === 2;
}

export function shouldPreferExplicitBrandBack(pathname: string, searchParams?: StackBackSearchParams): boolean {
  const parts = pathname.split('/').filter(Boolean);
  return parts[0] === 'brand' && parts.length === 2 && !!searchParamValue(searchParams?.returnTo);
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
  const returnTo = searchParamValue(searchParams?.returnTo);
  const parentReturnTo = searchParamValue(searchParams?.parentReturnTo);

  if (parts[0] === 'inbox' && parts[1] && parts[1] !== 'message' && parts[2] === 'messages') {
    if (returnTo || parentReturnTo) {
      return inboxThreadHref(parts[1], { returnTo, parentReturnTo });
    }
    return `/inbox/${parts[1]}` as Href;
  }

  if (parts[0] === 'inbox' && parts[1] === 'message' && parts[2]) {
    const threadId = searchParamValue(searchParams?.threadId);
    const directReturn = searchParamValue(searchParams?.directReturn) === '1';
    const returnToMessages = searchParamValue(searchParams?.returnToMessages) === '1';

    if (returnTo && directReturn) {
      return resolveReturnTarget(returnTo, parentReturnTo);
    }
    if (threadId) {
      if (returnToMessages) {
        return inboxThreadMessagesHref(
          threadId,
          returnTo || parentReturnTo ? { returnTo, parentReturnTo } : null,
        );
      }
      if (returnTo || parentReturnTo) {
        return inboxThreadHref(threadId, { returnTo, parentReturnTo });
      }
      return `/inbox/${threadId}` as Href;
    }
    if (returnTo) {
      return resolveReturnTarget(returnTo, parentReturnTo);
    }
    return '/inbox' as Href;
  }

  if (parts[0] === 'inbox' && parts.length === 2) {
    if (returnTo) {
      return resolveReturnTarget(returnTo, parentReturnTo);
    }
    return '/inbox' as Href;
  }

  if (parts[0] === 'deal' && parts.length === 2 && returnTo) {
    return resolveReturnTarget(returnTo, parentReturnTo);
  }

  if (parts[0] === 'brand' && parts.length === 2) {
    if (returnTo) {
      return returnTo as Href;
    }
    return null;
  }

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
  if (parts[0] === 'ops') {
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
