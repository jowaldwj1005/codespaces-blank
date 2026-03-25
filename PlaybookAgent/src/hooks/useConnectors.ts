import { useState, useCallback } from 'react';
import { azureOpenAI, azureDocIntelligence, sapOData } from '../services/connectors';
import type { ResponsesApiRequest, SapODataRequest, AnalyzeDocumentRequest } from '../services/connectors';

interface UseConnectorState {
  result: unknown | null;
  loading: boolean;
  error: string | null;
  pollingStatus: string | null;
}

export function useConnectors() {
  const [state, setState] = useState<UseConnectorState>({
    result: null,
    loading: false,
    error: null,
    pollingStatus: null,
  });

  const callOpenAI = useCallback(async (request: ResponsesApiRequest) => {
    setState({ result: null, loading: true, error: null, pollingStatus: null });
    try {
      const response = await azureOpenAI.createResponse(request);
      setState({ result: response, loading: false, error: null, pollingStatus: null });
      return response;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setState({ result: null, loading: false, error: msg, pollingStatus: null });
      return null;
    }
  }, []);

  const callDocIntelligence = useCallback(async (body: AnalyzeDocumentRequest) => {
    setState({ result: null, loading: true, error: null, pollingStatus: 'Submitting document...' });
    try {
      const response = await azureDocIntelligence.analyzeAndWait(body);
      setState({
        result: response,
        loading: false,
        error: response.status === 'failed' ? 'Analysis failed' : response.status === 'timeout' ? 'Polling timed out' : null,
        pollingStatus: null,
      });
      return response;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setState({ result: null, loading: false, error: msg, pollingStatus: null });
      return null;
    }
  }, []);

  /** Submit only (no polling) - for manual control */
  const submitDocIntelligence = useCallback(async (body: AnalyzeDocumentRequest) => {
    setState({ result: null, loading: true, error: null, pollingStatus: null });
    try {
      const response = await azureDocIntelligence.analyzeDocument(body);
      setState({ result: response, loading: false, error: null, pollingStatus: null });
      return response;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setState({ result: null, loading: false, error: msg, pollingStatus: null });
      return null;
    }
  }, []);

  const callSapOData = useCallback(async (request: SapODataRequest) => {
    setState({ result: null, loading: true, error: null, pollingStatus: null });
    try {
      const response = await sapOData.execute(request);
      setState({ result: response, loading: false, error: null, pollingStatus: null });
      return response;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setState({ result: null, loading: false, error: msg, pollingStatus: null });
      return null;
    }
  }, []);

  return { ...state, callOpenAI, callDocIntelligence, submitDocIntelligence, callSapOData };
}
