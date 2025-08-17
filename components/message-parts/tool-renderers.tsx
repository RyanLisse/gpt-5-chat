'use client';

import type { ChatMessage } from '@/lib/ai/types';
import { GeneratedImage } from '../generated-image';
import { ReadDocument } from '../read-document';
import { Retrieve } from '../retrieve';
import { StockChartMessage } from '../stock-chart-message';
import { Weather } from '../weather';
import { DocumentToolPart } from './document-tool-part';

type ToolPart = ChatMessage['parts'][number];

type WeatherToolPartProps = {
  part: Extract<ToolPart, { type: 'tool-getWeather' }>;
};

export function WeatherToolPart({ part }: WeatherToolPartProps) {
  const { toolCallId, state } = part;

  if (state === 'input-available') {
    return (
      <div className="skeleton" key={toolCallId}>
        <Weather />
      </div>
    );
  }

  if (state === 'output-available') {
    const { output } = part;
    return (
      <div key={toolCallId}>
        <Weather weatherAtLocation={output} />
      </div>
    );
  }

  return null;
}

type RetrieveToolPartProps = {
  part: Extract<ToolPart, { type: 'tool-retrieve' }>;
};

export function RetrieveToolPart({ part }: RetrieveToolPartProps) {
  const { toolCallId, state } = part;

  if (state === 'input-available') {
    return (
      <div key={toolCallId}>
        <Retrieve />
      </div>
    );
  }

  if (state === 'output-available') {
    const { output } = part;
    return (
      <div key={toolCallId}>
        <Retrieve result={output as any} />
      </div>
    );
  }

  return null;
}

type ReadDocumentToolPartProps = {
  part: Extract<ToolPart, { type: 'tool-readDocument' }>;
};

export function ReadDocumentToolPart({ part }: ReadDocumentToolPartProps) {
  const { toolCallId, state } = part;

  if (state === 'input-available') {
    return null;
  }

  if (state === 'output-available') {
    const { output } = part;
    return (
      <div key={toolCallId}>
        <ReadDocument result={output as any} />
      </div>
    );
  }

  return null;
}

type StockChartToolPartProps = {
  part: Extract<ToolPart, { type: 'tool-stockChart' }>;
};

export function StockChartToolPart({ part }: StockChartToolPartProps) {
  const { toolCallId, state } = part;

  if (state === 'input-available') {
    const { input } = part;
    return (
      <div key={toolCallId}>
        <StockChartMessage args={input as any} result={null} />
      </div>
    );
  }

  if (state === 'output-available') {
    const { output, input } = part;
    return (
      <div key={toolCallId}>
        <StockChartMessage args={input as any} result={output as any} />
      </div>
    );
  }

  return null;
}

type GenerateImageToolPartProps = {
  part: Extract<ToolPart, { type: 'tool-generateImage' }>;
};

export function GenerateImageToolPart({ part }: GenerateImageToolPartProps) {
  const { toolCallId, state } = part;

  if (state === 'input-available') {
    const { input } = part;
    return (
      <div key={toolCallId}>
        <GeneratedImage args={input} isLoading={true} />
      </div>
    );
  }

  if (state === 'output-available') {
    const { output, input } = part;
    return (
      <div key={toolCallId}>
        <GeneratedImage args={input} result={output} />
      </div>
    );
  }

  return null;
}

type ToolRendererProps = {
  part: ToolPart;
  messageId: string;
  isReadonly: boolean;
};

export function ToolRenderer({
  part,
  messageId,
  isReadonly,
}: ToolRendererProps) {
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
      return <RetrieveToolPart part={part} />;

    case 'tool-readDocument':
      return <ReadDocumentToolPart part={part} />;

    case 'tool-stockChart':
      return <StockChartToolPart part={part} />;

    case 'tool-generateImage':
      return <GenerateImageToolPart part={part} />;

    default:
      return null;
  }
}
