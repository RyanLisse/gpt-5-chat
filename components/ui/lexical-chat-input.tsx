'use client';

import {
  type InitialConfigType,
  LexicalComposer,
} from '@lexical/react/LexicalComposer';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  COMMAND_PRIORITY_HIGH,
  type EditorState,
  KEY_ENTER_COMMAND,
  type LexicalEditor,
} from 'lexical';
import * as React from 'react';
import { cn } from '@/lib/utils';

// Custom error boundary for Lexical-specific errors
class LexicalEditorErrorBoundary extends React.Component<
  { children: React.ReactNode; onError?: (error: Error) => void },
  { hasError: boolean }
> {
  constructor(props: {
    children: React.ReactNode;
    onError?: (error: Error) => void;
  }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, _errorInfo: React.ErrorInfo) {
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[80px] items-center justify-center rounded-md border p-3 text-muted-foreground">
          <span>Editor temporarily unavailable. Please refresh the page.</span>
        </div>
      );
    }

    return this.props.children;
  }
}

// Plugin to handle Enter key submissions
function EnterKeySubmitPlugin({
  onEnterSubmit,
}: {
  onEnterSubmit?: (event: KeyboardEvent) => boolean;
}) {
  const [editor] = useLexicalComposerContext();

  React.useEffect(() => {
    if (!editor) {
      return;
    }

    try {
      return editor.registerCommand(
        KEY_ENTER_COMMAND,
        (event: KeyboardEvent) => {
          // Call the custom handler if provided
          if (onEnterSubmit) {
            const handled = onEnterSubmit(event);
            if (handled) {
              // Prevent the default Enter behavior immediately
              event.preventDefault();
              // Prevent default Enter behavior (adding newline)
              return true;
            }
          }
          // Allow default behavior for non-submit cases (Shift+Enter, etc.)
          return false;
        },
        COMMAND_PRIORITY_HIGH,
      );
    } catch (_error) {
      return;
    }
  }, [editor, onEnterSubmit]);

  return null;
}

// Plugin to get editor instance for imperative ref
function EditorRefPlugin({
  setEditor,
}: {
  setEditor: (editor: LexicalEditor | null) => void;
}) {
  const [editor] = useLexicalComposerContext();

  React.useEffect(() => {
    if (editor) {
      try {
        // Test that the editor is properly initialized before setting it
        // Use a more gentle check that doesn't throw if state isn't ready
        const state = editor.getEditorState();
        if (state) {
          setEditor(editor);
        } else {
          // If state isn't ready, try again after a short delay
          const timeout = setTimeout(() => {
            try {
              editor.getEditorState();
              setEditor(editor);
            } catch {
              setEditor(null);
            }
          }, 100);
          return () => clearTimeout(timeout);
        }
      } catch {
        setEditor(null);
      }
    } else {
      setEditor(null);
    }
  }, [editor, setEditor]);

  return null;
}

type LexicalChatInputRef = {
  focus: () => void;
  clear: () => void;
  getValue: () => string;
};

type LexicalChatInputProps = {
  initialValue?: string;
  onInputChange?: (value: string) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  onPaste?: (event: React.ClipboardEvent<HTMLDivElement>) => void;
  onEnterSubmit?: (event: KeyboardEvent) => boolean;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  maxRows?: number;
  'data-testid'?: string;
};

const theme = {
  root: 'lexical-root',
  ltr: 'ltr',
  rtl: 'rtl',
  placeholder: 'editor-placeholder',
  paragraph: 'editor-paragraph',
};

function onError(_error: Error) {}

export const LexicalChatInput = React.forwardRef<
  LexicalChatInputRef,
  LexicalChatInputProps
