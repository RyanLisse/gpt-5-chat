'use client';

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { toast } from 'sonner';
import type { ModelId } from '@/lib/ai/model-id';

type DefaultModelContextType = {
  defaultModel: ModelId;
  changeModel: (modelId: ModelId) => Promise<void>;
};

const DefaultModelContext = createContext<DefaultModelContextType | undefined>(
  undefined,
);

type DefaultModelClientProviderProps = {
  children: ReactNode;
  defaultModel: ModelId;
};

export function DefaultModelProvider({
  children,
  defaultModel: initialModel,
}: DefaultModelClientProviderProps) {
  const [currentModel, setCurrentModel] = useState<ModelId>(initialModel);

  const changeModel = useCallback(
    async (modelId: ModelId) => {
      // Update local state immediately
      setCurrentModel(modelId);

      try {
        // Update cookies for persistence
        await fetch('/api/chat-model', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ model: modelId }),
        });
      } catch (_error) {
        toast.error('Failed to save model preference');
        // Revert on error
        setCurrentModel(initialModel);
      }
    },
    [initialModel],
  );

  const value = useMemo(
    () => ({
      defaultModel: currentModel,
      changeModel,
    }),
    [currentModel, changeModel],
  );

  return (
    <DefaultModelContext.Provider value={value}>
      {children}
    </DefaultModelContext.Provider>
  );
}

export function useDefaultModel() {
  const context = useContext(DefaultModelContext);
  if (context === undefined) {
    throw new Error(
      'useDefaultModel must be used within a DefaultModelProvider',
    );
  }
  return context.defaultModel;
}

export function useModelChange() {
  const context = useContext(DefaultModelContext);
  if (context === undefined) {
    throw new Error(
      'useModelChange must be used within a DefaultModelProvider',
    );
  }
  return context.changeModel;
}
