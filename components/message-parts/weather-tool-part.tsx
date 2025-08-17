import { Weather } from '../weather';

type WeatherToolPartProps = {
  part: Extract<
    import('@/lib/ai/types').ChatMessage['parts'][number],
    { type: 'tool-getWeather' }
  >;
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
