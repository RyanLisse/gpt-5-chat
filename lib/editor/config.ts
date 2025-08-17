import { CodeHighlightNode, CodeNode } from '@lexical/code';
import { LinkNode } from '@lexical/link';
import { ListItemNode, ListNode } from '@lexical/list';
import { $convertToMarkdownString, TRANSFORMERS } from '@lexical/markdown';
import {
  $createHeadingNode,
  HeadingNode,
  type HeadingTagType,
  QuoteNode,
} from '@lexical/rich-text';
import type { LexicalEditor } from 'lexical';
import { $getSelection, $insertNodes } from 'lexical';

// Create initial editor configuration
export function createEditorConfig() {
  return {
    namespace: 'DocumentEditor',
    nodes: [
      HeadingNode,
      ListNode,
      ListItemNode,
      QuoteNode,
      CodeNode,
      CodeHighlightNode,
      LinkNode,
    ],
    onError: (_error: Error) => {},
  };
}

// Heading transform function equivalent to ProseMirror's headingRule
export function createHeadingTransform(level: number) {
  return {
    dependencies: [],
    export: null,
    importDOM: null,
    regExp: new RegExp(`^(#{1,${level}})\\s$`),
    replace: (_textNode: any) => {
      const selection = $getSelection();
      if (selection) {
        const headingTag = `h${level}` as HeadingTagType;
        const headingNode = $createHeadingNode(headingTag);
        headingNode.append();
        $insertNodes([headingNode]);
      }
    },
    trigger: ' ',
    type: 'text-match',
  };
}

export const handleEditorChange = ({
  editor,
  onSaveContent,
}: {
  editor: LexicalEditor;
  onSaveContent: (updatedContent: string, debounce: boolean) => void;
}) => {
  let updatedContent = '';

  editor.getEditorState().read(() => {
    updatedContent = $convertToMarkdownString(TRANSFORMERS);
  });

  // Check if this should be debounced (similar to ProseMirror's no-debounce meta)
  const shouldDebounce = true; // Default to debounced saving

  onSaveContent(updatedContent, shouldDebounce);
};
