import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ChartLine, RefreshCw, ChevronDown, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { signOutUser } from "@/lib/auth";
import { isDemoMode, clearDemoSession } from "@/lib/demoAuth";
import type { AuthUser } from "@/lib/auth";

interface HeaderProps {
  user: AuthUser;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function Header({ user, onRefresh, isRefreshing }: HeaderProps) {
  const [location] = useLocation();
  const { toast } = useToast();

  const handleSignOut = async () => {
    try {
      if (isDemoMode()) {
        clearDemoSession();
        window.location.reload();
      } else {
        await signOutUser();
      }
      toast({
        title: "Signed Out",
        description: "You have been successfully signed out",
      });
    } catch (error) {
      toast({
        title: "Sign Out Failed",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const navItems = [
    { path: "/", label: "Dashboard", active: location === "/" },
    { path: "/transactions", label: "Transactions", active: location === "/transactions" },
    { path: "/budget", label: "Budget", active: location === "/budget" },
    { path: "/goals", label: "Goals", active: location === "/goals" },
    { path: "/accounts", label: "Accounts", active: location === "/accounts" },
  ];

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <ChartLine className="h-8 w-8 text-primary mr-3" />
            <h1 className="text-xl font-bold text-gray-900">Personal Finance Hub</h1>
          </div>
          
          <nav className="hidden md:flex space-x-8">
            {navItems.map((item) => (
              <Link key={item.path} href={item.path}>
                <span
                  className={`pb-4 ${
                    item.active
                      ? "text-primary font-medium border-b-2 border-primary"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            ))}
          </nav>
          
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="text-gray-600 hover:text-gray-900"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback>
                      {user.name.split(" ").map((n) => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-gray-700">{user.name}</span>
                  <ChevronDown className="h-4 w-4 text-gray-600" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
