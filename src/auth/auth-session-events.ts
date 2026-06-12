type SessionExpiredListener = () => void;

const listeners = new Set<SessionExpiredListener>();

/** Subscribe to global session expiry (401 after refresh fails, etc.). */
export function onSessionExpired(listener: SessionExpiredListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifySessionExpired(): void {
  for (const listener of listeners) {
    listener();
  }
}
