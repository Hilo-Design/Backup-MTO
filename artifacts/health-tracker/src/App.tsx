import { useEffect, useRef, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

import { Layout } from '@/components/layout';
import { PlanProvider } from '@/components/plan-context';
import Dashboard from '@/pages/dashboard';
import Meals from '@/pages/meals';
import Log from '@/pages/log';
import Advisor from '@/pages/advisor';
import Trends from '@/pages/trends';
import Profile from '@/pages/profile';
import Landing from '@/pages/landing';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// REQUIRED — copy verbatim. Resolves the key from window.location.hostname so the
// same build serves multiple Clerk custom domains.
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

// REQUIRED — copy verbatim. Empty in dev, auto-set in prod.
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || '/'
    : path;
}

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: 'hsl(162 55% 22%)',
    colorForeground: 'hsl(220 15% 12%)',
    colorMutedForeground: 'hsl(220 10% 45%)',
    colorDanger: 'hsl(0 70% 50%)',
    colorBackground: 'hsl(40 33% 99%)',
    colorInput: 'hsl(40 33% 99%)',
    colorInputForeground: 'hsl(220 15% 12%)',
    colorNeutral: 'hsl(40 15% 70%)',
    fontFamily: "'Inter', sans-serif",
    borderRadius: '1rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-[hsl(40_33%_99%)] rounded-2xl w-[420px] max-w-full overflow-hidden shadow-lg border border-[hsl(40_15%_88%)]',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'font-serif text-[hsl(162_55%_22%)]',
    headerSubtitle: 'text-[hsl(220_10%_45%)]',
    formButtonPrimary: 'bg-[hsl(162_55%_22%)] hover:bg-[hsl(162_55%_18%)]',
    footerActionLink: 'text-[hsl(162_55%_22%)]',
    logoImage: 'h-12 w-12',
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

// Invalidate query cache when the signed-in user changes.
function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function AuthedApp() {
  return (
    <PlanProvider>
      <Layout>
        <RoutedErrorBoundary>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/meals" component={Meals} />
            <Route path="/log" component={Log} />
            <Route path="/advisor" component={Advisor} />
            <Route path="/trends" component={Trends} />
            <Route path="/profile" component={Profile} />
            <Route component={NotFound} />
          </Switch>
        </RoutedErrorBoundary>
      </Layout>
    </PlanProvider>
  );
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <AuthedApp />
      </Show>
      <Show when="signed-out">
        <Landing />
      </Show>
    </>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: 'Wapas swagat hai 🙏',
            subtitle: 'Sign in to continue your health journey',
          },
        },
        signUp: {
          start: {
            title: 'Namaste, shuru karein?',
            subtitle: 'Create your Svasth account',
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Switch>
            {/* REQUIRED — /*? optional wildcard matches bare URL and Clerk OAuth sub-paths */}
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            <Route path="*">
              <HomeRedirect />
            </Route>
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
