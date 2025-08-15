import { Settings2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
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

export function ResponsiveTools({
  tools,
  setTools,
  selectedModelId,
}: {
  tools: UiToolName | null;
  setTools: Dispatch<SetStateAction<UiToolName | null>>;
  selectedModelId: string;
}) {
  const { data: session } = useSession();
  // Guest mode: allow tools without requiring login
  const _isAnonymous = !session?.user;

  const { hasReasoningModel, hasUnspecifiedFeatures } = (() => {
    try {
      const modelDef = getModelDefinition(selectedModelId as any);
      return {
        hasReasoningModel: modelDef.features?.reasoning === true,
        hasUnspecifiedFeatures: !modelDef.features,
      };
    } catch {
      return {
        hasReasoningModel: false,
        hasUnspecifiedFeatures: false,
      };
    }
  })();

  const activeTool = tools;

  const setTool = (tool: UiToolName | null) => {
    if (hasUnspecifiedFeatures && tool !== null) {
      return;
    }

    setTools(tool);
  };

  return (
    <div className="flex items-center @[400px]:gap-2 gap-1">
      {
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              className="h-fit @[400px]:gap-2 gap-1 rounded-full p-1.5 px-2.5"
              size="sm"
              variant="ghost"
            >
              <Settings2 size={14} />
              <span className="@[400px]:inline hidden">Tools</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-48"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {enabledTools.map((key) => {
              const tool = toolDefinitions[key];
              const isToolDisabled = hasUnspecifiedFeatures;
              const Icon = tool.icon;
              return (
                <DropdownMenuItem
                  className="flex items-center gap-2"
                  disabled={isToolDisabled}
                  key={key}
                  onClick={(e) => {
                    e.stopPropagation();
                    setTool(tools === key ? null : key);
                  }}
                >
                  <Icon size={14} />
                  <span>{tool.name}</span>
                  {tools === key && (
                    <span className="text-xs opacity-70">✓</span>
                  )}
                  {hasUnspecifiedFeatures && (
                    <span className="text-xs opacity-60">(not supported)</span>
                  )}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      }

      {activeTool && (
        <>
          <Separator
            className="h-4 bg-muted-foreground/50"
            orientation="vertical"
          />
          <Button
            className="h-fit @[400px]:gap-2 gap-1 rounded-full p-1.5 px-2.5"
            onClick={() => setTool(null)}
            size="sm"
            variant="outline"
          >
            {React.createElement(toolDefinitions[activeTool].icon, {
              size: 14,
            })}
            <span className="@[500px]:inline hidden">
              {toolDefinitions[activeTool].name}
            </span>
            <span className="text-xs opacity-70">×</span>
          </Button>
        </>
      )}
    </div>
  );
}
