import "server-only";

export type UserNotificationEvent = {
  type: "message";
  createdAt: string;
  conversationId: string;
  messageId: string;
  fromProfileId: string;
  toProfileId: string;
};

type NotificationListener = (event: UserNotificationEvent) => void;

type NotificationEventStore = {
  listenersByUserId: Map<string, Set<NotificationListener>>;
};

function getNotificationEventStore() {
  const globalStore = globalThis as typeof globalThis & {
    __notificationEventStore?: NotificationEventStore;
  };

  if (!globalStore.__notificationEventStore) {
    globalStore.__notificationEventStore = {
      listenersByUserId: new Map(),
    };
  }

  return globalStore.__notificationEventStore;
}

export function subscribeToUserNotifications(
  userId: string,
  listener: NotificationListener
) {
  const store = getNotificationEventStore();
  const listeners = store.listenersByUserId.get(userId) ?? new Set<NotificationListener>();

  listeners.add(listener);
  store.listenersByUserId.set(userId, listeners);

  return () => {
    const activeListeners = store.listenersByUserId.get(userId);

    if (!activeListeners) {
      return;
    }

    activeListeners.delete(listener);

    if (activeListeners.size === 0) {
      store.listenersByUserId.delete(userId);
    }
  };
}

export function publishUserNotification(
  userId: string,
  event: UserNotificationEvent
) {
  const store = getNotificationEventStore();
  const listeners = store.listenersByUserId.get(userId);

  if (!listeners || listeners.size === 0) {
    return;
  }

  for (const listener of listeners) {
    try {
      listener(event);
    } catch (error) {
      console.error("Notification listener failed:", error);
    }
  }
}
