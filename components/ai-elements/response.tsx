'use client';

import type { ComponentProps, HTMLAttributes } from 'react';
import { memo } from 'react';
import ReactMarkdown, { type Options } from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { cn } from '@/lib/utils';
import { CodeBlock, CodeBlockCopyButton } from './code-block';
import 'katex/dist/katex.min.css';
import hardenReactMarkdown from 'harden-react-markdown';
import { components as markdownComponents } from '../markdown';

// Constants
const TRIPLE_BACKTICK_LENGTH = 3;

// Regex patterns for incomplete markdown parsing
const LINK_IMAGE_PATTERN = /(!?\[)([^\]]*?)$/;
const BOLD_PATTERN = /(\*\*)([^*]*?)$/;
const ITALIC_PATTERN = /(__)([^_]*?)$/;
const SINGLE_ASTERISK_PATTERN = /(\*)([^*]*?)$/;
const SINGLE_UNDERSCORE_PATTERN = /(_)([^_]*?)$/;
const INLINE_CODE_PATTERN = /(`)([^`]*?)$/;
const STRIKETHROUGH_PATTERN = /(~~)([^~]*?)$/;
const _CODE_BLOCK_PATTERN = /```[\s\S]*?```/g;
const TRIPLE_BACKTICKS_PATTERN = /```/g;

/**
 * Counts single characters that are not part of double character pairs
 */
function countSingleCharacters(text: string, char: string): number {
  return text.split('').reduce((acc, currentChar, index) => {
    if (currentChar === char) {
      const prevChar = text[index - 1];
      const nextChar = text[index + 1];
      if (prevChar !== char && nextChar !== char) {
        return acc + 1;
      }
    }
    return acc;
  }, 0);
}

/**
 * Counts single backticks that are not part of triple backtick sequences
 */
function countSingleBackticks(text: string): number {
  let count = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '`') {
      const isTripleStart =
        text.substring(i, i + TRIPLE_BACKTICK_LENGTH) === '```';
      const isTripleMiddle = i > 0 && text.substring(i - 1, i + 2) === '```';
      const isTripleEnd = i > 1 && text.substring(i - 2, i + 1) === '```';

      if (!(isTripleStart || isTripleMiddle || isTripleEnd)) {
        count++;
      }
    }
  }
  return count;
}

/**
 * Handles incomplete links and images
 */
function handleIncompleteLinksAndImages(text: string): string {
  const linkMatch = text.match(LINK_IMAGE_PATTERN);
  if (linkMatch) {
    const startIndex = text.lastIndexOf(linkMatch[1]);
    return text.substring(0, startIndex);
  }
  return text;
}

/**
 * Handles incomplete formatting pairs (**, __, ~~)
 */
function handleIncompleteFormattingPairs(
  text: string,
  pattern: RegExp,
  pairPattern: RegExp,
  completionString: string,
): string {
  const match = text.match(pattern);
  if (match) {
    const pairs = (text.match(pairPattern) || []).length;
    if (pairs % 2 === 1) {
      return `${text}${completionString}`;
    }
  }
  return text;
}

/**
 * Handles incomplete single character formatting (*, _)
 */
function handleIncompleteSingleCharFormatting(
  text: string,
  pattern: RegExp,
  char: string,
): string {
  const match = text.match(pattern);
  if (match) {
    const singleCharCount = countSingleCharacters(text, char);
    if (singleCharCount % 2 === 1) {
      return `${text}${char}`;
    }
  }
  return text;
}

/**
 * Handles incomplete inline code blocks
 */
function handleIncompleteInlineCode(text: string): string {
  const inlineCodeMatch = text.match(INLINE_CODE_PATTERN);
  if (!inlineCodeMatch) {
    return text;
  }

  const allTripleBackticks = (text.match(TRIPLE_BACKTICKS_PATTERN) || [])
    .length;
  const insideIncompleteCodeBlock = allTripleBackticks % 2 === 1;

  if (!insideIncompleteCodeBlock) {
    const singleBacktickCount = countSingleBackticks(text);
    if (singleBacktickCount % 2 === 1) {
      return `${text}\``;
    }
  }
  return text;
}

/**
 * Parses markdown text and removes incomplete tokens to prevent partial rendering
 * of links, images, bold, and italic formatting during streaming.
 */
function parseIncompleteMarkdown(text: string): string {
  if (!text || typeof text !== 'string') {
    return text;
  }

  let result = text;

  // Handle incomplete links and images
  result = handleIncompleteLinksAndImages(result);

  // Handle incomplete bold formatting (**)
  result = handleIncompleteFormattingPairs(result, BOLD_PATTERN, /\*\*/g, '**');

  // Handle incomplete italic formatting (__)
  result = handleIncompleteFormattingPairs(result, ITALIC_PATTERN, /__/g, '__');

  // Handle incomplete single asterisk italic (*)
  result = handleIncompleteSingleCharFormatting(
    result,
    SINGLE_ASTERISK_PATTERN,
    '*',
  );

  // Handle incomplete single underscore italic (_)
  result = handleIncompleteSingleCharFormatting(
    result,
    SINGLE_UNDERSCORE_PATTERN,
    '_',
  );

  // Handle incomplete inline code blocks
  result = handleIncompleteInlineCode(result);

  // Handle incomplete strikethrough formatting (~~)
  result = handleIncompleteFormattingPairs(
    result,
    STRIKETHROUGH_PATTERN,
    /~~/g,
    '~~',
  );

  return result;
}

// Create a hardened version of ReactMarkdown
const HardenedMarkdown = hardenReactMarkdown(ReactMarkdown);

