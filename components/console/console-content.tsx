import { useEffect, useRef } from 'react';
import type { ConsoleOutput } from '../console';
import { ConsoleOutputItem } from './console-output-item';

type ConsoleContentProps = {
  consoleOutputs: ConsoleOutput[];
};

export function ConsoleContent({ consoleOutputs }: ConsoleContentProps) {
  const consoleEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [consoleOutputs]);

  return (
    <div>
      {consoleOutputs.map((consoleOutput, index) => (
        <ConsoleOutputItem
          consoleOutput={consoleOutput}
          index={index}
          key={consoleOutput.id}
        />
      ))}
      <div ref={consoleEndRef} />
    </div>
  );
}
