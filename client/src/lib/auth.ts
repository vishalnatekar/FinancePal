import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../firebase";
import { apiRequest } from "./queryClient";

const provider = new GoogleAuthProvider();

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

export async function signInWithGoogle(): Promise<AuthUser> {
  try {
    if (!auth) {
      throw new Error("Firebase is not configured. Please provide Firebase environment variables.");
    }
    
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    
    // Send the user data to our backend
    const response = await apiRequest("POST", "/api/auth/google", {
      user: {
        email: user.email,
        name: user.displayName,
        picture: user.photoURL,
        sub: user.uid,
      }
    });
    
    const data = await response.json();
    return data.user;
  } catch (error) {
    console.error("Google sign in error:", error);
    throw new Error("Failed to sign in with Google");
  }
}

export async function signOutUser(): Promise<void> {
  try {
    if (auth) {
      await signOut(auth);
    }
    await apiRequest("POST", "/api/auth/logout", {});
  } catch (error) {
    console.error("Sign out error:", error);
    throw new Error("Failed to sign out");
  }
}

export function onAuthStateChange(callback: (user: User | null) => void) {
  if (!auth) {
    // If Firebase is not configured, immediately call callback with null
    callback(null);
    return () => {}; // Return a no-op unsubscribe function
  }
  return onAuthStateChanged(auth, callback);
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const response = await apiRequest("GET", "/api/auth/me", {});
    const data = await response.json();
    return data.user;
  } catch (error) {
    return null;
  }
}
