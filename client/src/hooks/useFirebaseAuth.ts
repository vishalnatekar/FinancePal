import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/firebase";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

export function useFirebaseAuth() {
  // If Firebase isn't configured, avoid crashing the app
  if (!auth) {
    const notConfiguredError = new Error(
      "Firebase is not configured. Missing VITE_FIREBASE_* env vars.",
    );
    return {
      user: null as any,
      loading: false,
      error: notConfiguredError,
      isAuthenticated: false,
      signInWithGoogle: () => {
        alert(
          "Authentication is not available: Firebase is not configured on this deployment.",
        );
      },
      logout: () => {},
    };
  }

  const [user, loading, error] = useAuthState(auth);

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      // Use popup instead of redirect - more flexible with domains
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Authentication error:", error);
      // Show user-friendly error
      alert("Authentication failed. Please ensure your domain is authorized in Firebase Console.");
    }
  };

  const logout = () => {
    signOut(auth);
  };

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    signInWithGoogle,
    logout
  };
}
