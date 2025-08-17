import { Building, Calendar, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { ModelDefinition } from '@/lib/ai/all-models';
import { getFeatureConfig, isFeatureEnabled } from '@/lib/features-config';
import { cn } from '@/lib/utils';
import type { ProviderId } from '@/providers/models-generated';
import { getProviderIcon } from './get-provider-icon';

const PlaceholderIcon = () => <Building className="h-6 w-6" />;

const getFeatureIconsForCard = (model: ModelDefinition) => {
  const icons: React.ReactNode[] = [];

  // Check for reasoning capability
  if (model.features?.reasoning && isFeatureEnabled('reasoning')) {
    const config = getFeatureConfig('reasoning');
    if (config?.icon) {
      const IconComponent = config.icon;
      icons.push(
        <Tooltip key="reasoning">
          <TooltipTrigger asChild>
            <div className="rounded bg-muted p-1.5">
              <IconComponent className="h-3.5 w-3.5" />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{config.description}</p>
          </TooltipContent>
        </Tooltip>,
      );
    }
  }

  return icons;
};

export function ModelCard({
  model,
  isSelected,
  isDisabled,
  disabledReason,
  className,
}: {
  model: ModelDefinition;
  isSelected?: boolean;
  isDisabled?: boolean;
  disabledReason?: string;
  className?: string;
}) {
  const provider = model.owned_by as ProviderId;
  const description = model.description;
  const maxTokens = model.max_tokens;
  const contextLength = model.context_window;
  const hasFeatures = model.features && Object.keys(model.features).length > 0;

  const _featureIcons = getFeatureIconsForCard(model);

  // Show placeholder if disabled with reason
  if (isDisabled && disabledReason) {
    return (
      <div
        className={cn(
          'group flex cursor-not-allowed flex-col items-start rounded-lg border p-4 opacity-50 transition-all',
          'border-border bg-muted/50',
          className,
        )}
      >
        {/* Header */}
        <div className="mb-3 flex w-full items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-muted p-1 transition-transform">
              <PlaceholderIcon />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-sm">{model.name}</h3>
              <p className="text-muted-foreground text-xs capitalize">
                {provider}
              </p>
            </div>
          </div>
        </div>

        <div className="w-full text-center text-muted-foreground text-xs">
          {disabledReason}
        </div>
      </div>
    );
  }

  const cardContent = (
    <div
      className={cn(
        'group flex cursor-pointer flex-col items-start rounded-lg border p-4 transition-all hover:shadow-md',
        isSelected
          ? 'border-primary bg-primary/5 shadow-xs'
          : 'border-border hover:border-primary/50',
        isDisabled && 'cursor-not-allowed opacity-50 hover:shadow-none',
        className,
      )}
    >
      {/* Header */}
      <div className="mb-3 flex w-full items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-muted p-1 transition-transform group-hover:rotate-12">
            {getProviderIcon(provider, 24)}
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-sm">{model.name}</h3>
            <p className="text-muted-foreground text-xs capitalize">
              {provider}
            </p>
          </div>
        </div>
        {isSelected && <CheckCircle className="h-4 w-4 text-primary" />}
      </div>

      {/* Description */}
      {description && (
        <p className="mb-3 line-clamp-2 text-left text-muted-foreground text-xs">
          {description}
        </p>
      )}

      {/* Key Features Row */}

      <div className="flex items-center justify-start gap-3 text-start text-muted-foreground text-xs">
        {maxTokens && (
          <div className="flex items-center gap-1">
            <span className="font-medium">{maxTokens.toLocaleString()}</span>
            <span>Max out</span>
          </div>
        )}
        {contextLength && (
          <div className="flex items-center gap-1">
            <span className="font-medium">
              {contextLength.toLocaleString()}
            </span>
            <span>Max in</span>
          </div>
        )}
      </div>

      {/* Features Row */}
      {hasFeatures && (
        <div className="mt-3 flex w-full flex-wrap gap-1">
          {model.features?.reasoning && (
            <Badge className="text-xs" variant="outline">
              Reasoning
            </Badge>
          )}
          {model.features?.functionCalling && (
            <Badge className="text-xs" variant="outline">
              Function Calling
            </Badge>
          )}
          {model.features?.input?.image && (
            <Badge className="text-xs" variant="outline">
              Vision
            </Badge>
          )}
          {model.features?.input?.pdf && (
            <Badge className="text-xs" variant="outline">
              PDF
            </Badge>
          )}
        </div>
      )}

      {/* Pricing */}
      {model.pricing && (
        <div className="mt-3 flex w-full items-center gap-4 text-muted-foreground text-xs">
          {model.pricing.input && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>
                ${(Number(model.pricing.input) * 1_000_000).toFixed(2)}/1M in
              </span>
            </div>
          )}
          {model.pricing.output && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>
                ${(Number(model.pricing.output) * 1_000_000).toFixed(2)}/1M out
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (isDisabled) {
    return cardContent;
  }

  return <TooltipProvider>{cardContent}</TooltipProvider>;
}
