'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type NotificationItem =
  | { type: 'spark'; id: string; delta: number; note: string }
  | { type: 'badge'; id: string; dimensionId: string; tier: 'bronze' | 'silver' | 'gold'; parentNote: string };

interface NotifierQueueContextType {
  enqueueNotification: (item: NotificationItem) => void;
  currentItem: NotificationItem | null;
  dismissCurrent: () => void;
}

const NotifierQueueContext = createContext<NotifierQueueContextType | undefined>(undefined);

export function NotifierQueueProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<NotificationItem[]>([]);
  const [currentItem, setCurrentItem] = useState<NotificationItem | null>(null);

  const processQueue = useCallback((updatedQueue: NotificationItem[]) => {
    if (updatedQueue.length > 0 && !currentItem) {
      const [next, ...rest] = updatedQueue;
      if (next) {
        setCurrentItem(next);
        setQueue(rest);
      }
    }
  }, [currentItem]);

  const enqueueNotification = useCallback((item: NotificationItem) => {
    setQueue((prev) => {
      const nextQueue = [...prev, item];
      if (!currentItem) {
        setTimeout(() => {
          processQueue(nextQueue);
        }, 100);
      }
      return nextQueue;
    });
  }, [currentItem, processQueue]);

  const dismissCurrent = useCallback(() => {
    setCurrentItem(null);
    setTimeout(() => {
      setQueue((prev) => {
        if (prev.length > 0) {
          const [next, ...rest] = prev;
          if (next) {
            setCurrentItem(next);
          }
          return rest;
        }
        return prev;
      });
    }, 2500); // 2.5s calm delay between celebrations for sensory preservation
  }, []);

  return (
    <NotifierQueueContext.Provider value={{ enqueueNotification, currentItem, dismissCurrent }}>
      {children}
    </NotifierQueueContext.Provider>
  );
}

export function useNotifierQueue() {
  const ctx = useContext(NotifierQueueContext);
  if (!ctx) {
    throw new Error('useNotifierQueue must be used within a NotifierQueueProvider');
  }
  return ctx;
}
