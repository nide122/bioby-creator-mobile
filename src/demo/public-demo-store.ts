import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

type PublicDemoState = {
  simulatedMailboxSyncComplete: boolean;
  completeSimulatedMailboxSync: () => void;
  reset: () => void;
};

const creator = (set: (partial: Partial<PublicDemoState>) => void): PublicDemoState => ({
  simulatedMailboxSyncComplete: false,
  completeSimulatedMailboxSync: () => set({ simulatedMailboxSyncComplete: true }),
  reset: () => set({ simulatedMailboxSyncComplete: false }),
});

const publicDemoStorage: StateStorage =
  Platform.OS === 'web' && typeof sessionStorage !== 'undefined'
    ? {
        getItem: async (name) => sessionStorage.getItem(name),
        setItem: async (name, value) => sessionStorage.setItem(name, value),
        removeItem: async (name) => sessionStorage.removeItem(name),
      }
    : AsyncStorage;

export const usePublicDemoStore = create<PublicDemoState>()(
  persist(creator, {
    name: 'bioby-public-demo-v1',
    storage: createJSONStorage(() => publicDemoStorage),
    partialize: (state) => ({
      simulatedMailboxSyncComplete: state.simulatedMailboxSyncComplete,
    }),
  }),
);
