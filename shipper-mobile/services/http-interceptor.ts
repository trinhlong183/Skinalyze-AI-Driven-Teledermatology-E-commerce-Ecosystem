import { router } from "expo-router";
import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import AuthService from "./auth.service";

let isRedirecting = false;

/**
 * Setup axios interceptors for handling authentication errors
 */
export function setupHttpInterceptors() {
  // Request interceptor - Add auth token to requests
  axios.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      // Get token from AuthService
      const token = await AuthService.getAccessToken();

      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      return config;
    },
    (error: AxiosError) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor - Handle 401 errors
  axios.interceptors.response.use(
    (response: AxiosResponse) => {
      return response;
    },
    async (error: AxiosError) => {
      const status = error.response?.status;

      // Handle 401 Unauthorized
      if (status === 401) {
        console.warn("⚠️  Token expired or invalid (401). Clearing storage...");

        // Prevent multiple redirects
        if (!isRedirecting) {
          isRedirecting = true;

          try {
            // Clear auth data
            await AuthService.logout();

            // Redirect to login after a small delay
            setTimeout(() => {
              isRedirecting = false;
              router.replace("/login");
            }, 100);
          } catch (logoutError) {
            console.error("Error during auto-logout:", logoutError);
            isRedirecting = false;
          }
        }
      }

      return Promise.reject(error);
    }
  );
}

export default setupHttpInterceptors;
