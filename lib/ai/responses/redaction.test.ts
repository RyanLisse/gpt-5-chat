import { describe, expect, it } from 'vitest';
import { redactSensitiveData } from './redaction';

describe('redactSensitiveData', () => {
  it('should redact sensitive keys in object', () => {
    const input = {
      username: 'john',
      apiKey: 'secret-api-key',
      password: 'user-password',
      normal: 'not-sensitive',
    };

    const result = redactSensitiveData(input);

    expect(result).toEqual({
      username: 'john',
      apiKey: '[REDACTED]',
      password: '[REDACTED]',
      normal: 'not-sensitive',
    });
  });

  it('should handle null and undefined values', () => {
    expect(redactSensitiveData(null)).toBe(null);
    expect(redactSensitiveData(undefined)).toBe(undefined);
  });

  it('should handle arrays with nested objects', () => {
    const input = [
      { name: 'item1', token: 'secret-token' },
      { name: 'item2', key: 'api-key' },
      'string-item',
      42,
    ];

    const result = redactSensitiveData(input);

    expect(result).toEqual([
      { name: 'item1', token: '[REDACTED]' },
      { name: 'item2', key: '[REDACTED]' },
      'string-item',
      42,
    ]);
  });

  it('should handle nested objects with sensitive keys', () => {
    const input = {
      user: {
        name: 'John',
        credentials: {
          apiKey: 'secret-key',
          secret: 'top-secret',
        },
        preferences: {
          theme: 'dark',
        },
      },
      config: {
        timeout: 5000,
        authToken: 'bearer-token',
      },
    };

    const result = redactSensitiveData(input);

    expect(result).toEqual({
      user: {
        name: 'John',
        credentials: {
          apiKey: '[REDACTED]',
          secret: '[REDACTED]',
        },
        preferences: {
          theme: 'dark',
        },
      },
      config: {
        timeout: 5000,
        authToken: '[REDACTED]',
      },
    });
  });

  it('should handle primitive values without modification', () => {
    expect(redactSensitiveData('string')).toBe('string');
    expect(redactSensitiveData(42)).toBe(42);
    expect(redactSensitiveData(true)).toBe(true);
    expect(redactSensitiveData(false)).toBe(false);
  });

  it('should handle empty objects and arrays', () => {
    expect(redactSensitiveData({})).toEqual({});
    expect(redactSensitiveData([])).toEqual([]);
  });

  it('should handle case-insensitive sensitive key detection', () => {
    const input = {
      API_KEY: 'uppercase-key',
      apikey: 'lowercase-key',
      ApiSecret: 'mixed-case-secret',
      TOKEN: 'uppercase-token',
      normal_field: 'safe',
    };

    const result = redactSensitiveData(input);

    expect(result).toEqual({
      API_KEY: '[REDACTED]',
      apikey: '[REDACTED]',
      ApiSecret: '[REDACTED]',
      TOKEN: '[REDACTED]',
      normal_field: 'safe',
    });
  });

  it('should handle different sensitive key patterns', () => {
    const input = {
      accessToken: 'token-value',
      secretKey: 'secret-value',
      authHeader: 'auth-value',
      passwordHash: 'hash-value',
      refreshToken: 'refresh-value',
      clientSecret: 'client-secret',
      regularField: 'normal-value',
    };

    const result = redactSensitiveData(input);

    expect(result).toEqual({
      accessToken: '[REDACTED]',
      secretKey: '[REDACTED]',
      authHeader: '[REDACTED]',
      passwordHash: '[REDACTED]',
      refreshToken: '[REDACTED]',
      clientSecret: '[REDACTED]',
      regularField: 'normal-value',
    });
  });

  it('should handle objects with null and undefined nested values', () => {
    const input = {
      user: null,
      config: undefined,
      apiKey: 'secret',
      data: {
        nested: null,
        token: 'secret-token',
      },
    };

    const result = redactSensitiveData(input);

    expect(result).toEqual({
      user: null,
      config: undefined,
      apiKey: '[REDACTED]',
      data: {
        nested: null,
        token: '[REDACTED]',
      },
    });
  });

  it('should handle deeply nested structures', () => {
    const input = {
      level1: {
        level2: {
          level3: {
            apiKey: 'deep-secret',
            data: 'normal-data',
          },
        },
      },
    };

    const result = redactSensitiveData(input);

    expect(result).toEqual({
      level1: {
        level2: {
          level3: {
            apiKey: '[REDACTED]',
            data: 'normal-data',
          },
        },
      },
    });
  });

  it('should handle arrays with mixed data types', () => {
    const input = [
      'string',
      42,
      { token: 'secret' },
      null,
      undefined,
      [{ key: 'nested-secret' }],
    ];

    const result = redactSensitiveData(input);

    expect(result).toEqual([
      'string',
      42,
      { token: '[REDACTED]' },
      null,
      undefined,
      [{ key: '[REDACTED]' }],
    ]);
  });

  it('should handle objects with non-object values for sensitive keys', () => {
    const input = {
      apiKey: 'string-value',
      secret: 123,
      token: true,
      auth: null,
      password: undefined,
      normalField: 'normal',
    };

    const result = redactSensitiveData(input);

    expect(result).toEqual({
      apiKey: '[REDACTED]',
      secret: '[REDACTED]',
      token: '[REDACTED]',
      auth: '[REDACTED]',
      password: '[REDACTED]',
      normalField: 'normal',
    });
  });
});
