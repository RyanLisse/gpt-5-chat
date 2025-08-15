import React, { memo } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { LinkMarkdown } from '@/components/chat/link-markdown';
import { ButtonCopy } from '@/components/common/button-copy';
import {
  CodeBlock,
  CodeBlockCode,
  CodeBlockGroup,
} from '@/components/prompt-kit/code-block';
import { cn } from '@/lib/utils';

function extractLanguage(className?: string): string {
  if (!className) {
    return 'plaintext';
  }
  const match = className.match(/language-(\w+)/);
  return match ? match[1] : 'plaintext';
}

export const components: Partial<Components> = {
  code({ className, children, ...props }) {
    const isInline =
      !props.node?.position?.start.line ||
      props.node?.position?.start.line === props.node?.position?.end.line;

    if (isInline) {
      return (
        <span
          className={cn('rounded-sm bg-card px-1 font-mono text-sm', className)}
          {...props}
        >
          {children}
        </span>
      );
    }

    const language = extractLanguage(className);

    return (
      <CodeBlock className={className}>
        <CodeBlockGroup className="flex h-9 items-center justify-between px-4">
          <div className="py-1 pr-2 font-mono text-muted-foreground text-xs">
            {language}
          </div>
        </CodeBlockGroup>
        <div className="sticky top-16 lg:top-0">
          <div className="absolute right-0 bottom-0 flex h-9 items-center pr-1.5">
            <ButtonCopy code={children as string} />
          </div>
        </div>
        <CodeBlockCode code={children as string} language={language} />
      </CodeBlock>
    );
  },
  pre: ({ children }) => <>{children}</>,
  ol: ({ node, children, ...props }) => {
    return (
      <ol className="ml-4 list-outside list-decimal" {...props}>
        {children}
      </ol>
    );
  },
  li: ({ node, children, ...props }) => {
    return (
      <li className="py-1" {...props}>
        {children}
      </li>
    );
  },
  ul: ({ node, children, ...props }) => {
    return (
      <ul className="ml-4 list-outside list-disc" {...props}>
        {children}
      </ul>
    );
  },
  blockquote: ({ node, children, ...props }) => {
    return (
      <blockquote
        className={cn(
          'my-4 border-border border-l-2 pl-4',
          'text-muted-foreground',
          '[&>*:first-child]:mt-0 [&>*:last-child]:mb-0',
        )}
        {...props}
      >
        {children}
      </blockquote>
    );
  },
  hr: ({ node, ...props }) => {
    return (
      <hr
        className={cn(
          'my-6 border-border',
          (props as { className?: string }).className,
        )}
        {...props}
      />
    );
  },
  strong: ({ node, children, ...props }) => {
    return (
      <span className="font-semibold" {...props}>
        {children}
      </span>
    );
  },
  a: ({ node, children, ...props }) => {
    return (
      <LinkMarkdown href={props.href || '#'} {...props}>
        {children}
      </LinkMarkdown>
    );
  },
  h1: ({ node, children, ...props }) => {
    return (
      <h1 className="mt-6 mb-2 font-semibold text-3xl" {...props}>
        {children}
      </h1>
    );
  },
  h2: ({ node, children, ...props }) => {
    return (
      <h2 className="mt-6 mb-2 font-semibold text-2xl" {...props}>
        {children}
      </h2>
    );
  },
  h3: ({ node, children, ...props }) => {
    return (
      <h3 className="mt-6 mb-2 font-semibold text-xl" {...props}>
        {children}
      </h3>
    );
  },
  h4: ({ node, children, ...props }) => {
    return (
      <h4 className="mt-6 mb-2 font-semibold text-lg" {...props}>
        {children}
      </h4>
    );
  },
  h5: ({ node, children, ...props }) => {
    return (
      <h5 className="mt-6 mb-2 font-semibold text-base" {...props}>
        {children}
      </h5>
    );
  },
  h6: ({ node, children, ...props }) => {
    return (
      <h6 className="mt-6 mb-2 font-semibold text-sm" {...props}>
        {children}
      </h6>
    );
  },
  table({ children }: { children?: React.ReactNode }) {
    return (
      <div className="my-6 overflow-x-auto rounded border border-border">
        <table className="m-0 w-full border-collapse">{children}</table>
      </div>
    );
  },
  tr({ children }: { children?: React.ReactNode }) {
    return (
      <tr
        className={cn(
          'border-border border-b last:border-b-0',
          'transition-colors duration-200 hover:bg-muted/50',
        )}
      >
        {children}
      </tr>
    );
  },

  thead({ children }: { children?: React.ReactNode }) {
    return <thead>{children}</thead>;
  },

  th({ children, align }: { children?: React.ReactNode; align?: string }) {
    const alignClass = align ? `text-${align}` : 'text-left';

    return (
      <th
        className={cn(
          'px-4 py-3 font-semibold text-foreground text-sm',
          'bg-muted',
          'border-border border-b',
          'break-words',
          alignClass,
        )}
      >
        <div className="font-medium">{children}</div>
      </th>
    );
  },

  td({ children, align }: { children?: React.ReactNode; align?: string }) {
    const alignClass = align ? `text-${align}` : 'text-left';

    return (
      <td
        className={cn(
          'px-4 py-3 text-muted-foreground text-sm',
          'border-border border-r last:border-r-0',
          'break-words',
          alignClass,
        )}
      >
        <div className="leading-relaxed">{children}</div>
      </td>
    );
  },

  tbody({ children }: { children?: React.ReactNode }) {
    return <tbody>{children}</tbody>;
  },
};

const remarkPlugins = [remarkGfm];

const NonMemoizedMarkdown = ({ children }: { children: string }) => {
  return (
    <ReactMarkdown components={components} remarkPlugins={remarkPlugins}>
      {children}
    </ReactMarkdown>
  );
};

export const Markdown = memo(
  NonMemoizedMarkdown,
  (prevProps, nextProps) => prevProps.children === nextProps.children,
);