>(
  (
    {
      initialValue = '',
      onInputChange,
      onKeyDown,
      onPaste,
      onEnterSubmit,
      placeholder = 'Type a message...',
      autoFocus = false,
      className,
      'data-testid': testId,
      ...props
    },
    ref,
  ) => {
    // ALL HOOKS MUST BE DECLARED FIRST (Rules of Hooks)
    const [editor, setEditor] = React.useState<LexicalEditor | null>(null);
    const [isMounted, setIsMounted] = React.useState(false);

    // Add mounting guard to prevent SSR/hydration issues
    React.useEffect(() => {
      setIsMounted(true);
      return () => setIsMounted(false);
    }, []);

    const handleChange = React.useCallback(
      (editorState: EditorState) => {
        if (onInputChange) {
          try {
            editorState.read(() => {
              const root = $getRoot();
              const textContent = root.getTextContent();
              onInputChange(textContent);
            });
          } catch (_error) {}
        }
      },
      [onInputChange],
    );

    React.useImperativeHandle(
      ref,
      () => ({
        focus: () => {
          if (editor) {
            try {
              editor.focus();
            } catch (_error) {}
          }
        },
        clear: () => {
          if (editor) {
            try {
              editor.update(() => {
                const root = $getRoot();
                root.clear();
              });
            } catch (_error) {}
          }
        },
        getValue: () => {
          if (editor) {
            try {
              return editor.getEditorState().read(() => {
                const root = $getRoot();
                return root.getTextContent();
              });
            } catch (_error) {
              return '';
            }
          }
          return '';
        },
      }),
      [editor],
    );

    // Handle value changes from parent
    React.useEffect(() => {
      if (editor && initialValue !== undefined) {
        try {
          editor.update(() => {
            const root = $getRoot();
            const currentText = root.getTextContent();

            if (currentText !== initialValue) {
              root.clear();
              const paragraph = $createParagraphNode();
              if (initialValue) {
                const textNode = $createTextNode(initialValue);
                paragraph.append(textNode);
              }
              root.append(paragraph);
            }
          });
        } catch (_error) {}
      }
    }, [editor, initialValue]);

    const PlaceholderComponent = React.useCallback(
      () => (
        <div className="lexical-placeholder pointer-events-none absolute pt-2 pl-3 text-muted-foreground">
          {placeholder}
        </div>
      ),
      [placeholder],
    );

    // Configuration object (non-hook)
    const initialConfig: InitialConfigType = {
      namespace: 'LexicalChatInput',
      theme,
      onError,
      nodes: [],
    };

    // Early returns AFTER all hooks are declared
    // Don't render the editor until we're mounted on the client
    if (!isMounted) {
      return (
        <div
          className={cn(
            'focus:outline-hidden focus-visible:outline-hidden',
            '[&>.lexical-root]:min-h-[20px] [&>.lexical-root]:outline-hidden',
            'lexical-content-editable',
            'editor-input',
            className,
          )}
          data-testid={testId}
          style={{
            minHeight: '20px',
            padding: '8px 12px',
            color: '#9ca3af',
          }}
        >
          {placeholder}
        </div>
      );
    }

    return (
      <LexicalEditorErrorBoundary onError={onError}>
        <LexicalComposer initialConfig={initialConfig}>
          <div className="lexical-editor-container">
            <PlainTextPlugin
              contentEditable={
                <ContentEditable
                  className={cn(
                    'focus:outline-hidden focus-visible:outline-hidden',
                    '[&>.lexical-root]:min-h-[20px] [&>.lexical-root]:outline-hidden',
                    'lexical-content-editable',
                    'editor-input',
                    className,
                  )}
                  data-testid={testId}
                  onKeyDown={onKeyDown}
                  onPaste={onPaste}
                  spellCheck={true}
                  style={{
                    WebkitBoxShadow: 'none',
                    MozBoxShadow: 'none',
                    boxShadow: 'none',
                  }}
                  // aria-placeholder={placeholder}
                />
              }
              ErrorBoundary={LexicalErrorBoundary}
              placeholder={<PlaceholderComponent />}
            />
            <OnChangePlugin onChange={handleChange} />
            <HistoryPlugin />
            {/* {autoFocus && <AutoFocusPlugin />} */}
            <EditorRefPlugin setEditor={setEditor} />
            <EnterKeySubmitPlugin onEnterSubmit={onEnterSubmit} />
          </div>
        </LexicalComposer>
      </LexicalEditorErrorBoundary>
    );
  },
);

LexicalChatInput.displayName = 'LexicalChatInput';

export type { LexicalChatInputRef };
