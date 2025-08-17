/// <reference types="vitest" />
/// <reference types="vitest/globals" />

// Passthrough module to avoid TS2306 when importing from 'vitest'
export * from 'vitest';
export * from 'vitest/globals';
