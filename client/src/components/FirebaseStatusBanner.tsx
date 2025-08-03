import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

export function FirebaseStatusBanner() {
  return (
    <Alert className="mb-4 border-yellow-200 bg-yellow-50">
      <AlertTriangle className="h-4 w-4 text-yellow-600" />
      <AlertDescription className="text-yellow-800">
        <strong>Firebase Configuration Needed:</strong> To enable Google sign-in, please provide your Firebase credentials in the secrets panel.
        The app is currently running in demo mode.
      </AlertDescription>
    </Alert>
  );
}