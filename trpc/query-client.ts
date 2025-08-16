import {
  defaultShouldDehydrateQuery,
  MutationCache,
  QueryClient,
} from '@tanstack/react-query';
import SuperJSON from 'superjson';

// Query configuration constants
const SECONDS_PER_MINUTE = 60;
const MILLISECONDS_PER_SECOND = 1000;
const DEFAULT_STALE_TIME_MS = SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND; // 1 minute

export const makeQueryClient = () => {
  const queryClient = new QueryClient({
    mutationCache: new MutationCache({
      onSuccess: () => {
        queryClient.invalidateQueries();
      },
    }),
    defaultOptions: {
      queries: {
        // With SSR, we usually want to set some default staleTime
        // above 0 to avoid refetching immediately on the client
        staleTime: DEFAULT_STALE_TIME_MS,
      },
      dehydrate: {
        serializeData: SuperJSON.serialize,
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === 'pending',
      },
      hydrate: {
        deserializeData: SuperJSON.deserialize,
      },
    },
  });
  return queryClient;
};