export type ResponseProps = HTMLAttributes<HTMLDivElement> & {
  options?: Options;
  children: Options['children'];
  allowedImagePrefixes?: ComponentProps<
    ReturnType<typeof hardenReactMarkdown>
  >['allowedImagePrefixes'];
  allowedLinkPrefixes?: ComponentProps<
    ReturnType<typeof hardenReactMarkdown>
  >['allowedLinkPrefixes'];
  defaultOrigin?: ComponentProps<
    ReturnType<typeof hardenReactMarkdown>
  >['defaultOrigin'];
  parseIncompleteMarkdown?: boolean;
};

const components: Options['components'] = {
  ol: ({ node, children, className, ...props }) => (
    <ol className={cn('ml-4 list-outside list-decimal', className)} {...props}>
      {children}
    </ol>
  ),
  li: ({ node, children, className, ...props }) => (
    <li className={cn('py-1', className)} {...props}>
      {children}
    </li>
  ),
  ul: ({ node, children, className, ...props }) => (
    <ul className={cn('ml-4 list-outside list-decimal', className)} {...props}>
      {children}
    </ul>
  ),
  strong: ({ node, children, className, ...props }) => (
    <span className={cn('font-semibold', className)} {...props}>
      {children}
    </span>
  ),
  a: ({ node, children, className, href, ...props }) => (
    <a
      className={cn('font-medium text-primary underline', className)}
      href={href || '#'}
      rel="noreferrer"
      target="_blank"
      {...props}
    >
      {children}
    </a>
  ),
  h1: ({ node, children, className, ...props }) => (
    <h1
      className={cn('mt-6 mb-2 font-semibold text-3xl', className)}
      {...props}
    >
      {children}
    </h1>
  ),
  h2: ({ node, children, className, ...props }) => (
    <h2
      className={cn('mt-6 mb-2 font-semibold text-2xl', className)}
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ node, children, className, ...props }) => (
    <h3 className={cn('mt-6 mb-2 font-semibold text-xl', className)} {...props}>
      {children}
    </h3>
  ),
  h4: ({ node, children, className, ...props }) => (
    <h4 className={cn('mt-6 mb-2 font-semibold text-lg', className)} {...props}>
      {children}
    </h4>
  ),
  h5: ({ node, children, className, ...props }) => (
    <h5
      className={cn('mt-6 mb-2 font-semibold text-base', className)}
      {...props}
    >
      {children}
    </h5>
  ),
  h6: ({ node, children, className, ...props }) => (
    <h6 className={cn('mt-6 mb-2 font-semibold text-sm', className)} {...props}>
      {children}
    </h6>
  ),
  pre: ({ node, className, children }) => {
    let language = 'javascript';

    if (typeof node?.properties?.className === 'string') {
      language = node.properties.className.replace('language-', '');
    }

    const childrenIsCode =
      typeof children === 'object' &&
      children !== null &&
      'type' in children &&
      children.type === 'code';

    if (!childrenIsCode) {
      return <pre>{children}</pre>;
    }

    return (
      <CodeBlock
        className={cn('my-4 h-auto', className)}
        code={(children.props as { children: string }).children}
        language={language}
      >
        <CodeBlockCopyButton
          onCopy={() => {
            // Copy success feedback handled by the button component
          }}
          onError={(_error) => {
            // Error handling performed by the button component
          }}
        />
      </CodeBlock>
    );
  },
};

export const Response = memo(
  ({
    className,
    options,
    children,
    allowedImagePrefixes,
    allowedLinkPrefixes,
    defaultOrigin,
    parseIncompleteMarkdown: shouldParseIncompleteMarkdown = true,
    ...props
  }: ResponseProps) => {
    // Parse the children to remove incomplete markdown tokens if enabled
    const parsedChildren =
      typeof children === 'string' && shouldParseIncompleteMarkdown
        ? parseIncompleteMarkdown(children)
        : children;

    return (
      <div
        className={cn(
          'size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0',
          className,
        )}
        {...props}
      >
        <HardenedMarkdown
          allowedImagePrefixes={allowedImagePrefixes ?? ['*']}
          allowedLinkPrefixes={allowedLinkPrefixes ?? ['*']}
          components={components}
          defaultOrigin={defaultOrigin}
          rehypePlugins={[rehypeKatex]}
          remarkPlugins={[remarkGfm, remarkMath]}
          {...options}
        >
          {parsedChildren}
        </HardenedMarkdown>
      </div>
    );
  },
  (prevProps, nextProps) => prevProps.children === nextProps.children,
);

Response.displayName = 'Response';

export const StyledResponse = memo(
  ({
    className,
    options,
    children,
    allowedImagePrefixes,
    allowedLinkPrefixes,
    defaultOrigin,
    parseIncompleteMarkdown: shouldParseIncompleteMarkdown = true,
    ...props
  }: ResponseProps) => {
    // Parse the children to remove incomplete markdown tokens if enabled
    const parsedChildren =
      typeof children === 'string' && shouldParseIncompleteMarkdown
        ? parseIncompleteMarkdown(children)
        : children;

    return (
      <div
        className={cn(
          'size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0',
          className,
        )}
        {...props}
      >
        <HardenedMarkdown
          allowedImagePrefixes={allowedImagePrefixes ?? ['*']}
          allowedLinkPrefixes={allowedLinkPrefixes ?? ['*']}
          components={markdownComponents}
          defaultOrigin={defaultOrigin}
          rehypePlugins={[rehypeKatex]}
          remarkPlugins={[remarkGfm, remarkMath]}
          {...options}
        >
          {parsedChildren}
        </HardenedMarkdown>
      </div>
    );
  },
  (prevProps, nextProps) => prevProps.children === nextProps.children,
);

StyledResponse.displayName = 'StyedResponse';
