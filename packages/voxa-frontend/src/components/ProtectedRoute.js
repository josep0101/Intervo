"use client";
import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { Loader } from "@/components/ui/loader.js";

export default function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isPublicRoute =
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/forgot-password" ||
    pathname === "/verify";

  useEffect(() => {
    // Only handle redirects if we have a definitive "false" authentication state
    // and we're not on a public route
    if (isAuthenticated === false && !isPublicRoute) {
      router.push(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, router, pathname]);

  // For public routes, always show content
  if (isPublicRoute) {
    return children;
  }

  // For private routes:
  // - Show content if authenticated is true
  // - Show loading state if pending
  // - Show nothing if false (will redirect)
  if (isAuthenticated === true) {
    return children;
  } else if (isAuthenticated === "pending") {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader size={40} />
      </div>
    );
  }

  return null;
}
