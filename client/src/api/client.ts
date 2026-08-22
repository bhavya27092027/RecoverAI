import axios from 'axios';

/**
 * Resolves the centralized API base URL.
 *
 * In Production (e.g. Netlify deployment):
 * Reads `import.meta.env.VITE_API_URL` (e.g. "https://recoverai-production-c6d5.up.railway.app").
 * Formats the base URL to ensure all endpoints prefix with `/api`.
 *
 * In Local Development:
 * If `VITE_API_URL` is unset or empty, defaults to `/api` which is proxied by Vite to `http://localhost:5000`.
 */
export const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (!envUrl || envUrl.trim() === '') {
    return '/api';
  }

  // Strip trailing slashes
  const trimmed = envUrl.trim().replace(/\/+$/, '');

  // If already ends with /api, use as is
  if (trimmed.endsWith('/api')) {
    return trimmed;
  }

  // Append /api
  return `${trimmed}/api`;
};

export const API_BASE_URL = getApiBaseUrl();

// Create configured Axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Crucial for HTTP-only session cookies in cross-origin production
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for standardized error extraction
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const customMessage =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred';
    return Promise.reject(new Error(customMessage));
  }
);

export default apiClient;
