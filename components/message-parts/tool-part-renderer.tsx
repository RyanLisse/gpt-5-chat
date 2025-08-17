import type { ChatMessage } from '@/lib/ai/types';
import { InteractiveStockChart } from '../interactive-stock-chart';
// Import direct components for simple cases
import { Retrieve } from '../retrieve';
import { DocumentToolPart } from './document-tool-part';
import { GeneratedImageToolPart } from './generated-image-tool-part';
import { WeatherToolPart } from './weather-tool-part';

type ToolPartRendererProps = {
  part: Exclude<ChatMessage['parts'][number], { type: 'text' | 'reasoning' }>;
  messageId: string;
  isReadonly: boolean;
};

export function ToolPartRenderer({
  part,
  messageId,
  isReadonly,
}: ToolPartRendererProps) {
  const { type } = part;

  switch (type) {
    case 'tool-getWeather':
      return <WeatherToolPart part={part} />;

    case 'tool-createDocument':
    case 'tool-updateDocument':
    case 'tool-requestSuggestions':
      return (
        <DocumentToolPart
          isReadonly={isReadonly}
          messageId={messageId}
          part={part}
        />
      );

    case 'tool-retrieve':
      return (
        <Retrieve
          result={
            part.state === 'output-available' ? (part.output as any) : undefined
          }
        />
      );

    case 'tool-readDocument':
      return (
        <div>
          Document read:{' '}
          {part.state === 'output-available'
            ? JSON.stringify(part.output)
            : 'Loading...'}
        </div>
      );

    case 'tool-stockChart':
      return part.state === 'output-available' ? (
        <InteractiveStockChart {...(part.output as any)} />
      ) : (
        <div>Loading stock chart...</div>
      );

    case 'tool-generateImage':
      return <GeneratedImageToolPart part={part} />;

    default:
      return null;
  }
}
