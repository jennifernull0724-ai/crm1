import { useEffect, useState } from 'react';

export function useAsync(fn, deps) {
  const [state, setState] = useState({ status: 'idle', data: null, error: null });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading', data: null, error: null });

    fn()
      .then((data) => {
        if (cancelled) return;
        setState({ status: 'success', data, error: null });
      })
      .catch((error) => {
        if (cancelled) return;
        setState({ status: 'error', data: null, error });
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
