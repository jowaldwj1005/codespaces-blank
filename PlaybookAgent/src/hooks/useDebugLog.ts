import { useState, useEffect, useCallback } from 'react';
import type { DebugEvent } from '../services/debugEventBus';
import { onDebugEvent, getDebugLog, clearDebugLog } from '../services/debugEventBus';

export function useDebugLog() {
  const [events, setEvents] = useState<readonly DebugEvent[]>(() => getDebugLog());

  useEffect(() => {
    const unsubscribe = onDebugEvent(() => {
      setEvents([...getDebugLog()]);
    });
    return unsubscribe;
  }, []);

  const clear = useCallback(() => {
    clearDebugLog();
    setEvents([]);
  }, []);

  return { events, clear };
}
