import { useCallback, useState } from 'react';
import { useAppData } from '../context/AppDataContext';

export function useRefreshControl() {
  const { refresh } = useAppData();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  return { refreshing, onRefresh };
}
