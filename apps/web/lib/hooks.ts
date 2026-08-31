import { useState, useCallback, useEffect } from 'react';
import { api } from '@/lib/api';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiOptions {
  initialLoad?: boolean;
}

export function useApi<T>(
  asyncFunction: () => Promise<T>,
  options: UseApiOptions = { initialLoad: true }
): UseApiState<T> & { refetch: () => Promise<void> } {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: options.initialLoad ?? true,
    error: null,
  });

  const execute = useCallback(async () => {
    setState({ data: null, loading: true, error: null });
    try {
      const result = await asyncFunction();
      setState({ data: result, loading: false, error: null });
    } catch (err: any) {
      const message = api.getErrorMessage(err);
      setState({ data: null, loading: false, error: message });
    }
  }, [asyncFunction]);

  useEffect(() => {
    if (options.initialLoad ?? true) {
      execute();
    }
  }, [execute, options.initialLoad]);

  return {
    ...state,
    refetch: execute,
  };
}

export function useAsync<T>(
  asyncFunction: () => Promise<T>,
  dependencies: any[] = []
): UseApiState<T> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    const execute = async () => {
      setState({ data: null, loading: true, error: null });
      try {
        const result = await asyncFunction();
        if (isMounted) {
          setState({ data: result, loading: false, error: null });
        }
      } catch (err: any) {
        if (isMounted) {
          const message = api.getErrorMessage(err);
          setState({ data: null, loading: false, error: message });
        }
      }
    };

    execute();

    return () => {
      isMounted = false;
    };
  }, dependencies);

  return state;
}
