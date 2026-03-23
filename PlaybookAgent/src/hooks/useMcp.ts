/**
 * useMcp - React hook for Dataverse MCP (Model Context Protocol) tools.
 * Provides search, schema lookup, and query execution for the MCP panel.
 */

import { useState, useCallback } from 'react';
import {
  searchDataverseTables,
  getTableSchema,
  executeDataverseQuery,
} from '../services/dataverseMcp';
import type { McpSearchResult, McpTableSchema, McpQueryResult } from '../services/dataverseMcp';
import { systemusers, teams, businessunits } from '../services/dataverse';

interface UseMcpState {
  searchResult: McpSearchResult | null;
  schema: McpTableSchema | null;
  queryResult: McpQueryResult | null;
  loading: boolean;
  error: string | null;
  lastAction: string | null;
}

// Map plural names to their getAll functions for live queries
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TABLE_SERVICES: Record<string, {
  getAll: (opts: any) => Promise<any>;
  getMetadata?: () => Promise<any>;
}> = {
  systemusers: { getAll: systemusers.getAll, getMetadata: systemusers.getMetadata },
  teams: { getAll: teams.getAll, getMetadata: teams.getMetadata },
  businessunits: { getAll: businessunits.getAll, getMetadata: businessunits.getMetadata },
};

export function useMcp() {
  const [state, setState] = useState<UseMcpState>({
    searchResult: null,
    schema: null,
    queryResult: null,
    loading: false,
    error: null,
    lastAction: null,
  });

  const search = useCallback((intent: string) => {
    setState((s) => ({ ...s, loading: true, error: null, lastAction: 'search' }));
    try {
      const result = searchDataverseTables(intent);
      setState((s) => ({ ...s, searchResult: result, loading: false }));
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setState((s) => ({ ...s, loading: false, error: msg }));
      return null;
    }
  }, []);

  const fetchSchema = useCallback(async (logicalName: string) => {
    setState((s) => ({ ...s, loading: true, error: null, lastAction: 'schema' }));
    try {
      // Find the service for live metadata if available
      const tableInfo = searchDataverseTables(logicalName).tables[0];
      const service = tableInfo ? TABLE_SERVICES[tableInfo.pluralName] : undefined;

      const schema = await getTableSchema(
        logicalName,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        service?.getMetadata as any
      );
      setState((s) => ({ ...s, schema, loading: false }));
      return schema;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setState((s) => ({ ...s, loading: false, error: msg }));
      return null;
    }
  }, []);

  const query = useCallback(async (
    tablePluralName: string,
    options: { select?: string[]; filter?: string; top?: number; orderBy?: string }
  ) => {
    setState((s) => ({ ...s, loading: true, error: null, lastAction: 'query' }));
    try {
      const service = TABLE_SERVICES[tablePluralName];
      if (!service) {
        throw new Error(`Table "${tablePluralName}" not available for querying. Available: ${Object.keys(TABLE_SERVICES).join(', ')}`);
      }

      const result = await executeDataverseQuery(
        tablePluralName,
        options,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        service.getAll as any
      );
      setState((s) => ({ ...s, queryResult: result, loading: false }));
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setState((s) => ({ ...s, loading: false, error: msg }));
      return null;
    }
  }, []);

  return { ...state, search, fetchSchema, query };
}
