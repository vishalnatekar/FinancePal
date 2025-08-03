import { useEffect, useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Header } from "@/components/Header";
import { AuthModal } from "@/components/AuthModal";
import { Loading } from "@/components/ui/loading";
import { getCurrentUser, onAuthStateChange } from "@/lib/auth";
import { getDemoSession, isDemoMode, clearDemoSession } from "@/lib/demoAuth";
import type { AuthUser } from "@/lib/auth";
import Dashboard from "@/pages/dashboard";
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";

function Router() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    checkAuthStatus();
    
    // Listen for Firebase auth state changes
    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
      if (firebaseUser) {
        const user = await getCurrentUser();
        setUser(user);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  const checkAuthStatus = async () => {
    try {
      // Check for demo session first
      const demoUser = getDemoSession();
      if (demoUser) {
        setUser({
          id: demoUser.id,
          email: demoUser.email,
          name: demoUser.name,
          avatar: demoUser.avatar
        });
        return;
      }

      // Check Firebase authentication
      const user = await getCurrentUser();
      setUser(user);
    } catch (error) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Invalidate all queries to refresh data
      await queryClient.invalidateQueries();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAuthSuccess = () => {
    checkAuthStatus();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loading size="lg" />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Switch>
          <Route path="/login" component={Login} />
          <Route>
            <Login />
          </Route>
        </Switch>
        <AuthModal
          open={authModalOpen}
          onOpenChange={setAuthModalOpen}
          onSuccess={handleAuthSuccess}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} onRefresh={handleRefresh} isRefreshing={isRefreshing} />
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/transactions">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold">Transactions</h1>
            <p className="text-gray-600">Transaction management coming soon...</p>
          </div>
        </Route>
        <Route path="/budget">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold">Budget</h1>
            <p className="text-gray-600">Budget management coming soon...</p>
          </div>
        </Route>
        <Route path="/goals">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold">Goals</h1>
            <p className="text-gray-600">Goal management coming soon...</p>
          </div>
        </Route>
        <Route path="/accounts">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold">Accounts</h1>
            <p className="text-gray-600">Account management coming soon...</p>
          </div>
        </Route>
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
