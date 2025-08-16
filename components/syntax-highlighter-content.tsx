import { useTheme } from 'next-themes';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import {
  oneDark,
  oneLight,
} from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from '@/lib/utils';
import { COLLAPSIBLE_CONSTANTS } from './collapsible-section-constants';

type SyntaxHighlighterContentProps = {
  content: string;
  language: string;
  activeTab: 'code' | 'output';
};

export function SyntaxHighlighterContent({
  content,
  language,
  activeTab,
}: SyntaxHighlighterContentProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const getBackgroundColor = () => {
    if (isDark) {
      return 'rgb(40,44,52)';
    }
    return 'rgb(250,250,250)';
  };

  const getCustomStyle = () => ({
    margin: 0,
    padding: COLLAPSIBLE_CONSTANTS.CODE_STYLE.PADDING,
    backgroundColor: isDark
      ? COLLAPSIBLE_CONSTANTS.COLORS.DARK_BG
      : COLLAPSIBLE_CONSTANTS.COLORS.TRANSPARENT_BG,
    borderRadius: 0,
    borderBottomLeftRadius: COLLAPSIBLE_CONSTANTS.CODE_STYLE.BORDER_RADIUS,
    borderBottomRightRadius: COLLAPSIBLE_CONSTANTS.CODE_STYLE.BORDER_RADIUS,
    fontFamily: COLLAPSIBLE_CONSTANTS.CODE_STYLE.FONT_FAMILY,
  });

  const getLineNumberContainerStyle = () => ({
    backgroundColor: isDark
      ? COLLAPSIBLE_CONSTANTS.COLORS.DARK_BG
      : COLLAPSIBLE_CONSTANTS.COLORS.LIGHT_BG,
    float: 'left' as const,
  });

  const getLineNumberStyle = () => ({
    textAlign: 'right' as const,
    color: COLLAPSIBLE_CONSTANTS.COLORS.LINE_NUMBER_COLOR,
    backgroundColor: COLLAPSIBLE_CONSTANTS.COLORS.TRANSPARENT_BG,
    fontStyle: 'normal' as const,
    marginRight: COLLAPSIBLE_CONSTANTS.CODE_STYLE.LINE_NUMBER_MARGIN,
    paddingRight: COLLAPSIBLE_CONSTANTS.CODE_STYLE.LINE_NUMBER_PADDING,
    fontFamily: COLLAPSIBLE_CONSTANTS.CODE_STYLE.FONT_FAMILY,
    minWidth: COLLAPSIBLE_CONSTANTS.CODE_STYLE.LINE_NUMBER_MIN_WIDTH,
  });

  const getCodeTagProps = () => ({
    style: {
      fontFamily: COLLAPSIBLE_CONSTANTS.CODE_STYLE.FONT_FAMILY,
      fontSize: COLLAPSIBLE_CONSTANTS.CODE_STYLE.FONT_SIZE,
      whiteSpace: 'pre' as const,
      overflowWrap: 'normal' as const,
      wordBreak: 'keep-all' as const,
    },
  });

  return (
    <div className={cn('text-sm', `bg-[${getBackgroundColor()}]`)}>
      <SyntaxHighlighter
        codeTagProps={getCodeTagProps()}
        customStyle={getCustomStyle()}
        language={activeTab === 'code' ? language : 'plaintext'}
        lineNumberContainerStyle={getLineNumberContainerStyle()}
        lineNumberStyle={getLineNumberStyle()}
        showLineNumbers={true}
        style={isDark ? oneDark : oneLight}
        wrapLongLines={false}
      >
        {content}
      </SyntaxHighlighter>
    </div>
  );
}
