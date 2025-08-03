// Demo authentication system for when Firebase is not configured
export interface DemoUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

const DEMO_USER: DemoUser = {
  id: "demo_user_1",
  email: "demo@financepal.co.uk",
  name: "Demo User",
  avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face"
};

export function getDemoUser(): DemoUser {
  return DEMO_USER;
}

export function setDemoSession(): void {
  localStorage.setItem("demo_session", JSON.stringify(DEMO_USER));
}

export function clearDemoSession(): void {
  localStorage.removeItem("demo_session");
}

export function getDemoSession(): DemoUser | null {
  try {
    const session = localStorage.getItem("demo_session");
    return session ? JSON.parse(session) : null;
  } catch {
    return null;
  }
}

export function isDemoMode(): boolean {
  return getDemoSession() !== null;
}