const API_CONFIG = {
  production: process.env.NEXT_PUBLIC_API_URL_PRODUCTION, // Production API URL from env
  development: process.env.NEXT_PUBLIC_API_URL_DEVELOPMENT, // Development API URL from env
};

const returnAPIUrl = () => {
  return API_CONFIG[process.env.NODE_ENV] || API_CONFIG.development;
};

export default returnAPIUrl;
