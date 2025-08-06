import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Header } from "@/components/Header";
import { Loading } from "@/components/ui/loading";
import { useAuth } from "@/hooks/useAuth";
import Dashboard from "@/pages/dashboard";
import TransactionsPage from "@/pages/transactions";
import BudgetPage from "@/pages/budget";
import GoalsPage from "@/pages/goals";
import AccountsPage from "@/pages/accounts";
import NotFound from "@/pages/not-found";

function Router() {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loading size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto px-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Personal Finance Hub</h1>
          <p className="text-gray-600 mb-6">Securely manage your UK banking and finances</p>
          <p className="text-sm text-gray-500 mb-8">
            Sign in with your Google account or Replit account to get started
          </p>
          <a 
            href="/api/login"
            className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Sign in
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} />
      <main>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/transactions" component={TransactionsPage} />
          <Route path="/budget" component={BudgetPage} />
          <Route path="/goals" component={GoalsPage} />
          <Route path="/accounts" component={AccountsPage} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}