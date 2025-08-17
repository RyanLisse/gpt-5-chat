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

// Helper functions to reduce complexity
function isActionDisabled(
  action: any,
  actionContext: ArtifactActionContext,
  isLoading: boolean,
  artifact: UIArtifact,
): boolean {
  if (isLoading || artifact.status === 'streaming') {
    return true;
  }

  if (action.isDisabled) {
    return action.isDisabled(actionContext);
  }

  return false;
}

function shouldShowAction(action: any, isReadonly: boolean): boolean {
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
}

async function handleActionClick(
  action: any,
  actionContext: ArtifactActionContext,
  setIsLoading: (loading: boolean) => void,
): Promise<void> {
  setIsLoading(true);

  try {
    await Promise.resolve(action.onClick(actionContext));
  } catch (_error) {
    toast.error('Failed to execute action');
  } finally {
    setIsLoading(false);
  }
}

// Configuration object for artifact action context
type ArtifactActionConfig = {
  artifact: any;
  handleVersionChange: any;
  currentVersionIndex: number;
  isCurrentVersion: boolean;
  mode: 'edit' | 'diff';
  metadata: any;
  setMetadata: any;
  isReadonly: boolean;
};

// Hook for managing artifact action context and loading state
function useArtifactActionContext(config: ArtifactActionConfig) {
  const {
    artifact,
    handleVersionChange,
    currentVersionIndex,
    isCurrentVersion,
    mode,
    metadata,
    setMetadata,
    isReadonly,
  } = config;
  const [isLoading, setIsLoading] = useState(false);

  const actionContext: ArtifactActionContext = {
    content: artifact.content,
    handleVersionChange,
    currentVersionIndex,
    isCurrentVersion,
    mode: mode as 'edit' | 'diff',
    metadata,
    setMetadata,
    isReadonly,
  };

  return { actionContext, isLoading, setIsLoading };
}

// Component for rendering toggle-type actions (View changes)
function ToggleActionButton({
  action,
  actionContext,
  isLoading,
  artifact,
  mode,
  setIsLoading,
}: any) {
  return (
    <div>
      <Toggle
        className={cn('h-fit', {
          'p-2': !action.label,
          'px-2 py-1.5': action.label,
        })}
        disabled={isActionDisabled(action, actionContext, isLoading, artifact)}
        onClick={() => handleActionClick(action, actionContext, setIsLoading)}
        pressed={mode === 'diff'}
      >
        {action.icon}
        {action.label}
      </Toggle>
    </div>
  );
}

// Component for rendering button-type actions
function ButtonAction({
  action,
  actionContext,
  isLoading,
  artifact,
  setIsLoading,
}: any) {
  return (
    <Button
      className={cn('h-fit dark:hover:bg-zinc-700', {
        'p-2': !action.label,
        'px-2 py-1.5': action.label,
      })}
      disabled={isActionDisabled(action, actionContext, isLoading, artifact)}
      onClick={() => handleActionClick(action, actionContext, setIsLoading)}
      variant="outline"
    >
      {action.icon}
      {action.label}
    </Button>
  );
}

// Component for rendering individual action with tooltip
function ActionWithTooltip({
  action,
  actionContext,
  isLoading,
  artifact,
  mode,
  setIsLoading,
}: any) {
  return (
    <Tooltip key={action.description}>
      <TooltipTrigger asChild>
        {action.description === 'View changes' ? (
          <ToggleActionButton
            action={action}
            actionContext={actionContext}
            artifact={artifact}
            isLoading={isLoading}
            mode={mode}
            setIsLoading={setIsLoading}
          />
        ) : (
          <ButtonAction
            action={action}
            actionContext={actionContext}
            artifact={artifact}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
        )}
      </TooltipTrigger>
      <TooltipContent>{action.description}</TooltipContent>
    </Tooltip>
  );
}

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
  const artifactDefinition = artifactDefinitions.find(
    (definition) => definition.kind === artifact.kind,
  );

  if (!artifactDefinition) {
    throw new Error('Artifact definition not found!');
  }

  const { actionContext, isLoading, setIsLoading } = useArtifactActionContext({
    artifact,
    handleVersionChange,
    currentVersionIndex,
    isCurrentVersion,
    mode,
    metadata,
    setMetadata,
    isReadonly,
  });

  const filteredActions = artifactDefinition.actions.filter((action) =>
    shouldShowAction(action, isReadonly),
  );

  return (
    <div className="flex flex-row gap-1">
      {filteredActions.map((action) => (
        <ActionWithTooltip
          action={action}
          actionContext={actionContext}
          artifact={artifact}
          isLoading={isLoading}
          key={action.description}
          mode={mode}
          setIsLoading={setIsLoading}
        />
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
