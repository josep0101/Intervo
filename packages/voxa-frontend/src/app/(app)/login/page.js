"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import AuthForm from "@/components/auth/AuthForm";
import returnAPIUrl from "@/config/config";

const Page = () => {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { isAuthenticated, checkAuthStatus } = useAuth();

  useEffect(() => {
    // Check authentication status on load
    if (isAuthenticated === true) {
      router.push("/");
    } else if (!isAuthenticated) {
      checkAuthStatus(); // This will make a call to check if the user is authenticated
    }
  }, [isAuthenticated, router, checkAuthStatus]);

  const handleGoogleAuth = () => {
    setLoading(true);
    try {
      // Redirect the user to the backend's Google authentication endpoint
      window.location.href = `${returnAPIUrl()}/auth/google`;
    } catch (error) {
      console.error("Login error: ", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthForm
      type="login"
      handleGoogleAuth={handleGoogleAuth}
      loading={loading}
      setLoading={setLoading}
    />
  );
};

export default Page;
