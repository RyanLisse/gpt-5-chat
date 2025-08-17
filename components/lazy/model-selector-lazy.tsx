'use client';

import { lazy, Suspense } from 'react';
import type { ModelId } from '@/lib/ai/model-id';
import { ModelSelectorSkeleton } from '../loading-fallbacks';

// Lazy load the ModelSelector component
const ModelSelectorComponent = lazy(() =>
  import('../model-selector').then((module) => ({
    default: module.ModelSelector,
  })),
);

type ModelSelectorLazyProps = {
  selectedModelId: ModelId;
  onModelChange?: (modelId: ModelId) => void;
  className?: string;
};

export function ModelSelectorLazy(props: ModelSelectorLazyProps) {
  return (
    <Suspense fallback={<ModelSelectorSkeleton />}>
      <ModelSelectorComponent {...props} />
    </Suspense>
  );
}
