/**
 * Local signal that the user has read or removed a chat, so the inbox list and the header
 * Messages badge update immediately instead of waiting for the next server refresh.
 */
type ChatUnreadEvent = { type: 'read'; chatId: string } | { type: 'deleted'; chatId: string };
type Listener = (event: ChatUnreadEvent) => void;

const listeners = new Set<Listener>();

export function emitChatUnreadEvent(event: ChatUnreadEvent): void {
  listeners.forEach((listener) => listener(event));
}

export function subscribeChatUnreadEvents(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
