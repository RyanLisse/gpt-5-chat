import type { Session } from 'next-auth';
import { toast } from 'sonner';

export function checkAuthentication(
  session: Session | null,
  action: string,
): boolean {
  if (!session?.user) {
    toast.error(`Sign in to ${action}`);
    return false;
  }
  return true;
}
