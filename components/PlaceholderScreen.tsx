import type { PropsWithChildren, ReactNode } from 'react';

import {
  HubCallout,
  HubLinkGroup,
  HubScreen,
  type HubLinkItem,
} from '@/components/product/HubScreen';

export type PlaceholderLinkItem = HubLinkItem;

type Props = PropsWithChildren<{
  title: string;
  eyebrow?: string;
  description?: string;
  hideHeader?: boolean;
  testID?: string;
  links?: PlaceholderLinkItem[];
  footer?: ReactNode;
  toolbar?: ReactNode;
}>;

/** Hub shell with title + optional eyebrow (used by Deals and error states). */
export function PlaceholderScreen({
  title,
  eyebrow,
  description,
  hideHeader: _hideHeader,
  testID,
  links,
  footer,
  toolbar,
  children,
}: Props) {
  return (
    <HubScreen testID={testID} eyebrow={eyebrow} title={title} lead={description} toolbar={toolbar} footer={footer}>
      {children}
      {links?.length ? <HubLinkGroup links={links} /> : null}
    </HubScreen>
  );
}

export { HubCallout };
