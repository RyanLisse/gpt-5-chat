import { type Dispatch, memo, type SetStateAction, useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { artifactDefinitions, type UIArtifact } from './artifact';
import type { ArtifactActionContext } from './create-artifact';
import { Button } from './ui/button';
import { Toggle } from './ui/toggle';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

type ArtifactActionsProps = {
  artifact: UIArtifact;
  handleVersionChange: (type: 'next' | 'prev' | 'toggle' | 'latest') => void;
  currentVersionIndex: number;
  isCurrentVersion: boolean;
  mode: 'edit' | 'diff';
  metadata: any;
  setMetadata: Dispatch<SetStateAction<any>>;
  isReadonly: boolean;
};

function PureArtifactActions({
  artifact,
  handleVersionChange,
  currentVersionIndex,
  isCurrentVersion,
  mode,
  metadata,
  setMetadata,
  isReadonly,
}: ArtifactActionsProps) {
  const [isLoading, setIsLoading] = useState(false);

  const artifactDefinition = artifactDefinitions.find(
    (definition) => definition.kind === artifact.kind,
  );

  if (!artifactDefinition) {
    throw new Error('Artifact definition not found!');
  }

  const actionContext: ArtifactActionContext = {
    content: artifact.content,
    handleVersionChange,
    currentVersionIndex,
    isCurrentVersion,
    mode,
    metadata,
    setMetadata,
    isReadonly,
  };

  return (
    <div className="flex flex-row gap-1">
      {artifactDefinition.actions
        .filter((action) => {
          // Hide editing actions when readonly, keep view/copy actions
          if (isReadonly) {
            return (
              action.description === 'View changes' ||
              action.description === 'View Previous version' ||
              action.description === 'View Next version' ||
              action.description === 'Copy to clipboard'
            );
          }
          return true;
        })
        .map((action) => (
          <Tooltip key={action.description}>
            <TooltipTrigger asChild>
              {action.description === 'View changes' ? (
                <div>
                  <Toggle
                    className={cn('h-fit', {
                      'p-2': !action.label,
                      'px-2 py-1.5': action.label,
                    })}
                    disabled={
                      isLoading || artifact.status === 'streaming'
                        ? true
                        : action.isDisabled
                          ? action.isDisabled(actionContext)
                          : false
                    }
                    onClick={async () => {
                      setIsLoading(true);

                      try {
                        await Promise.resolve(action.onClick(actionContext));
                      } catch (_error) {
                        toast.error('Failed to execute action');
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                    pressed={mode === 'diff'}
                  >
                    {action.icon}
                    {action.label}
                  </Toggle>
                </div>
              ) : (
                <Button
                  className={cn('h-fit dark:hover:bg-zinc-700', {
                    'p-2': !action.label,
                    'px-2 py-1.5': action.label,
                  })}
                  disabled={
                    isLoading || artifact.status === 'streaming'
                      ? true
                      : action.isDisabled
                        ? action.isDisabled(actionContext)
                        : false
                  }
                  onClick={async () => {
                    setIsLoading(true);

                    try {
                      await Promise.resolve(action.onClick(actionContext));
                    } catch (_error) {
                      toast.error('Failed to execute action');
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  variant="outline"
                >
                  {action.icon}
                  {action.label}
                </Button>
              )}
            </TooltipTrigger>
            <TooltipContent>{action.description}</TooltipContent>
          </Tooltip>
        ))}
    </div>
  );
}

export const ArtifactActions = memo(
  PureArtifactActions,
  (prevProps, nextProps) => {
    if (prevProps.artifact.status !== nextProps.artifact.status) {
      return false;
    }
    if (prevProps.currentVersionIndex !== nextProps.currentVersionIndex) {
      return false;
    }
    if (prevProps.isCurrentVersion !== nextProps.isCurrentVersion) {
      return false;
    }
    if (prevProps.artifact.content !== nextProps.artifact.content) {
      return false;
    }
    if (prevProps.isReadonly !== nextProps.isReadonly) {
      return false;
    }
    if (prevProps.mode !== nextProps.mode) {
      return false;
    }

    return true;
  },
);
