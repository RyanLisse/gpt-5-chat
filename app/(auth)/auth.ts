import NextAuth, { type Session, type User } from 'next-auth';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';

import { createUser, getUserByEmail } from '@/lib/db/queries';

import { authConfig } from './auth.config';

interface ExtendedSession extends Session {
  user: User;
}

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!(account && profile && user?.email)) {
        return false;
      }

      const { email, name, image } = user;

      try {
        const existingUserArray = await getUserByEmail(email);

        if (existingUserArray.length === 0) {
          await createUser({
            email,
            name: name ?? null,
            image: image ?? null,
          });
        } else {
        }
        return true;
      } catch (_error) {
        return false;
      }
    },
    async jwt({ token, user, account, profile }) {
      if (user?.email) {
        try {
          const dbUserArray = await getUserByEmail(user.email);
          if (dbUserArray.length > 0) {
            token.id = dbUserArray[0].id;
          } else {
          }
        } catch (_error) {}
      }
      return token;
    },
    async session({
      session,
      token,
    }: {
      session: ExtendedSession;
      token: { id?: string; [key: string]: any };
    }) {
      if (session.user && token.id) {
        session.user.id = token.id;
      } else if (!token.id) {
      }
      return session;
    },
  },
});
