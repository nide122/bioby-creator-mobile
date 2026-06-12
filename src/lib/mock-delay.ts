/** Shared delay for mock fetchers (keeps latency consistent across api mocks). */
export function mockDelay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
