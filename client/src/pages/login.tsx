import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { AuthModal } from "@/components/AuthModal";
import { getCurrentUser } from "@/lib/auth";
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
