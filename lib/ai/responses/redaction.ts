// Simple recursive redaction for sensitive keys in metadata/annotations
export function redactSensitiveData<T = any>(value: T): T {
  const SENSITIVE = /(?:api|key|token|secret|auth|password)/i;

  function redact(obj: any): any {
    if (obj == null) {
      return obj;
    }
    if (Array.isArray(obj)) {
      return obj.map(redact);
    }
    if (typeof obj === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(obj)) {
        if (SENSITIVE.test(k)) {
          out[k] = '[REDACTED]';
        } else if (v && typeof v === 'object') {
          out[k] = redact(v);
        } else {
          out[k] = v as unknown;
        }
      }
      return out;
    }
    return obj;
  }

  return redact(value);
}
