// Minimal wrapper for LangSmith tracing around any async function.
// Works only if LANGSMITH_TRACING is enabled and langsmith is installed.
// Safe no-op if env not set or module not available.

let traceableFn: (<TArgs extends any[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  options?: { name?: string },
) => (...args: TArgs) => Promise<TReturn>) | null = null;

(async () => {
  try {
    if (process.env.LANGSMITH_TRACING === 'true') {
      const mod = await import('langsmith');
      traceableFn = mod.traceable as typeof traceableFn;
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
