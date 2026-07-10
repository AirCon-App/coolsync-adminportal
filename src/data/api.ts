import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api/v1",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Anonymous auth endpoints legitimately return 401/400 on bad input; a failed
// login must surface its error in the form, not trigger the expired-session
// redirect (which reloads the page and wipes the message before it renders).
const ANONYMOUS_AUTH_ENDPOINT = /auth\/(login|forgot-password|reset-password|change-password)/i;

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const isAuthEndpoint = ANONYMOUS_AUTH_ENDPOINT.test(err.config?.url ?? "");
    if (err.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem("token");
      localStorage.removeItem("cs-active-building");
      window.location.href = "/";
    }
    return Promise.reject(err);
  }
);

export default api;
