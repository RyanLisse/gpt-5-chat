import { FileText } from 'lucide-react';
import {
  ToolActionContainer,
  ToolActionContent,
  ToolActionKind,
} from './tool-action';

// Minimal local copy of the shape used by this component (legacy WebSearch update)
type WebSearchUpdate = {
  results?: Array<{
    url: string;
    title: string;
  }>;
};

// Base interface for all tool actions
type BaseToolActionProps = {
  index?: number;
};

// Web tool action for a single result
export const WebToolAction = ({
  result,
}: BaseToolActionProps & {
  result: NonNullable<WebSearchUpdate['results']>[number];
}) => {
  if (!result) {
    return null;
  }

  const faviconUrl = `https://www.google.com/s2/favicons?domain=${new URL(result.url).hostname}&sz=128`;

  return (
    <ToolActionContainer href={result.url}>
      <ToolActionKind
        icon={<FileText className="h-4 w-4 text-foreground/80" />}
        name="Reading Web"
      />
      <ToolActionContent faviconUrl={faviconUrl} title={result.title} />
    </ToolActionContainer>
  );
};
