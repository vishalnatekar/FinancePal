import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/firebase";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

export function useFirebaseAuth() {
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