'use client';

import { GithubLogo, GoogleLogo } from '@phosphor-icons/react';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';

export function SocialAuthProviders() {
  return (
    <div className="space-y-2">
      <Button
        className="w-full"
        onClick={(_e) => signIn('google')}
        type="button"
        variant="outline"
      >
        <GoogleLogo className="mr-2 h-4 w-4" />
        Continue with Google
      </Button>
      <Button
        className="w-full"
        onClick={(_e) => signIn('github')}
        type="button"
        variant="outline"
      >
        <GithubLogo className="mr-2 h-4 w-4" />
        Continue with GitHub
      </Button>
    </div>
  );
}
