const API_CONFIG = {
  production:
    import.meta.env?.VITE_API_URL_PRODUCTION ||
    (typeof process !== "undefined" &&
      process.env?.NEXT_PUBLIC_API_URL_PRODUCTION), // Production API URL from env
  development:
    import.meta.env?.VITE_API_URL_DEVELOPMENT ||
    (typeof process !== "undefined" &&
      process.env?.NEXT_PUBLIC_API_URL_DEVELOPMENT), // Development API URL from env
};

// Get environment from Vite's mode or default to development
const environment =
  import.meta.env?.MODE === "production" ? "production" : "production";

// Return the appropriate config based on environment
const returnAPIUrl = () => {
  return API_CONFIG[environment] || API_CONFIG.development;
};

export default returnAPIUrl;
