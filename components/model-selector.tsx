'use client';

import { ChevronUpIcon, FilterIcon } from 'lucide-react';
import { useSession } from 'next-auth/react';
import {
  type ComponentProps,
  memo,
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { ModelCard } from '@/components/model-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { LoginCtaBanner } from '@/components/upgrade-cta/login-cta-banner';
import {
  chatModels,
  getModelDefinition,
  type ModelDefinition,
} from '@/lib/ai/all-models';
import type { ModelId } from '@/lib/ai/model-id';
import { getEnabledFeatures } from '@/lib/features-config';
import { ANONYMOUS_LIMITS } from '@/lib/types/anonymous';
import { cn } from '@/lib/utils';
import type { ProviderId } from '@/providers/models-generated';
import { getProviderIcon } from './get-provider-icon';

type FeatureFilter = Record<string, boolean>;

// Pre-compute static data outside component to avoid re-computation
const enabledFeatures = getEnabledFeatures();
const initialFilters = enabledFeatures.reduce<FeatureFilter>((acc, feature) => {
  acc[feature.key] = false;
  return acc;
}, {});

// Cache model definitions to avoid repeated calls
const modelDefinitionsCache = new Map<ModelId, ModelDefinition>();
const getModelDefinitionCached = (modelId: ModelId) => {
  if (!modelDefinitionsCache.has(modelId)) {
    modelDefinitionsCache.set(modelId, getModelDefinition(modelId));
  }

  const res = modelDefinitionsCache.get(modelId);
  if (!res) {
    throw new Error(`Model definition not found for ${modelId}`);
  }
  return res;
};

function getFeatureIcons(modelDefinition: any) {
  const features = modelDefinition.features;
  if (!features) {
    return [];
  }

  const icons: JSX.Element[] = [];

  // Get enabled features for icon mapping
  const enabledFeatures = getEnabledFeatures();

  // Map features to icons
  const featureIconMap = [
    {
      key: 'reasoning',
      condition: features.reasoning,
      config: enabledFeatures.find((f) => f.key === 'reasoning'),
    },
    {
      key: 'functionCalling',
      condition: features.functionCalling,
      config: enabledFeatures.find((f) => f.key === 'functionCalling'),
    },
    {
      key: 'imageInput',
      condition: features.input?.image,
      config: enabledFeatures.find((f) => f.key === 'imageInput'),
    },
    {
      key: 'pdfInput',
      condition: features.input?.pdf,
      config: enabledFeatures.find((f) => f.key === 'pdfInput'),
    },
  ];

  featureIconMap.forEach(({ condition, config }) => {
    if (condition && config) {
      const IconComponent = config.icon;
      icons.push(
        <div
          className="flex items-center"
          key={config.key}
          title={config.description}
        >
          <IconComponent className="h-3 w-3 text-muted-foreground" />
        </div>,
      );
    }
  });

  return icons;
}

export function PureModelSelector({
  selectedModelId,
  className,
  onModelChange,
}: {
  selectedModelId: ModelId;
  onModelChange?: (modelId: ModelId) => void;
} & ComponentProps<typeof Button>) {
  const [open, setOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [optimisticModelId, setOptimisticModelId] = useState(selectedModelId);

  // Sync optimistic state when selectedModelId prop changes
  useEffect(() => {
    setOptimisticModelId(selectedModelId);
  }, [selectedModelId]);

  const { data: session } = useSession();
  const isAnonymous = !session?.user;

  const [featureFilters, setFeatureFilters] =
    useState<FeatureFilter>(initialFilters);

  // Memoize expensive computations
  const filteredModels = useMemo(() => {
    const hasActiveFilters = Object.values(featureFilters).some(Boolean);

    if (!hasActiveFilters) {
      return chatModels;
    }

    return chatModels.filter((model) => {
      const modelDef = getModelDefinitionCached(model.id);
      const features = modelDef?.features;

      if (!features) {
        return false;
      }

      // Check each active filter
      return Object.entries(featureFilters).every(([key, isActive]) => {
        if (!isActive) {
          return true;
        }

        switch (key) {
          case 'reasoning':
            return features.reasoning;
          case 'functionCalling':
            return features.functionCalling;
          case 'imageInput':
            return features.input.image;
          case 'pdfInput':
            return features.input.pdf;
          case 'audioInput':
            return features.input.audio;
          case 'imageOutput':
            return features.output.image;
          case 'audioOutput':
            return features.output.audio;
          default:
            return true;
        }
      });
    });
  }, [featureFilters]);

  // Memoize model availability checks
  const modelAvailability = useMemo(() => {
    const isModelAvailableForAnonymous = (modelId: ModelId) => {
      return ANONYMOUS_LIMITS.AVAILABLE_MODELS.includes(modelId as any);
    };

    const isModelDisabled = (modelId: ModelId) => {
      return isAnonymous && !isModelAvailableForAnonymous(modelId);
    };

    return {
      isModelDisabled,
      hasDisabledModels:
        isAnonymous &&
        filteredModels.some((model) => isModelDisabled(model.id)),
    };
  }, [isAnonymous, filteredModels]);

  const selectedChatModel = useMemo(
    () => chatModels.find((chatModel) => chatModel.id === optimisticModelId),
    [optimisticModelId],
  );

  // Get selected model's provider icon
  const selectedModelDefinition = useMemo(() => {
    if (!selectedChatModel) {
      return null;
    }
    return getModelDefinitionCached(selectedChatModel.id);
  }, [selectedChatModel]);

  const selectedProviderIcon = useMemo(() => {
    if (!selectedModelDefinition) {
      return null;
    }
    const provider = selectedModelDefinition.owned_by as ProviderId;
    return getProviderIcon(provider);
  }, [selectedModelDefinition]);

  const activeFilterCount = useMemo(
    () => Object.values(featureFilters).filter(Boolean).length,
    [featureFilters],
  );

  const clearFilters = useCallback(() => {
    setFeatureFilters(initialFilters);
  }, []);

  // Only render the expensive popover content when it's open
  const popoverContent = useMemo(() => {
    if (!open) {
      return null;
    }

    return (
      <Command>
        <div className="flex items-center border-b">
          <CommandInput
            className="px-3"
            containerClassName="w-full border-0"
            placeholder="Search models..."
          />
          <Popover onOpenChange={setFilterOpen} open={filterOpen}>
            <PopoverTrigger asChild>
              <Button
                className={cn(
                  'relative mr-3 h-8 w-8 p-0',
                  activeFilterCount > 0 && 'text-primary',
                )}
                size="sm"
                variant="ghost"
              >
                <FilterIcon className="h-4 w-4" />
                {activeFilterCount > 0 && (
                  <Badge
                    className="-top-1 -right-1 absolute flex h-4 min-w-[16px] items-center justify-center p-0 text-xs"
                    variant="secondary"
                  >
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="p-0">
              <div className="p-4">
                <div className="mb-3 flex h-7 items-center justify-between">
                  <div className="font-medium text-sm">Filter by Tools</div>
                  {activeFilterCount > 0 && (
                    <Button
                      className="h-6 text-xs"
                      onClick={clearFilters}
                      size="sm"
                      variant="ghost"
                    >
                      Clear filters
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {enabledFeatures.map((feature) => {
                    const IconComponent = feature.icon;

                    return (
                      <div
                        className="flex items-center space-x-2"
                        key={feature.key}
                      >
                        <Checkbox
                          checked={featureFilters[feature.key]}
                          id={feature.key}
                          onCheckedChange={(checked) =>
                            setFeatureFilters((prev) => ({
                              ...prev,
                              [feature.key]: Boolean(checked),
                            }))
                          }
                        />
                        <Label
                          className="flex items-center gap-1.5 text-sm"
                          htmlFor={feature.key}
                        >
                          <IconComponent className="h-3.5 w-3.5" />
                          {feature.name}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        {modelAvailability.hasDisabledModels && (
          <div className="p-3">
            <LoginCtaBanner
              compact
              message="Sign in to unlock all models."
              variant="default"
            />
          </div>
        )}
        <CommandList
          className="max-h-[400px]"
          onMouseDown={(event) => {
            event.stopPropagation();
          }}
        >
          <CommandEmpty>No model found.</CommandEmpty>
          <CommandGroup>
            <ScrollArea className="[&>[data-radix-scroll-area-viewport]]:max-h-[350px]">
              <TooltipProvider delayDuration={300}>
                {filteredModels.map((chatModel) => {
                  const { id } = chatModel;
                  const modelDefinition = getModelDefinitionCached(id);
                  const disabled = modelAvailability.isModelDisabled(id);
                  const provider = modelDefinition.owned_by as ProviderId;
                  const isSelected = id === optimisticModelId;
                  const featureIcons = getFeatureIcons(modelDefinition);

                  // Create searchable value combining model name and provider
                  const searchValue =
                    `${modelDefinition.name} ${modelDefinition.owned_by}`.toLowerCase();

                  return (
                    <Tooltip key={id}>
                      <TooltipTrigger asChild>
                        <div>
                          <CommandItem
                            className={cn(
                              'flex h-9 cursor-pointer items-center justify-between px-3 py-1.5 transition-all',
                              isSelected &&
                                'border-l-2 border-l-primary bg-primary/10',
                              disabled && 'cursor-not-allowed opacity-50',
                            )}
                            onSelect={(_event) => {
                              if (disabled) {
                                return; // Prevent selection of disabled models
                              }

                              startTransition(() => {
                                setOptimisticModelId(id);
                                onModelChange?.(id);
                                setOpen(false);
                              });
                            }}
                            value={searchValue}
                          >
                            <div className="flex min-w-0 flex-1 items-center gap-2.5">
                              <div className="flex-shrink-0">
                                {getProviderIcon(provider)}
                              </div>
                              <span className="truncate font-medium text-sm">
                                {modelDefinition.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {featureIcons.length > 0 && (
                                <div className="flex flex-shrink-0 items-center gap-1">
                                  {featureIcons}
                                </div>
                              )}
                            </div>
                          </CommandItem>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent
                        align="start"
                        className="p-0"
                        side="right"
                        sideOffset={8}
                      >
                        <ModelCard
                          className="w-[280px] border shadow-lg"
                          disabledReason={
                            disabled
                              ? 'Sign in to access this model'
                              : undefined
                          }
                          isDisabled={disabled}
                          isSelected={isSelected}
                          model={modelDefinition}
                        />
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </TooltipProvider>
            </ScrollArea>
          </CommandGroup>
        </CommandList>
      </Command>
    );
  }, [
    open,
    filterOpen,
    activeFilterCount,
    featureFilters,
    filteredModels,
    modelAvailability,
    optimisticModelId,
    setOptimisticModelId,
    onModelChange,
    clearFilters,
  ]);

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          aria-expanded={open}
          className={cn('w-fit gap-0 md:h-[34px] md:px-2', className)}
          data-testid="model-selector"
          role="combobox"
          variant="ghost"
        >
          <div className="flex items-center gap-2">
            {selectedProviderIcon && (
              <div className="flex-shrink-0">{selectedProviderIcon}</div>
            )}
            <p className="truncate">{selectedChatModel?.name}</p>
          </div>
          <ChevronUpIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[350px] p-0">
        {popoverContent}
      </PopoverContent>
    </Popover>
  );
}

export const ModelSelector = memo(PureModelSelector, (prevProps, nextProps) => {
  return (
    prevProps.selectedModelId === nextProps.selectedModelId &&
    prevProps.className === nextProps.className &&
    prevProps.onModelChange === nextProps.onModelChange
  );
});
