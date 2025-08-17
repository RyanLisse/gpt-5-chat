import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  pages: {
    signIn: '/login',
    newUser: '/',
  },
  providers: [
    // added later in auth.ts since it requires bcrypt which is only compatible with Node.js
    // while this file is also used in non-Node.js environments
  ],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = Boolean(auth?.user);
      const pathname = nextUrl.pathname;

      // Helper function to check if route should always be allowed
      const isPublicRoute = (path: string): boolean => {
        const publicRoutes = [
          '/api/auth',
          '/api/trpc',
          '/api/chat',
          '/login',
          '/register',
          '/share/',
        ];
        return (
          publicRoutes.some((route) => path.startsWith(route)) || path === '/'
        );
      };

      // Helper function to handle redirect
      const redirectToHome = () =>
        Response.redirect(new URL('/', nextUrl as unknown as URL));

      // Early returns for public routes
      if (isPublicRoute(pathname)) {
        // Redirect logged-in users away from auth pages
        if (
          isLoggedIn &&
          (pathname.startsWith('/login') || pathname.startsWith('/register'))
        ) {
          return redirectToHome();
        }
        return true;
      }

      // Handle chat routes
      if (pathname.startsWith('/')) {
        // Specific chat IDs require authentication
        if (pathname !== '/' && !isLoggedIn) {
          return false;
        }
        return true;
      }

      // Default fallback - redirect logged-in users to home, allow others
      return isLoggedIn ? redirectToHome() : true;
    },
  },
} satisfies NextAuthConfig;
