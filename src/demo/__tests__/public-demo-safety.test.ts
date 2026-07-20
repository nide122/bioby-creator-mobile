import { apiRequest } from '@/src/api/api-client';
import { fetchMockInboxThreads } from '@/src/api/mock-inbox';
import { usePublicDemoStore } from '@/src/demo/public-demo-store';
import { useSessionStore } from '@/src/stores/session-store';

describe('public demo safety', () => {
  beforeEach(() => {
    useSessionStore.getState().clearLocalSession();
    usePublicDemoStore.getState().reset();
  });

  it('blocks backend requests even when an API URL exists', async () => {
    useSessionStore.getState().enterPublicDemo();
    await expect(apiRequest('/api/v1/account/overview')).rejects.toMatchObject({
      code: 'PUBLIC_DEMO_BACKEND_DISABLED',
    });
  });

  it('reveals a fictional inquiry after simulated sync completes', async () => {
    useSessionStore.getState().enterPublicDemo();
    expect((await fetchMockInboxThreads()).some((thread) => thread.id === 'thread-public-demo-sync')).toBe(false);

    usePublicDemoStore.getState().completeSimulatedMailboxSync();

    expect((await fetchMockInboxThreads()).some((thread) => thread.id === 'thread-public-demo-sync')).toBe(true);
  });
});
