import { useCallback, useEffect, useRef, useState } from "react";

interface UseApiDataOptions {
  /** Re-runs the fetch when it changes (e.g. `${buildingId}|${page}|${search}`). */
  key?: unknown;
  /** Delay before fetching, resetting on key changes — for search-as-you-type. */
  debounceMs?: number;
  /** When false, skips fetching and clears data (e.g. no building selected yet). */
  enabled?: boolean;
}

/**
 * Shared data-fetching convention for hooks/pages that load from the API:
 * loading + error state, unmount safety, debounced key-driven refetch, and an
 * awaitable manual reload, without each caller re-implementing the
 * mounted-flag boilerplate.
 *
 * - `fetcher` is kept in a ref, so callers can pass an inline closure safely.
 * - Data clears on error and while disabled, matching the pages' previous
 *   clear-list-on-failure behavior.
 * - `reload()` resolves once the fetch it triggered settles, so post-CRUD
 *   handlers can `await reload()` before closing a modal.
 *
 * Not for cached/shared resources — see useUsers, which intentionally keeps a
 * module-level cache with explicit invalidation. Not for locally-mutated lists
 * (optimistic merges) — the hook owns `data`; see WorkOrdersPage.
 */
export function useApiData<T>(
  fetcher: () => Promise<T>,
  errorMessage: string | ((err: unknown) => string),
  options: UseApiDataOptions = {},
) {
  const { key = null, debounceMs = 0, enabled = true } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const messageRef = useRef(errorMessage);
  messageRef.current = errorMessage;
  const settleResolvers = useRef<(() => void)[]>([]);
  const seenNonce = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setData(null);
      settleResolvers.current.splice(0).forEach((resolve) => resolve());
      return;
    }
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetcherRef.current();
        if (mounted) setData(result);
      } catch (err) {
        if (mounted) {
          setData(null);
          const msg = messageRef.current;
          setError(typeof msg === "function" ? msg(err) : msg);
        }
      } finally {
        if (mounted) setLoading(false);
        settleResolvers.current.splice(0).forEach((resolve) => resolve());
      }
    };
    // Debounce key-driven refetches (search-as-you-type); explicit reload() runs at once.
    const isReload = nonce !== seenNonce.current;
    seenNonce.current = nonce;
    if (debounceMs > 0 && !isReload) {
      const t = setTimeout(load, debounceMs);
      return () => { mounted = false; clearTimeout(t); };
    }
    load();
    return () => { mounted = false; };
  }, [nonce, key, enabled, debounceMs]);

  const reload = useCallback(() => new Promise<void>((resolve) => {
    settleResolvers.current.push(resolve);
    setNonce((n) => n + 1);
  }), []);

  return { data, loading, error, reload };
}
