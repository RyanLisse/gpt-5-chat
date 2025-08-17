import { useEffect, useRef } from 'react';

export type NavigationHandler = () => void;

export const useNavigationTracking = (onNavigation: NavigationHandler) => {
  const originalMethodsRef = useRef<{
    pushState: typeof window.history.pushState;
    replaceState: typeof window.history.replaceState;
  } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    // Store original methods
    originalMethodsRef.current = {
      pushState: window.history.pushState,
      replaceState: window.history.replaceState,
    };

    const handleNavigation = () => {
      onNavigation();
    };

    // Listen for popstate events (back/forward navigation)
    window.addEventListener('popstate', handleNavigation);

    // Override history methods to detect programmatic navigation
    window.history.pushState = (...args) => {
      originalMethodsRef.current?.pushState.apply(window.history, args);
      handleNavigation();
    };

    window.history.replaceState = (...args) => {
      originalMethodsRef.current?.replaceState.apply(window.history, args);
      handleNavigation();
    };

    return () => {
      // Cleanup event listener
      window.removeEventListener('popstate', handleNavigation);

      // Restore original history methods
      if (originalMethodsRef.current) {
        window.history.pushState = originalMethodsRef.current.pushState;
        window.history.replaceState = originalMethodsRef.current.replaceState;
      }
    };
  }, [onNavigation]);
};
