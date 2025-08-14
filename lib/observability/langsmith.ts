// Minimal wrapper for LangSmith tracing around any async function.
// Works only if LANGSMITH_TRACING is enabled and langsmith is installed.
// Safe no-op if env not set or module not available.

type Traceable = <TArgs extends any[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  options?: { name?: string },
) => (...args: TArgs) => Promise<TReturn>;

let traceableFn: Traceable | null = null;

(async () => {
  try {
    if (process.env.LANGSMITH_TRACING === 'true') {
      const mod = await import('langsmith');
      // TDD London School: Mock implementation for unavailable traceable function
      if ('traceable' in mod && typeof (mod as any).traceable === 'function') {
        traceableFn = (mod as any).traceable as unknown as Traceable;
      } else {
        // Create mock traceable function if not available in langsmith version
        traceableFn = (<TArgs extends any[], TReturn>(
          fn: (...args: TArgs) => Promise<TReturn>,
          _options?: { name?: string },
        ) => fn) as Traceable;
      }
    }
  } catch {
    // langsmith not installed or unavailable; remain no-op
    traceableFn = null;
  }
})();

export async function withTrace<T>(
  name: string,
  fn: () => T | Promise<T>,
): Promise<T> {
  if (traceableFn) {
    const wrapped = traceableFn(async () => await fn(), { name });
    return wrapped();
  }
  return await fn();
}
