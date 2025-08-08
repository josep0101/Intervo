"use client";
import { useState } from "react";
import Image from "next/image";
import Logo from "@/assets/logo.svg";
import LogoDark from "@/assets/logo2.svg";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FcGoogle } from "react-icons/fc";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

const AuthForm = ({
  type = "login", // login or signup
  handleGoogleAuth,
  loading,
  setLoading,
}) => {
  const [step, setStep] = useState(1); // Step 1: Email, Step 2: Names, Step 3: Confirmation
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState("");
  const { checkEmailExists, sendMagicLink } = useAuth();

  // Text content based on type
  const pageTitle =
    type === "login" ? "Login to your account" : "Create an account";
  const emailSubtitle =
    type === "login"
      ? "Enter your email below to receive a magic link"
      : "Enter your email below to create your account";
  const buttonText = type === "login" ? "Send Magic Link" : "Create Account";
  const confirmationText =
    type === "login"
      ? "Click the link to log in to your account."
      : "Click the link to create and access your account.";
  const backButtonText = type === "login" ? "Back to login" : "Back to sign up";
  const oppositePageLink = type === "login" ? "/signup" : "/login";
  const oppositePageText = type === "login" ? "Sign Up" : "Login";

  const validateEmail = (email) => {
    return email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  };

  const handleEmailSubmit = async () => {
    if (!validateEmail(email)) return;

    setLoading(true);
    setError("");

    console.log("Type in handleEmailSubmit:", type); // Debug log

    try {
      // Check if email exists in database
      const result = await checkEmailExists(email);

      if (!result.success) {
        setError(result.error);
        return;
      }

      if (result.exists) {
        // If email exists, send magic link and go to confirmation step
        const userData = {
          email,
          firstName: result.userData?.firstName || "",
          lastName: result.userData?.lastName || "",
          type: type, // Explicitly assign type
        };

        console.log("Sending userData:", userData); // Debug log

        const sendResult = await sendMagicLink(userData);

        if (sendResult.success) {
          setStep(3); // Go directly to confirmation
        } else {
          setError(sendResult.error);
        }
      } else {
        // If email does not exist, go to name collection step
        setStep(2);
      }
    } catch (err) {
      console.error("Error in email verification:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleNameSubmit = async () => {
    if (!firstName.trim() || !lastName.trim()) return;

    setLoading(true);
    setError("");

    console.log("Type in handleNameSubmit:", type); // Debug log

    try {
      const userData = {
        email,
        firstName,
        lastName,
        type: type, // Explicitly assign type
      };

      console.log("Sending userData:", userData); // Debug log

      const result = await sendMagicLink(userData);

      if (result.success) {
        setStep(3); // Go to confirmation after successful send
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error("Error sending magic link:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <>
            <div className="flex flex-col justify-center min-h-[104px]">
              <h3 className="text-2xl leading-9 font-semibold text-center">
                {pageTitle}
              </h3>
              <p className="text-sm leading-5 text-muted-foreground text-center">
                {emailSubtitle}
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Input
                  className="text-sm leading-5 text-muted-foreground py-2.5 px-3 border border-input truncate max-h-9 rounded-[4px]"
                  placeholder="name@example.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {error && <p className="text-xs text-red-500">{error}</p>}
                <Button
                  variant="default"
                  onClick={handleEmailSubmit}
                  disabled={!validateEmail(email) || loading}
                  className="bg-primary text-primary-foreground py-2 px-3 font-semibold rounded-[6px] text-center text-sm leading-[21px] max-h-9"
                >
                  {loading ? "Processing..." : "Continue"}
                </Button>
              </div>

              <div className="flex gap-2.5 max-h-9 items-center">
                <div className="flex-grow h-[1px] bg-[#E4E4E7]" />
                <p className="text-muted-foreground text-xs leading-[18px]">
                  OR CONTINUE WITH
                </p>
                <div className="flex-grow h-[1px] bg-[#E4E4E7]" />
              </div>

              <Button
                variant="secondary"
                onClick={handleGoogleAuth}
                className="flex items-center justify-center bg-white text-foreground border border-border py-2 px-3 font-medium rounded-[6px] text-center text-sm leading-[21px] max-h-9"
              >
                <FcGoogle className="text-lg mr-2" /> Sign in with Google
              </Button>
            </div>
          </>
        );
      case 2:
        return (
          <>
            <div className="flex flex-col justify-center min-h-[104px]">
              <h3 className="text-2xl leading-9 font-semibold text-center">
                Tell us about yourself
              </h3>
              <p className="text-sm leading-5 text-muted-foreground text-center">
                Please enter your name to continue
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Input
                  className="text-sm leading-5 text-muted-foreground py-2.5 px-3 border border-input truncate max-h-9 rounded-[4px]"
                  placeholder="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
                <Input
                  className="text-sm leading-5 text-muted-foreground py-2.5 px-3 border border-input truncate max-h-9 rounded-[4px]"
                  placeholder="Last Name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
                {error && <p className="text-xs text-red-500">{error}</p>}
                <Button
                  onClick={handleNameSubmit}
                  disabled={!firstName.trim() || !lastName.trim() || loading}
                  className="bg-primary text-primary-foreground py-2 px-3 font-semibold rounded-[6px] text-center text-sm leading-[21px] max-h-9"
                >
                  {loading ? "Processing..." : buttonText}
                </Button>
                <Button
                  onClick={() => setStep(1)}
                  variant="ghost"
                  className="text-muted-foreground py-2 px-3 font-medium rounded-[6px] text-center text-sm leading-[21px] max-h-9"
                >
                  Back
                </Button>
              </div>
            </div>
          </>
        );
      case 3:
        return (
          <>
            <div className="flex flex-col justify-center min-h-[104px] items-center">
              <div className="w-16 h-16 mb-4 flex items-center justify-center rounded-full bg-green-100">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 className="text-2xl leading-9 font-semibold text-center">
                Check your email
              </h3>
              <p className="text-sm leading-5 text-muted-foreground text-center max-w-[300px] mt-2">
                We&apos;ve sent a magic link to <strong>{email}</strong>.{" "}
                {confirmationText}
              </p>
              <Button
                onClick={() => setStep(1)}
                variant="outline"
                className="mt-6 py-2 px-3 font-medium rounded-[6px] text-center text-sm leading-[21px] max-h-9"
              >
                {backButtonText}
              </Button>
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="absolute z-50 min-h-screen top-0 right-0 left-0 bottom-0 flex">
      <div className="w-1/2 max-md:w-0 min-h-screen bg-[#00008D] pt-4 pr-4 pb-8 pl-8 max-md:p-0">
        <div className="h-full w-full pt-8 pb-4 px-4 flex flex-col justify-between">
          <div className="flex gap-4">
            <Image src={Logo} alt="logo" />
            <h4 className="font-medium text-lg text-white leading-7 font-geist">
              Voxa.ai
            </h4>
          </div>
        </div>
      </div>
      <div className="relative w-1/2 max-md:w-full min-h-screen bg-white flex flex-col justify-center items-center m-auto">
        <div className="absolute top-[40px] left-[55px] max-md:left-[24px] flex gap-4 md:hidden">
          <Image src={LogoDark} alt="logo" />
          <h4 className="font-medium text-lg text-black leading-7">
            Voxa.ai
          </h4>
        </div>
        {step < 3 && (
          <Link
            href={oppositePageLink}
            className="absolute top-[45px] right-[60px] max-md:right-[24px] text-sm leading-[21px]"
          >
            {oppositePageText}
          </Link>
        )}
        <div className="flex flex-col p-6 max-w-[418px] w-full">
          {renderStepContent()}
        </div>
        {step < 3 && (
          <p className="text-sm leading-[21px] text-center text-secondaryText">
            By Clicking continue, you agree to our{" "}
            <span className="underline">
              Terms
              <br />
              of Service
            </span>{" "}
            and <span className="underline">Privacy Policy</span>.
          </p>
        )}
      </div>
    </div>
  );
};

export default AuthForm;
