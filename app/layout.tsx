import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Script from 'next/script';

import './globals.css';
import { Toaster } from 'sonner';
import { ThemeColorMeta } from '@/components/theme-color';
import { ThemeProvider } from '@/components/theme-provider';
import { TRPCReactProvider } from '@/trpc/react';

export const metadata: Metadata = {
  metadataBase: new URL('https://sparka.ai'),
  title: 'Sparka AI - AI for everyone, from everyone',
  description:
    'Multi-provider AI Chat - access Claude, ChatGPT, Gemini, and Grok with advanced features, open-source and production-ready.',
  openGraph: {
    siteName: 'Sparka AI',
    url: 'https://sparka.ai',
    title: 'Sparka AI - AI for everyone, from everyone',
    description:
      'Multi-provider AI Chat - access Claude, ChatGPT, Gemini, and Grok with advanced features, open-source and production-ready.',
  },
};

export const viewport = {
  maximumScale: 1, // Disable auto-zoom on mobile Safari
};

const geist = Geist({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-geist',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-geist-mono',
});

// Theme color meta is managed by a tiny client component to avoid inline scripts

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      className={`${geist.variable} ${geistMono.variable}`}
      // `next-themes` injects an extra classname to the body element to avoid
      // visual flicker before hydration. Hence the `suppressHydrationWarning`
      // prop is necessary to avoid the React hydration mismatch warning.
      // https://github.com/pacocoursey/next-themes?tab=readme-ov-file#with-app
      lang="en"
      suppressHydrationWarning
    >
      <head>
        {process.env.NODE_ENV !== 'production' ? (
          <Script
            src="https://unpkg.com/react-scan/dist/auto.global.js"
            strategy="beforeInteractive"
          />
        ) : null}
      </head>
      <body className="antialiased">
        <ThemeColorMeta />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          disableTransitionOnChange
          enableSystem
        >
          <Toaster position="top-center" />
          <TRPCReactProvider>{children}</TRPCReactProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
