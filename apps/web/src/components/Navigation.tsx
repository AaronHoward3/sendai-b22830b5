import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, LogIn, Plus, User, UserPlus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/lib/supabaseClient";
import { Logo } from "./ui/Logo";

interface NavigationProps {
  onHomeClick?: () => void;
}

const Navigation: React.FC<NavigationProps> = ({ onHomeClick }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading, signOut } = useSupabaseAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  const isOnGenerator = location.pathname.startsWith("/generator");
  const isDashboard = location.pathname === "/dashboard";
  const isMyEmails = location.pathname === "/my-emails";
  const isAdminPage = location.pathname === "/admin";

  useEffect(() => {
    let cancelled = false;
    async function loadRole() {
      if (!user?.id) {
        if (!cancelled) setIsAdmin(false);
        return;
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cancelled) setIsAdmin(Boolean(data?.is_admin) && !error);
    }
    loadRole();
    return () => { cancelled = true; };
  }, [user?.id]);

  const handleHomeClick = () => {
    if (onHomeClick) {
      onHomeClick();
    } else {
      navigate("/");
    }
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background">
        <div className="relative flex items-center justify-between px-4 py-3">
          {/* Home Button */}
          <Button
            onClick={handleHomeClick}
            variant={isOnGenerator ? "secondary" : "ghost"}
            size="sm"
            className="flex items-center gap-2"
          >
            <Home className="h-4 w-4" />
            Home
          </Button>

          {/* Center Title - Clickable Logo */}
          <button
            onClick={handleHomeClick}
            className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 text-lg font-zen text-foreground hover:text-primary transition-colors cursor-pointer"
          >
            <Logo size="md" />
          </button>

          {/* Profile Section */}
          {loading ? (
            // Skeleton loading state - match Account button width
            <div className="h-8 w-24 bg-muted animate-pulse rounded-md"></div>
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={isDashboard || isMyEmails || isAdminPage ? "secondary" : "ghost"}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <User className="h-4 w-4" />
                  Account
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-48 bg-background border border-border shadow-lg"
              >
                <DropdownMenuItem asChild>
                  <Link to="/dashboard" className="w-full cursor-pointer">
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/my-emails" className="w-full cursor-pointer">
                    My emails
                  </Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin" className="w-full cursor-pointer">
                      Admin
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem 
                  onClick={signOut}
                  className="w-full cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                onClick={() => navigate("/signin")}
              >
                <LogIn className="h-4 w-4" />
                Sign in
              </Button>
              <Button
                variant="default"
                size="sm"
                className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => navigate("/signup")}
              >
                <UserPlus className="h-4 w-4" />
                Sign up
              </Button>
            </div>
          )}
        </div>
      </nav>
    </>
  );
};

export default Navigation;
