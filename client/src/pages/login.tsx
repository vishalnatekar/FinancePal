import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { AuthModal } from "@/components/AuthModal";
import { getCurrentUser } from "@/lib/auth";
import { getDemoSession, setDemoSession } from "@/lib/demoAuth";
import { Loading } from "@/components/ui/loading";

export default function Login() {
  const [, navigate] = useLocation();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // Check demo session first
      const demoUser = getDemoSession();
      if (demoUser) {
        navigate("/");
        return;
      }

      // Check Firebase authentication
      const user = await getCurrentUser();
      if (user) {
        navigate("/");
        return;
      }
    } catch (error) {
      // User not authenticated, show login
    } finally {
      setIsChecking(false);
      setAuthModalOpen(true);
    }
  };

  const handleAuthSuccess = () => {
    navigate("/");
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loading size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Personal Finance Hub</h1>
          <p className="text-gray-600 mb-6">
            Please sign in to access your financial dashboard
          </p>
          <div className="space-y-3">
            <button 
              onClick={() => setAuthModalOpen(true)}
              className="w-full bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 py-3 px-4 rounded-md flex items-center justify-center"
            >
              <img 
                src="https://developers.google.com/identity/images/g-logo.png" 
                alt="Google logo" 
                className="w-5 h-5 mr-3" 
              />
              Continue with Google
            </button>
            <div className="flex items-center">
              <div className="flex-1 border-t border-gray-300"></div>
              <span className="px-3 text-sm text-gray-500">or</span>
              <div className="flex-1 border-t border-gray-300"></div>
            </div>
            <button 
              onClick={() => {
                setDemoSession();
                handleAuthSuccess();
              }}
              className="w-full bg-blue-600 text-white hover:bg-blue-700 py-3 px-4 rounded-md"
            >
              Try Demo Mode
            </button>
          </div>
        </CardContent>
      </Card>
      
      <AuthModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}
