import { useCallback, useEffect, useState } from 'react';
import { api, qs } from '../api/client.js';

export function useFetch(path, params, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api
      .get(`${path}${qs(params)}`)
      .then((res) => {
        if (active) setData(res);
      })
      .catch((err) => {
        if (active) setError(err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, JSON.stringify(params), reloadKey, ...deps]);

  return { data, loading, error, reload };
}

export function useLookup(path) {
  const { data } = useFetch(path, { limit: 200 });
  return data?.data || [];
}
