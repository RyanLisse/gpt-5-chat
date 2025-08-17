import { useCallback } from 'react';
import { toast } from 'sonner';
import {
  DEFAULT_CHAT_IMAGE_COMPATIBLE_MODEL,
  DEFAULT_PDF_MODEL,
  getModelDefinition,
} from '@/lib/ai/all-models';
import type { ModelId } from '@/lib/ai/model-id';
import {
  categorizeFiles,
  getValidFiles,
  showFileValidationErrors,
} from './file-validation-utils';
import { ensureModelCompatibility } from './model-compatibility-utils';

type FileProcessingHook = {
  processFiles: (files: File[]) => File[];
  switchToPdfCompatibleModel: () => any;
  switchToImageCompatibleModel: () => any;
};

export const useFileProcessing = (
  selectedModelId: ModelId,
  handleModelChange: (modelId: ModelId) => void,
): FileProcessingHook => {
  const switchToPdfCompatibleModel = useCallback(() => {
    const defaultPdfModelDef = getModelDefinition(DEFAULT_PDF_MODEL);
    toast.success(`Switched to ${defaultPdfModelDef.name} (supports PDF)`);
    handleModelChange(DEFAULT_PDF_MODEL);
    return defaultPdfModelDef;
  }, [handleModelChange]);

  const switchToImageCompatibleModel = useCallback(() => {
    const defaultImageModelDef = getModelDefinition(
      DEFAULT_CHAT_IMAGE_COMPATIBLE_MODEL,
    );
    toast.success(`Switched to ${defaultImageModelDef.name} (supports images)`);
    handleModelChange(DEFAULT_CHAT_IMAGE_COMPATIBLE_MODEL);
    return defaultImageModelDef;
  }, [handleModelChange]);

  const processFiles = useCallback(
    (files: File[]) => {
      const categories = categorizeFiles(files);

      showFileValidationErrors(categories);

      const validFiles = getValidFiles(categories);

      if (validFiles.length > 0) {
        ensureModelCompatibility(
          categories.pdfFiles.length,
          categories.imageFiles.length,
          selectedModelId,
          handleModelChange,
        );
      }

      return validFiles;
    },
    [selectedModelId, handleModelChange],
  );

  return {
    processFiles,
    switchToPdfCompatibleModel,
    switchToImageCompatibleModel,
  };
};
