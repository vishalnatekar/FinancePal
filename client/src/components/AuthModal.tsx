import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChartLine } from "lucide-react";
import { signInWithGoogle } from "@/lib/auth";
import { setDemoSession } from "@/lib/demoAuth";
import { useToast } from "@/hooks/use-toast";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AuthModal({ open, onOpenChange, onSuccess }: AuthModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
      onSuccess();
      onOpenChange(false);
      toast({
        title: "Welcome!",
        description: "Successfully signed in to Personal Finance Hub",
      });
    } catch (error: any) {
      console.error("Auth error:", error);
      
      let errorMessage = "Failed to sign in with Google. Please try again.";
      if (error.message?.includes("Firebase is not configured")) {
        errorMessage = "Google sign-in is not configured. Please contact support for assistance.";
      }
      
      toast({
        title: "Sign In Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="flex justify-center mb-4">
            <ChartLine className="h-12 w-12 text-primary" />
          </div>
          <DialogTitle className="text-2xl">Welcome to Personal Finance Hub</DialogTitle>
          <DialogDescription>
            Securely manage your financial life in one place
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <Button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <img 
              src="https://developers.google.com/identity/images/g-logo.png" 
              alt="Google logo" 
              className="w-5 h-5 mr-3" 
            />
            {isLoading ? "Signing in..." : "Continue with Google"}
          </Button>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>
          
          <Button
            onClick={() => {
              setDemoSession();
              onSuccess();
              onOpenChange(false);
              toast({
                title: "Demo Mode",
                description: "Exploring Personal Finance Hub in demo mode",
              });
            }}
            variant="outline"
            className="w-full"
          >
            Try Demo Mode
          </Button>
          
          <p className="text-xs text-gray-500 text-center">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
