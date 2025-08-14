import { registerOTel } from '@vercel/otel';
import { siteConfig } from '@/lib/config';

export function register() {
  registerOTel({
    serviceName: siteConfig.appPrefix,
    // Using default exporter. Langfuse removed; prepare for LangSmith via env.
  });
}
