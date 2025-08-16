// Animation and UI constants for artifact components
export const ARTIFACT_ANIMATION = {
  DEBOUNCE_DELAY: 2000,
  MOBILE_BREAKPOINT: 768,
  SIDEBAR_WIDTH: 256,
  CHAT_PANEL_WIDTH: 400,
  BORDER_RADIUS: 50,
  ANIMATION_DELAYS: {
    EXIT: 0.4,
    ENTER: 0.2,
    SCALE_EXIT: 0.1,
  },
  SPRING_CONFIG: {
    STIFFNESS: 200,
    DAMPING: 30,
    DURATION: 5000,
  },
  SCALE_SPRING_CONFIG: {
    STIFFNESS: 600,
    DAMPING: 30,
  },
} as const;

export const ARTIFACT_UI = {
  OVERLAY_OPACITY: 0.5,
  SCALE_FACTOR: 0.5,
} as const;
