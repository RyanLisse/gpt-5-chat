import { Settings2 } from 'lucide-react';
import React, { type Dispatch, type SetStateAction } from 'react';
import { getModelDefinition } from '@/lib/ai/all-models';
import type { UiToolName } from '@/lib/ai/types';
import { enabledTools, toolDefinitions } from './chat-features-definitions';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
// removed unused Popover imports
import { Separator } from './ui/separator';

type ModelFeatures = {
  hasUnspecifiedFeatures: boolean;
};

function useModelFeatures(selectedModelId: string): ModelFeatures {
  return React.useMemo(() => {
    try {
      const modelDef = getModelDefinition(selectedModelId as any);
      return {
        hasUnspecifiedFeatures: !modelDef.features,
      };
    } catch {
      return {
        hasUnspecifiedFeatures: false,
      };
    }
  }, [selectedModelId]);
}

function ToolsDropdownTrigger() {
  return (
    <Button
      className="h-fit @[400px]:gap-2 gap-1 rounded-full p-1.5 px-2.5"
      size="sm"
      variant="ghost"
    >
      <Settings2 size={14} />
      <span className="@[400px]:inline hidden">Tools</span>
    </Button>
  );
}

function ToolMenuItem({
  toolKey,
  isActive,
  isDisabled,
  hasUnspecifiedFeatures,
  onToolSelect,
}: {
  toolKey: UiToolName;
  isActive: boolean;
  isDisabled: boolean;
  hasUnspecifiedFeatures: boolean;
  onToolSelect: (tool: UiToolName | null) => void;
}) {
  const tool = toolDefinitions[toolKey];
  const Icon = tool.icon;

  return (
    <DropdownMenuItem
      className="flex items-center gap-2"
      disabled={isDisabled}
      key={toolKey}
      onClick={(e) => {
        e.stopPropagation();
        onToolSelect(isActive ? null : toolKey);
      }}
    >
      <Icon size={14} />
      <span>{tool.name}</span>
      {isActive && <span className="text-xs opacity-70">✓</span>}
      {hasUnspecifiedFeatures && (
        <span className="text-xs opacity-60">(not supported)</span>
      )}
    </DropdownMenuItem>
  );
}

function ActiveToolButton({
  activeTool,
  onClear,
}: {
  activeTool: UiToolName;
  onClear: () => void;
}) {
  const tool = toolDefinitions[activeTool];

  return (
    <>
      <Separator
        className="h-4 bg-muted-foreground/50"
        orientation="vertical"
      />
      <Button
        className="h-fit @[400px]:gap-2 gap-1 rounded-full p-1.5 px-2.5"
        onClick={onClear}
        size="sm"
        variant="outline"
      >
        {React.createElement(tool.icon, { size: 14 })}
        <span className="@[500px]:inline hidden">{tool.name}</span>
        <span className="text-xs opacity-70">×</span>
      </Button>
    </>
  );
}

export function ResponsiveTools({
  tools,
  setTools,
  selectedModelId,
}: {
  tools: UiToolName | null;
  setTools: Dispatch<SetStateAction<UiToolName | null>>;
  selectedModelId: string;
}) {
  const { hasUnspecifiedFeatures } = useModelFeatures(selectedModelId);
  const activeTool = tools;

  const handleToolSelect = React.useCallback(
    (tool: UiToolName | null) => {
      if (hasUnspecifiedFeatures && tool !== null) {
        return;
      }
      setTools(tool);
    },
    [hasUnspecifiedFeatures, setTools],
  );

  const handleClearTool = React.useCallback(() => {
    handleToolSelect(null);
  }, [handleToolSelect]);

  return (
    <div className="flex items-center @[400px]:gap-2 gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <ToolsDropdownTrigger />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-48"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {enabledTools.map((key) => (
            <ToolMenuItem
              hasUnspecifiedFeatures={hasUnspecifiedFeatures}
              isActive={tools === key}
              isDisabled={hasUnspecifiedFeatures}
              key={key}
              onToolSelect={handleToolSelect}
              toolKey={key}
            />
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {activeTool && (
        <ActiveToolButton activeTool={activeTool} onClear={handleClearTool} />
      )}
    </div>
  );
}
