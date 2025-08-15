import { ChevronLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { SocialAuthProviders } from '@/components/social-auth-providers';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Login',
  description: 'Login to your account',
};

export default function LoginPage() {
  return (
    <div className="container mx-auto flex h-screen w-screen flex-col items-center justify-center">
      <Link
        className={cn(
          buttonVariants({ variant: 'ghost' }),
          'absolute top-4 left-4 md:top-8 md:left-8',
        )}
        href="/"
      >
        <ChevronLeft className="mr-2 h-4 w-4" />
        Back
      </Link>
      <div className="mx-auto flex w-full flex-col items-center justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          {/* Assuming Icons.logo exists */}
          {/* <Icons.logo className="mx-auto h-6 w-6" /> */}
          <h1 className="font-semibold text-2xl tracking-tight">
            Welcome back
          </h1>
          <p className="text-muted-foreground text-sm">
            Sign in using your Google account
          </p>
        </div>
        <SocialAuthProviders />
        <p className="px-8 text-center text-muted-foreground text-sm">
          <Link
            className="underline underline-offset-4 hover:text-brand"
            href="/register"
          >
            Don&apos;t have an account? Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}
