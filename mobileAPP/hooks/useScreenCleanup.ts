import { useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { InteractionManager } from 'react-native';
import { queryClient } from '@/config/queryClient';

interface CleanupOptions {
  queryKeys?: string[][];
  stateCleanup?: () => void;
  aggressiveCleanup?: boolean;
}

export const useScreenCleanup = (options: CleanupOptions = {}) => {
  const { queryKeys = [], stateCleanup, aggressiveCleanup = false } = options;
  const cleanupExecuted = useRef(false);

  const cleanup = useCallback(() => {
    if (cleanupExecuted.current) return;
    cleanupExecuted.current = true;

    InteractionManager.runAfterInteractions(() => {
      if (queryKeys.length > 0) {
        queryClient.removeQueries({ queryKey: queryKeys.flat() });
      }

      if (aggressiveCleanup) {
        queryClient.getQueryCache().getAll().forEach(query => {
          if (!query.getObserversCount()) {
            queryClient.removeQueries({ queryKey: query.queryKey });
          }
        });
        queryClient.getMutationCache().clear();
      }

      stateCleanup?.();

      if (__DEV__ && typeof global.gc === 'function') {
        requestIdleCallback(() => {
          if (typeof global.gc === 'function') {
            global.gc();
          }
        });
      }
    });
  }, [queryKeys, stateCleanup, aggressiveCleanup]);

  useFocusEffect(
    useCallback(() => {
      cleanupExecuted.current = false;
      return cleanup;
    }, [cleanup])
  );
};