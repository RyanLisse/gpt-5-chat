import { toast } from 'sonner';
import {
  DEFAULT_CHAT_IMAGE_COMPATIBLE_MODEL,
  DEFAULT_PDF_MODEL,
  getModelDefinition,
} from '@/lib/ai/all-models';
import type { ModelId } from '@/lib/ai/model-id';

export function checkPdfCompatibility(
  selectedModelId: ModelId,
  handleModelChange: (modelId: ModelId) => void,
): void {
  const currentModelDef = getModelDefinition(selectedModelId);

  if (!currentModelDef.features?.input?.pdf) {
    const defaultPdfModelDef = getModelDefinition(DEFAULT_PDF_MODEL);
    toast.success(`Switched to ${defaultPdfModelDef.name} (supports PDF)`);
    handleModelChange(DEFAULT_PDF_MODEL);
  }
}

export function checkImageCompatibility(
  selectedModelId: ModelId,
  handleModelChange: (modelId: ModelId) => void,
): void {
  const currentModelDef = getModelDefinition(selectedModelId);

  if (!currentModelDef.features?.input?.image) {
    const defaultImageModelDef = getModelDefinition(
      DEFAULT_CHAT_IMAGE_COMPATIBLE_MODEL,
    );
    toast.success(`Switched to ${defaultImageModelDef.name} (supports images)`);
    handleModelChange(DEFAULT_CHAT_IMAGE_COMPATIBLE_MODEL);
  }
}

export function ensureModelCompatibility(
  pdfCount: number,
  imageCount: number,
  selectedModelId: ModelId,
  handleModelChange: (modelId: ModelId) => void,
): void {
  if (pdfCount > 0) {
    checkPdfCompatibility(selectedModelId, handleModelChange);
  }

  if (imageCount > 0) {
    checkImageCompatibility(selectedModelId, handleModelChange);
  }
}
