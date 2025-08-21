import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/firebase";
import { GoogleAuthProvider, signInWithRedirect, signOut } from "firebase/auth";

export function useFirebaseAuth() {
  const [user, loading, error] = useAuthState(auth);

  const signInWithGoogle = () => {
    const provider = new GoogleAuthProvider();
    signInWithRedirect(auth, provider);
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