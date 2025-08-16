// Constants for CollapsibleSection component
export const COLLAPSIBLE_CONSTANTS = {
  COPY_FEEDBACK_DELAY: 2000,
  CODE_STYLE: {
    FONT_FAMILY: 'var(--font-geist-mono)',
    FONT_SIZE: '0.85em',
    ICON_SIZE: 14,
    PADDING: '0.75rem 0 0 0',
    BORDER_RADIUS: '0.375rem',
    LINE_NUMBER_MIN_WIDTH: '2em',
    LINE_NUMBER_MARGIN: '1em',
    LINE_NUMBER_PADDING: '0.5em',
  },
  COLORS: {
    DARK_BG: '#000000',
    LIGHT_BG: '#f5f5f5',
    TRANSPARENT_BG: 'transparent',
    LINE_NUMBER_COLOR: '#808080',
    OVERLAY_OPACITY: 0.5,
  },
} as const;
