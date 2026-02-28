/**
 * AI Initialization Hook
 * Checks the Python AI backend readiness on app startup.
 */

import { useEffect, useState } from 'react';
import { getLocalAIStatus } from '@/lib/chat-stream-local';

export interface AIStatus {
  initialized: boolean;
  loading: boolean;
  error: string | null;
  status: {
    ollamaStatus: boolean;
    modelsAvailable: string[];
    ragEnabled: boolean;
    knowledgeBaseStats: {
      totalDocuments: number;
      categories: string[];
    };
  } | null;
}

/**
 * Hook to check AI backend readiness
 */
export function useAIInitialization() {
  const [aiStatus, setAIStatus] = useState<AIStatus>({
    initialized: false,
    loading: true,
    error: null,
    status: null,
  });

  useEffect(() => {
    const checkBackend = async () => {
      const useLocalAI = import.meta.env.VITE_USE_LOCAL_AI === 'true';

      if (!useLocalAI) {
        setAIStatus({
          initialized: true,
          loading: false,
          error: null,
          status: null,
        });
        return;
      }

      try {
        const status = await getLocalAIStatus();

        setAIStatus({
          initialized: status.ollamaStatus,
          loading: false,
          error: status.ollamaStatus ? null : 'Ollama not reachable',
          status,
        });
      } catch (error) {
        setAIStatus({
          initialized: false,
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          status: null,
        });
      }
    };

    checkBackend();
  }, []);

  return aiStatus;
}

/**
 * AI Status Display Component (optional)
 */
export function AIStatusIndicator({ status }: { status: AIStatus }) {
  if (!import.meta.env.VITE_USE_LOCAL_AI) {
    return null;
  }

  if (status.loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
        <span>Initializing AI...</span>
      </div>
    );
  }

  if (status.error) {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive">
        <div className="h-2 w-2 rounded-full bg-red-500" />
        <span>AI Error: {status.error}</span>
      </div>
    );
  }

  if (status.initialized && status.status) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <div className="h-2 w-2 rounded-full bg-green-500" />
        <span>
          Local AI Active ({status.status.knowledgeBaseStats.totalDocuments} docs)
        </span>
      </div>
    );
  }

  return null;
}
