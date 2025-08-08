"use client";
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import returnAPIUrl from "@/config/config";
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch";

const apiUrl = returnAPIUrl();

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState("pending");
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const { fetchWithAuth } = useAuthenticatedFetch();
  const [profileLoading, setProfileLoading] = useState(false);

  // Fetch user profile information including onboarding status
  const fetchUserProfile = useCallback(async () => {
    if (!user || !user.id || profileLoading) return null;

    setProfileLoading(true);
    try {
      const response = await fetchWithAuth(`${apiUrl}/user/profile`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const { user: profileData } = await response.json();
        const defaultAgentOnboardingStatus = {
          widget: false,
          voiceSettings: false,
          speechSettings: false,
          knowledgeBase: false,
          // Add more steps as needed
        };
        const agentOnboardingStatus = {
          ...defaultAgentOnboardingStatus,
          ...(profileData.agentOnboardingStatus || {}),
        };
        setUserProfile({ ...profileData, agentOnboardingStatus });
        setIsFirstLogin(!profileData.onboardingCompleted);

        return { ...profileData, agentOnboardingStatus };
      } else {
        console.error("Failed to fetch user profile");
        // If we can't fetch the profile, assume it's a first login
        setIsFirstLogin(true);
        return null;
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      setIsFirstLogin(true);
      return null;
    } finally {
      setProfileLoading(false);
    }
  }, [user]);

  const checkAuthStatus = useCallback(async () => {
    console.log("Checking auth status...");
    try {
      const response = await fetchWithAuth(`${apiUrl}/auth/status`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log("Auth status response:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("Auth success, setting user", data);
        setUser(data.user);
        setIsAdmin(data.user?.isAdmin || false);
        setAccessToken(data.token);
        setIsAuthenticated(true);

        // After authentication, fetch the user's profile
        // This is deferred to the useEffect that watches user changes
        return data.user;
      } else {
        console.log("Auth failed, clearing user");
        setUser(null);
        setUserProfile(null);
        setAccessToken(null);
        setIsAdmin(false);
        setIsAuthenticated(false);
        setIsFirstLogin(false);
        return null;
      }
    } catch (error) {
      console.error("Auth check error:", error);
      setUser(null);
      setUserProfile(null);
      setAccessToken(null);
      setIsAdmin(false);
      setIsAuthenticated(false);
      setIsFirstLogin(false);
      return null;
    }
  }, []);

  const refreshAccessToken = useCallback(async () => {
    try {
      const response = await fetchWithAuth(`${apiUrl}/auth/refresh-token`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAccessToken(data.token);
        return true;
      } else {
        setUser(null);
        setUserProfile(null);
        setAccessToken(null);
        setIsAdmin(false);
        setIsAuthenticated(false);
        setIsFirstLogin(false);
        return false;
      }
    } catch (error) {
      console.error("Failed to refresh access token:", error);
      setUser(null);
      setUserProfile(null);
      setAccessToken(null);
      setIsAdmin(false);
      setIsAuthenticated(false);
      setIsFirstLogin(false);
      return false;
    }
  }, []);

  // Fetch profile when user changes
  useEffect(() => {
    if (user && user.id) {
      fetchUserProfile();
    }
  }, [user]);

  useEffect(() => {
    console.log("Current auth state:", isAuthenticated);
    checkAuthStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetchWithAuth(`${apiUrl}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
      setUser(null);
      setUserProfile(null);
      setAccessToken(null);
      setIsAdmin(false);
      setIsAuthenticated(false);
      setIsFirstLogin(false);
    } catch (error) {
      console.error("Logout error:", error);
    }
  }, []);

  const getWsToken = async () => {
    try {
      const response = await fetchWithAuth(`${apiUrl}/auth/ws-token`, {
        credentials: "include",
      });
      const data = await response.json();
      return data.token;
    } catch (error) {
      console.error("Failed to get WS token:", error);
      return null;
    }
  };

  // Update user profile with onboarding data
  const updateUserProfile = async (profileData) => {
    try {
      const response = await fetchWithAuth(`${apiUrl}/user/profile`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          onBoardingData: profileData,
          onboardingCompleted: true,
        }),
      });

      if (response.ok) {
        const data = await response.json();

        // Update the userProfile state with the new data
        setUserProfile((prev) => ({
          ...prev,
          ...data,
          onboardingCompleted: true,
        }));

        // Set first login to false since onboarding is completed
        setIsFirstLogin(false);

        return { success: true, user: data };
      } else {
        const error = await response.json();
        return {
          success: false,
          error: error.message || "Failed to update profile",
        };
      }
    } catch (error) {
      console.error("Error updating user profile:", error);
      return {
        success: false,
        error: "An error occurred while updating your profile",
      };
    }
  };

  // Check if an email exists in the database
  const checkEmailExists = async (email) => {
    try {
      const response = await fetchWithAuth(`${apiUrl}/auth/check-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          exists: data.exists,
          userData: data.userData || null,
        };
      } else {
        return { success: false, error: "Failed to check email" };
      }
    } catch (error) {
      console.error("Error checking email:", error);
      return {
        success: false,
        error: "Something went wrong while checking the email",
      };
    }
  };

  // Send magic link for authentication
  const sendMagicLink = async (userData) => {
    try {
      console.log("sendMagicLink called with:", userData); // Debug log

      // Ensure type is present and valid
      if (!userData.type || !["login", "signup"].includes(userData.type)) {
        console.error("Missing or invalid type:", userData.type);
        userData.type = userData.type || "login"; // Default to login if missing
      }

      const response = await fetchWithAuth(`${apiUrl}/auth/send-magic-link`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      console.log("sendMagicLink response status:", response.status); // Debug log

      if (response.ok) {
        return { success: true };
      } else {
        const data = await response.json();
        console.error("Magic link API error:", data); // Debug log
        return {
          success: false,
          error: data.message || "Failed to send magic link",
        };
      }
    } catch (error) {
      console.error("Error sending magic link:", error);
      return {
        success: false,
        error: "An error occurred while sending the magic link",
      };
    }
  };

  const markAgentOnboardingAsCompleted = useCallback(async () => {
    console.log(userProfile, "userprofile");
    if (!userProfile || !userProfile._id) {
      console.error(
        "User profile not loaded, cannot mark onboarding as completed."
      );
      return { success: false, error: "User profile not loaded" };
    }

    try {
      const response = await fetchWithAuth(`${apiUrl}/user/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ agentOnboardingCompleted: true }),
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error(
          "Failed to mark agent onboarding as completed:",
          errorData
        );
        throw new Error(
          `Failed to mark agent onboarding as completed: ${
            errorData.message || response.status
          }`
        );
      }

      const updatedProfile = await response.json();
      setUserProfile((prevProfile) => ({
        ...prevProfile,
        ...updatedProfile, // Ensure the entire updated profile is merged
        agentOnboardingCompleted: true, // Explicitly set, though backend should return it
      }));
      console.log("Agent onboarding successfully marked as completed.");
      return { success: true, data: updatedProfile };
    } catch (error) {
      console.error("Error in markAgentOnboardingAsCompleted:", error.message);
      return { success: false, error: error.message };
    }
  }, [fetchWithAuth, apiUrl, setUserProfile, userProfile]);

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        profileLoading,
        isAuthenticated,
        isAdmin,
        isFirstLogin,
        checkAuthStatus,
        fetchUserProfile,
        logout,
        accessToken,
        refreshAccessToken,
        getWsToken,
        checkEmailExists,
        sendMagicLink,
        updateUserProfile,
        markAgentOnboardingAsCompleted,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
