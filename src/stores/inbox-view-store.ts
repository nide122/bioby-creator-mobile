import { create } from 'zustand';

import type { InboxEmailCategory } from '@/src/types/domain';

export type InboxViewMode = 'priority' | 'all';
export type InboxCategoryFilter = InboxEmailCategory | 'all';
export type InboxTimeRangeFilter = 'ALL' | 'ONE_WEEK' | 'ONE_MONTH' | 'THREE_MONTHS';
export type InboxSortBy = 'TIME' | 'MESSAGE_COUNT' | 'CLASSIFICATION_SCORE';
export type InboxSortOrder = 'DESC' | 'ASC';

type InboxViewState = {
  viewMode: InboxViewMode;
  categoryFilter: InboxCategoryFilter;
  timeRangeFilter: InboxTimeRangeFilter;
  sortBy: InboxSortBy;
  sortOrder: InboxSortOrder;
  searchQuery: string;
  scrollY: number;
  setViewMode: (mode: InboxViewMode) => void;
  setCategoryFilter: (filter: InboxCategoryFilter) => void;
  setTimeRangeFilter: (filter: InboxTimeRangeFilter) => void;
  setSortBy: (sortBy: InboxSortBy) => void;
  setSortOrder: (order: InboxSortOrder) => void;
  setSearchQuery: (query: string) => void;
  setScrollY: (scrollY: number) => void;
};

export const useInboxViewStore = create<InboxViewState>((set) => ({
  viewMode: 'priority',
  categoryFilter: 'all',
  timeRangeFilter: 'ALL',
  sortBy: 'TIME',
  sortOrder: 'DESC',
  searchQuery: '',
  scrollY: 0,
  setViewMode: (mode) => set({ viewMode: mode }),
  setCategoryFilter: (filter) =>
    set({ categoryFilter: filter }),
  setTimeRangeFilter: (filter) =>
    set({ timeRangeFilter: filter }),
  setSortBy: (sortBy) =>
    set({ sortBy }),
  setSortOrder: (order) =>
    set({ sortOrder: order }),
  setSearchQuery: (query) =>
    set((state) => ({
      searchQuery: query,
      scrollY: query === state.searchQuery ? state.scrollY : 0,
    })),
  setScrollY: (scrollY) => set({ scrollY }),
}));
