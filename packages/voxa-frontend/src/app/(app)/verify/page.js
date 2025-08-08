"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import returnAPIUrl from "@/config/config";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

const ICON_URL =
  "https://assets-v2.codedesign.ai/storage/v1/object/public/voxa-assets//voxa-icon-Photoroom.png";

// Create a client component that uses useSearchParams
const VerifyContent = () => {
  const [status, setStatus] = useState("verifying"); // verifying, success, error
  const [message, setMessage] = useState("Verifying your magic link...");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { checkAuthStatus } = useAuth();

  console.log("verify page");
  useEffect(() => {
    const verifyToken = async () => {
      try {
        const token = searchParams.get("token");
        if (!token) {
          setStatus("error");
          setMessage("Invalid verification link. No token provided.");
          return;
        }

        // Make API call to verify the token
        const response = await fetch(
          `${returnAPIUrl()}/auth/verify-magic-link`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ token }),
            credentials: "include",
          }
        );

        if (response.ok) {
          setStatus("success");
          setMessage("Verification successful! Redirecting to dashboard...");

          // Check auth status and update context
          await checkAuthStatus();

          // Redirect after a short delay
          setTimeout(() => {
            router.push("/");
          }, 2000);
        } else {
          const data = await response.json();
          setStatus("error");
          setMessage(
            data.message ||
              "Failed to verify your magic link. It may have expired."
          );
        }
      } catch (error) {
        console.error("Verification error:", error);
        setStatus("error");
        setMessage("An error occurred during verification. Please try again.");
      }
    };

    verifyToken();
  }, [searchParams, router, checkAuthStatus]);

  let statusIcon;
  let statusTitle;

  switch (status) {
    case "success":
      statusIcon = <CheckCircle2 className="h-16 w-16 text-green-600" />;
      statusTitle = "Verification Successful";
      break;
    case "error":
      statusIcon = <XCircle className="h-16 w-16 text-red-600" />;
      statusTitle = "Verification Failed";
      break;
    default: // verifying
      statusIcon = <Loader2 className="h-16 w-16 animate-spin text-primary" />;
      statusTitle = "Verifying Magic Link";
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background px-4">
      <div className="flex items-center mb-8">
        <img
          src={ICON_URL}
          alt="Voxa.ai Logo"
          width={32}
          height={32}
          className="mr-2"
        />
        <h4 className="font-medium text-xl text-primary leading-7">
          Voxa.ai
        </h4>
      </div>

      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            {statusIcon}
            <h2 className="text-2xl font-semibold">{statusTitle}</h2>
            <p className="text-muted-foreground">{message}</p>
          </div>
        </CardContent>
        {status === "error" && (
          <CardFooter>
            <Button onClick={() => router.push("/login")} className="w-full">
              Back to Login
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
};

// Create a loading fallback using ShadCN components
const VerifyLoading = () => (
  <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background px-4">
    <div className="flex items-center mb-8">
      <img
        src={ICON_URL}
        alt="Voxa.ai Logo"
        width={32}
        height={32}
        className="mr-2"
      />
      <h4 className="font-medium text-xl text-primary leading-7">Voxa.ai</h4>
    </div>
    <Card className="w-full max-w-md">
      <CardContent className="pt-6">
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
          <h2 className="text-2xl font-semibold">Loading...</h2>
        </div>
      </CardContent>
    </Card>
  </div>
);

// Main page component with Suspense
const VerifyPage = () => {
  return (
    <Suspense fallback={<VerifyLoading />}>
      <VerifyContent />
    </Suspense>
  );
};

export default VerifyPage;
