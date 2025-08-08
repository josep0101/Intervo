import { useAuth } from "@/context/AuthContext";

export const useAuthenticatedFetch = () => {
  const { accessToken, refreshAccessToken = () => {} } = useAuth() || {};

  const fetchWithAuth = async (url, options = {}) => {
    await refreshAccessToken(); // Refresh token before each call
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${accessToken}`,
      },
    });
  };

  return { fetchWithAuth };
};
