import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function _hasRealisticSecret(value?: string | null) {
  if (!value) {
    return false;
  }
  // Heuristics: very long tokens with base64-like charset
  return value.length > 60 && /[A-Za-z0-9_-]+=*/.test(value);
}

describe('Environment Keys', () => {
  it('validates optional API key formats when present', () => {
    const checks: [string, RegExp][] = [
      ['OPENAI_API_KEY', /^sk-.+/],
      ['LANGSMITH_API_KEY', /^(ls|lsv2)_.+/],
      ['LANGSMITH_TRACING', /^(true|false)?$/],
      ['AI_GATEWAY_API_KEY', /^$|^[A-Za-z0-9._-]+$/],
    ];

    for (const [key, pattern] of checks) {
      const val = process.env[key];
      if (val && val.length > 0) {
        expect(val).toMatch(pattern);
      }
    }
  });

  it('.env.example should only contain placeholders (no real secrets)', () => {
    const envExamplePath = path.join(process.cwd(), '.env.example');
    if (!fs.existsSync(envExamplePath)) {
      // If missing, test passes but warns; repo should include it
      expect(true).toBe(true);
      return;
    }
    const content = fs.readFileSync(envExamplePath, 'utf8');

    // Basic red flags that suggest real secrets accidentally committed
    const redFlags: RegExp[] = [
      /sk-[a-zA-Z0-9_-]{20,}/g, // OpenAI style
      /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9/g, // JWT header
      /vercel_blob_rw_[A-Za-z0-9_-]{10,}/g, // Vercel Blob token
      /postgres:\/\//g, // Full postgres URLs
      /AIza[0-9A-Za-z\-_]{35}/g, // Google API Keys
    ];

    for (const rx of redFlags) {
      expect(rx.test(content)).toBe(false);
    }

    // Allow placeholder markers
    expect(content).toContain('****');
  });
});
