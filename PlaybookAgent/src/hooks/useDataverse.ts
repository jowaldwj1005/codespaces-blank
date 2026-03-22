import { useState, useCallback } from 'react';
import { systemusers, teams, businessunits } from '../services/dataverse';
import type { IGetAllOptions } from '../services/sdk';

export type DataverseTable = 'systemusers' | 'teams' | 'businessunits';

interface UseDataverseState {
  data: unknown[] | null;
  loading: boolean;
  error: string | null;
}

export function useDataverse() {
  const [state, setState] = useState<UseDataverseState>({
    data: null,
    loading: false,
    error: null,
  });

  const fetchTable = useCallback(async (table: DataverseTable, options?: IGetAllOptions) => {
    setState({ data: null, loading: true, error: null });
    try {
      const service = { systemusers, teams, businessunits }[table];
      const result = await service.getAll(options);
      const records = Array.isArray(result.data) ? result.data : [];
      setState({ data: records, loading: false, error: null });
      return records;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setState({ data: null, loading: false, error: msg });
      return null;
    }
  }, []);

  const fetchRecord = useCallback(async (table: DataverseTable, id: string) => {
    setState({ data: null, loading: true, error: null });
    try {
      const service = { systemusers, teams, businessunits }[table];
      const result = await service.get(id);
      setState({ data: result.data ? [result.data] : [], loading: false, error: null });
      return result.data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setState({ data: null, loading: false, error: msg });
      return null;
    }
  }, []);

  const fetchMetadata = useCallback(async (table: DataverseTable) => {
    setState({ data: null, loading: true, error: null });
    try {
      const service = { systemusers, teams, businessunits }[table];
      const result = await service.getMetadata();
      setState({ data: result.data ? [result.data] : [], loading: false, error: null });
      return result.data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setState({ data: null, loading: false, error: msg });
      return null;
    }
  }, []);

  return { ...state, fetchTable, fetchRecord, fetchMetadata };
}
