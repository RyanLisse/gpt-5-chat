'use client';

import type { HTMLAttributes, ReactNode } from 'react';
import { createContext, useContext } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import {
  oneDark,
  oneLight,
} from 'react-syntax-highlighter/dist/esm/styles/prism';
import { CopyButton, type CopyButtonProps } from '@/components/ui/copy-button';
import { cn } from '@/lib/utils';

type CodeBlockContextType = {
  code: string;
};

const CodeBlockContext = createContext<CodeBlockContextType>({
  code: '',
});

export type CodeBlockProps = HTMLAttributes<HTMLDivElement> & {
  code: string;
  language: string;
  showLineNumbers?: boolean;
  children?: ReactNode;
};

type SyntaxHighlighterWrapperProps = {
  code: string;
  language: string;
  showLineNumbers: boolean;
  isDark: boolean;
};

const SyntaxHighlighterWrapper = ({
  code,
  language,
  showLineNumbers,
  isDark,
}: SyntaxHighlighterWrapperProps) => (
  <SyntaxHighlighter
    className={cn(
      'overflow-hidden',
      isDark ? 'hidden dark:block' : 'dark:hidden',
    )}
    codeTagProps={{
      className: 'font-mono text-sm',
    }}
    customStyle={{
      margin: 0,
      padding: '1rem',
      fontSize: '0.875rem',
      background: 'hsl(var(--background))',
      color: 'hsl(var(--foreground))',
    }}
    language={language}
    lineNumberStyle={{
      color: 'hsl(var(--muted-foreground))',
      paddingRight: '1rem',
      minWidth: '2.5rem',
    }}
    showLineNumbers={showLineNumbers}
    style={isDark ? oneDark : oneLight}
  >
    {code}
  </SyntaxHighlighter>
);

export const CodeBlock = ({
  code,
  language,
  showLineNumbers = false,
  className,
  children,
  ...props
}: CodeBlockProps) => (
  <CodeBlockContext.Provider value={{ code }}>
    <div
      className={cn(
        'relative w-full overflow-hidden rounded-md border bg-background text-foreground',
        className,
      )}
      {...props}
    >
      <div className="relative">
        <SyntaxHighlighterWrapper
          code={code}
          isDark={false}
          language={language}
          showLineNumbers={showLineNumbers}
        />
        <SyntaxHighlighterWrapper
          code={code}
          isDark={true}
          language={language}
          showLineNumbers={showLineNumbers}
        />
        {children && (
          <div className="absolute top-2 right-2 flex items-center gap-2">
            {children}
          </div>
        )}
      </div>
    </div>
  </CodeBlockContext.Provider>
);

export type CodeBlockCopyButtonProps = Omit<CopyButtonProps, 'text'> & {
  /**
   * @deprecated Use onSuccess instead
   */
  onCopy?: () => void;
};

export const CodeBlockCopyButton = ({
  onCopy,
  onSuccess,
  className,
  ...props
}: CodeBlockCopyButtonProps) => {
  const { code } = useContext(CodeBlockContext);

  // Handle deprecated onCopy prop
  const handleSuccess = onSuccess || onCopy;

  return (
    <CopyButton
      className={cn('shrink-0', className)}
      onSuccess={handleSuccess}
      size="icon"
      text={code}
      variant="ghost"
      {...props}
    />
  );
};
