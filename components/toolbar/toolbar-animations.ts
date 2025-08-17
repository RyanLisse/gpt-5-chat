import type { ArtifactToolbarItem } from '../create-artifact';

export function getToolbarAnimationConfig(
  isToolbarVisible: boolean,
  selectedTool: string | null,
  toolsByArtifactKind: ArtifactToolbarItem[],
) {
  if (!isToolbarVisible) {
    return {
      opacity: 1,
      y: 0,
      height: 54,
      transition: { delay: 0 },
      scale: 1,
    };
  }

  if (selectedTool === 'adjust-reading-level') {
    return {
      opacity: 1,
      y: 0,
      height: 6 * 43,
      transition: { delay: 0 },
      scale: 0.95,
    };
  }

  return {
    opacity: 1,
    y: 0,
    height: toolsByArtifactKind.length * 50,
    transition: { delay: 0 },
    scale: 1,
  };
}

export const TOOLBAR_MOTION_CONFIG = {
  exit: { opacity: 0, y: -20, transition: { duration: 0.1 } },
  initial: { opacity: 0, y: -20, scale: 1 },
  transition: { type: 'spring', stiffness: 300, damping: 25 },
} as const;
