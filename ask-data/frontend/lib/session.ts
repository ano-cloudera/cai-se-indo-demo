const SESSION_STORAGE_KEY = "ask-data-session-id";

export function getOrCreateSessionId(): string {
  const existingSessionId = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (existingSessionId) {
    return existingSessionId;
  }

  const nextSessionId = crypto.randomUUID();
  window.localStorage.setItem(SESSION_STORAGE_KEY, nextSessionId);
  return nextSessionId;
}

export function createNewSessionId(): string {
  const nextSessionId = crypto.randomUUID();
  window.localStorage.setItem(SESSION_STORAGE_KEY, nextSessionId);
  return nextSessionId;
}
