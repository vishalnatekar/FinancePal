import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Header } from "@/components/Header";
import { Loading } from "@/components/ui/loading";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import { useEffect } from "react";
import Dashboard from "@/pages/dashboard";
import TransactionsPage from "@/pages/transactions";
import BudgetPage from "@/pages/budget";
import GoalsPage from "@/pages/goals";
import AccountsPage from "@/pages/accounts";
import NotFound from "@/pages/not-found";

function Router() {
  const { user, loading, isAuthenticated, signInWithGoogle } = useFirebaseAuth();

  // Handle banking callback parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const connection = urlParams.get('connection');
    const code = urlParams.get('code');
    
    if (connection === 'success' && code && user?.uid) {
      console.log('🏦 Banking callback detected, completing connection...');
      
      // Clear URL parameters immediately to prevent reuse of authorization code
      window.history.replaceState({}, document.title, '/');
      
      // Complete the banking connection
      fetch('/api/banking/complete-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-firebase-uid': user.uid,
        },
        body: JSON.stringify({ code }),
      })
      .then(async response => {
        console.log('📡 API Response Status:', response.status);
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ API Error Response:', errorText);
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('📊 API Response Data:', data);
        if (data.success) {
          console.log('✅ Banking connection completed:', data);
          alert(`Banking connection successful! Synced ${data.accountsCount || 0} accounts and ${data.transactionsCount || 0} transactions.`);
          window.location.reload(); // Refresh to update banking status
        } else {
          console.error('❌ Banking connection failed:', data);
          alert(`Banking connection failed: ${data.message || 'Unknown error'}`);
        }
      })
      .catch(error => {
        console.error('❌ Banking connection error:', error);
        if (error.message.includes('invalid_grant')) {
          alert('Banking connection failed: The authorization code has expired or been used already. Please try connecting your bank again.');
        } else {
          alert(`Banking connection error: ${error.message}`);
        }
      });
    }
  }, [user]);

  if (loading) {
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
            Sign in with your Google account to get started
          </p>
          
          <div className="space-y-4">
            <button 
              onClick={signInWithGoogle}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-3 mx-auto"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
            </button>
            
            <div className="text-xs text-gray-400 text-center">
              If you get an "unauthorized domain" error, please follow the Firebase setup guide
            </div>
          </div>
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