import { GeneratedImage } from '../generated-image';

type GeneratedImageToolPartProps = {
  part: Extract<
    import('@/lib/ai/types').ChatMessage['parts'][number],
    { type: 'tool-generateImage' }
  >;
};

export function GeneratedImageToolPart({ part }: GeneratedImageToolPartProps) {
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
