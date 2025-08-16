import { AnimatePresence, motion } from 'motion/react';
import { useWindowSize } from 'usehooks-ts';
import type { UIArtifact } from './artifact';
import { ARTIFACT_ANIMATION, ARTIFACT_UI } from './artifact-constants';
import { useSidebar } from './ui/sidebar';

type ArtifactLayoutProps = {
  artifact: UIArtifact;
  isCurrentVersion: boolean;
  chatPanel: React.ReactNode;
  mainContent: React.ReactNode;
};

function useLayoutDimensions() {
  const { width: windowWidth, height: windowHeight } = useWindowSize();
  const { open: isSidebarOpen } = useSidebar();
  const isMobile = windowWidth
    ? windowWidth < ARTIFACT_ANIMATION.MOBILE_BREAKPOINT
    : false;

  return {
    windowWidth,
    windowHeight,
    isSidebarOpen,
    isMobile,
  };
}

function getAnimationConfig(
  isMobile: boolean,
  windowWidth: number,
  windowHeight: number,
  artifact: UIArtifact,
) {
  const baseConfig = {
    transition: {
      delay: 0,
      type: 'spring' as const,
      stiffness: ARTIFACT_ANIMATION.SPRING_CONFIG.STIFFNESS,
      damping: ARTIFACT_ANIMATION.SPRING_CONFIG.DAMPING,
      duration: ARTIFACT_ANIMATION.SPRING_CONFIG.DURATION,
    },
  };

  if (isMobile) {
    return {
      animate: {
        opacity: 1,
        x: 0,
        y: 0,
        height: windowHeight,
        width: windowWidth || 'calc(100dvw)',
        borderRadius: 0,
        ...baseConfig,
      },
      initial: {
        opacity: 1,
        x: artifact.boundingBox.left,
        y: artifact.boundingBox.top,
        height: artifact.boundingBox.height,
        width: artifact.boundingBox.width,
        borderRadius: ARTIFACT_ANIMATION.BORDER_RADIUS,
      },
    };
  }

  return {
    animate: {
      opacity: 1,
      x: ARTIFACT_ANIMATION.CHAT_PANEL_WIDTH,
      y: 0,
      height: windowHeight,
      width: windowWidth
        ? windowWidth - ARTIFACT_ANIMATION.CHAT_PANEL_WIDTH
        : 'calc(100dvw-400px)',
      borderRadius: 0,
      ...baseConfig,
    },
    initial: {
      opacity: 1,
      x: artifact.boundingBox.left,
      y: artifact.boundingBox.top,
      height: artifact.boundingBox.height,
      width: artifact.boundingBox.width,
      borderRadius: ARTIFACT_ANIMATION.BORDER_RADIUS,
    },
  };
}

function ChatPanelBackground({
  windowWidth,
  isSidebarOpen,
}: {
  windowWidth: number;
  isSidebarOpen: boolean;
}) {
  return (
    <motion.div
      animate={{ width: windowWidth, right: 0 }}
      className="fixed h-dvh bg-background"
      exit={{
        width: isSidebarOpen
          ? windowWidth - ARTIFACT_ANIMATION.SIDEBAR_WIDTH
          : windowWidth,
        right: 0,
      }}
      initial={{
        width: isSidebarOpen
          ? windowWidth - ARTIFACT_ANIMATION.SIDEBAR_WIDTH
          : windowWidth,
        right: 0,
      }}
    />
  );
}

function VersionOverlay({ isCurrentVersion }: { isCurrentVersion: boolean }) {
  return (
    <AnimatePresence>
      {!isCurrentVersion && (
        <motion.div
          animate={{ opacity: 1 }}
          className="absolute top-0 left-0 z-50 h-dvh w-[400px] bg-zinc-900/50"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
        />
      )}
    </AnimatePresence>
  );
}

export function ArtifactLayout({
  artifact,
  isCurrentVersion,
  chatPanel,
  mainContent,
}: ArtifactLayoutProps) {
  const { windowWidth, windowHeight, isSidebarOpen, isMobile } =
    useLayoutDimensions();

  if (!(windowWidth && windowHeight)) {
    return null;
  }

  const animationConfig = getAnimationConfig(
    isMobile,
    windowWidth,
    windowHeight,
    artifact,
  );

  return (
    <AnimatePresence>
      {artifact.isVisible && (
        <motion.div
          animate={{ opacity: 1 }}
          className="fixed top-0 left-0 z-50 flex h-dvh w-dvw flex-row bg-transparent"
          data-testid="artifact"
          exit={{
            opacity: 0,
            transition: { delay: ARTIFACT_ANIMATION.ANIMATION_DELAYS.EXIT },
          }}
          initial={{ opacity: 1 }}
        >
          {!isMobile && (
            <ChatPanelBackground
              isSidebarOpen={isSidebarOpen}
              windowWidth={windowWidth}
            />
          )}

          {!isMobile && (
            <motion.div
              animate={{
                opacity: 1,
                x: 0,
                scale: 1,
                transition: {
                  delay: ARTIFACT_ANIMATION.ANIMATION_DELAYS.ENTER,
                  type: 'spring',
                  stiffness: ARTIFACT_ANIMATION.SPRING_CONFIG.STIFFNESS,
                  damping: ARTIFACT_ANIMATION.SPRING_CONFIG.DAMPING,
                },
              }}
              className="relative h-dvh w-[400px] shrink-0 bg-muted dark:bg-background"
              exit={{
                opacity: 0,
                x: 0,
                scale: 1,
                transition: { duration: 0 },
              }}
              initial={{ opacity: 0, x: 10, scale: 1 }}
            >
              <VersionOverlay isCurrentVersion={isCurrentVersion} />
              {chatPanel}
            </motion.div>
          )}

          <motion.div
            animate={animationConfig.animate}
            className="fixed flex h-dvh flex-col overflow-y-auto border-zinc-200 bg-background md:border-l dark:border-zinc-700"
            exit={{
              opacity: 0,
              scale: ARTIFACT_UI.SCALE_FACTOR,
              transition: {
                delay: ARTIFACT_ANIMATION.ANIMATION_DELAYS.SCALE_EXIT,
                type: 'spring',
                stiffness: ARTIFACT_ANIMATION.SCALE_SPRING_CONFIG.STIFFNESS,
                damping: ARTIFACT_ANIMATION.SCALE_SPRING_CONFIG.DAMPING,
              },
            }}
            initial={animationConfig.initial}
          >
            {mainContent}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
