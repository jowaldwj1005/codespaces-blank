import { useState, useCallback } from 'react';
import { systemusers, teams, businessunits, createTeam } from '../services/dataverse';
import type { IGetAllOptions } from '../services/sdk';

export type DataverseTable = 'systemusers' | 'teams' | 'businessunits';

interface UseDataverseState {
  data: unknown[] | null;
  loading: boolean;
  error: string | null;
  lastAction: string | null;
}

export function useDataverse() {
  const [state, setState] = useState<UseDataverseState>({
    data: null,
    loading: false,
    error: null,
    lastAction: null,
  });

  const fetchTable = useCallback(async (table: DataverseTable, options?: IGetAllOptions) => {
    setState({ data: null, loading: true, error: null, lastAction: 'list' });
    try {
      const service = { systemusers, teams, businessunits }[table];
      const result = await service.getAll(options);
      const records = Array.isArray(result.data) ? result.data : [];
      setState({ data: records, loading: false, error: null, lastAction: 'list' });
      return records;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setState({ data: null, loading: false, error: msg, lastAction: 'list' });
      return null;
    }
  }, []);

  const fetchRecord = useCallback(async (table: DataverseTable, id: string) => {
    setState({ data: null, loading: true, error: null, lastAction: 'get' });
    try {
      const service = { systemusers, teams, businessunits }[table];
      const result = await service.get(id);
      setState({ data: result.data ? [result.data] : [], loading: false, error: null, lastAction: 'get' });
      return result.data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setState({ data: null, loading: false, error: msg, lastAction: 'get' });
      return null;
    }
  }, []);

  const fetchMetadata = useCallback(async (table: DataverseTable) => {
    setState({ data: null, loading: true, error: null, lastAction: 'metadata' });
    try {
      const service = { systemusers, teams, businessunits }[table];
      const result = await service.getMetadata();
      setState({ data: result.data ? [result.data] : [], loading: false, error: null, lastAction: 'metadata' });
      return result.data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setState({ data: null, loading: false, error: msg, lastAction: 'metadata' });
      return null;
    }
  }, []);

  const doCreateTeam = useCallback(async (opts: {
    name: string;
    description?: string;
    businessUnitId: string;
    administratorId: string;
  }) => {
    setState({ data: null, loading: true, error: null, lastAction: 'create' });
    try {
      const result = await createTeam(opts);
      setState({ data: result.data ? [result.data] : [], loading: false, error: null, lastAction: 'create' });
      return result.data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setState({ data: null, loading: false, error: msg, lastAction: 'create' });
      return null;
    }
  }, []);

  const doUpdateTeam = useCallback(async (id: string, fields: Record<string, unknown>) => {
    setState({ data: null, loading: true, error: null, lastAction: 'update' });
    try {
      const result = await teams.update(id, fields as Parameters<typeof teams.update>[1]);
      setState({ data: result.data ? [result.data] : [], loading: false, error: null, lastAction: 'update' });
      return result.data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setState({ data: null, loading: false, error: msg, lastAction: 'update' });
      return null;
    }
  }, []);

  const doDeleteRecord = useCallback(async (table: DataverseTable, id: string) => {
    setState((s) => ({ ...s, loading: true, error: null, lastAction: 'delete' }));
    try {
      if (table === 'teams') {
        await teams.delete(id);
      } else if (table === 'systemusers') {
        await systemusers.delete(id);
      } else {
        throw new Error(`Delete not supported for ${table}`);
      }
      setState((s) => ({
        ...s,
        loading: false,
        error: null,
        lastAction: 'delete',
        data: s.data?.filter((r) => {
          const rec = r as Record<string, unknown>;
          return rec.teamid !== id && rec.systemuserid !== id;
        }) ?? null,
      }));
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setState((s) => ({ ...s, loading: false, error: msg, lastAction: 'delete' }));
      return false;
    }
  }, []);

  return {
    ...state,
    fetchTable,
    fetchRecord,
    fetchMetadata,
    doCreateTeam,
    doUpdateTeam,
    doDeleteRecord,
  };
}
