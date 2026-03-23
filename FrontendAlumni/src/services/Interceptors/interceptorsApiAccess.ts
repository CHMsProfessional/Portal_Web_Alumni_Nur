import axios, {
    AxiosError,
    AxiosInstance,
    InternalAxiosRequestConfig,
} from "axios";
import { AuthService } from "../alumni/AuthService";

type RetryableRequestConfig = InternalAxiosRequestConfig & {
    _retry?: boolean;
};

type RefreshResponse = {
    access: string;
    refresh?: string;
};

let refreshPromise: Promise<string> | null = null;

const api: AxiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_ACCESS_URL,
    timeout: 10000,
});

const refreshClient: AxiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_ACCESS_URL,
    timeout: 5000,
});

function redirectToLogin(): void {
    if (window.location.pathname !== "/login") {
        window.location.href = "/login";
    }
}

function hasBearerToken(config?: RetryableRequestConfig): boolean {
    if (!config?.headers) return false;

    const authHeader =
        config.headers.get?.("Authorization") ??
        config.headers.Authorization ??
        config.headers.authorization;

    return typeof authHeader === "string" && authHeader.startsWith("Bearer ");
}

function isAuthFailure(error: AxiosError): boolean {
    const status = error.response?.status;

    if (status === 401) {
        return true;
    }

    if (status === 403) {
        return true;
    }

    return false;
}

async function refreshAccessToken(): Promise<string> {
    const refreshToken = AuthService.getRefreshToken();

    if (!refreshToken) {
        throw new Error("No refresh token available");
    }

    if (!refreshPromise) {
        refreshPromise = refreshClient
            .post<RefreshResponse>("token/refresh/", {
                refresh: refreshToken,
            })
            .then((response) => {
                const { access, refresh } = response.data;

                AuthService.updateTokens(access, refresh);

                return access;
            })
            .finally(() => {
                refreshPromise = null;
            });
    }

    return refreshPromise;
}

api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = AuthService.getAccessToken();

        if (token) {
            config.headers.set("Authorization", `Bearer ${token}`);
        }

        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as RetryableRequestConfig | undefined;

        if (!originalRequest) {
            return Promise.reject(error);
        }

        if (originalRequest._retry) {
            return Promise.reject(error);
        }

        if (!isAuthFailure(error)) {
            return Promise.reject(error);
        }

        if (!hasBearerToken(originalRequest)) {
            return Promise.reject(error);
        }

        originalRequest._retry = true;

        try {
            const newAccessToken = await refreshAccessToken();
            originalRequest.headers.set("Authorization", `Bearer ${newAccessToken}`);
            return api(originalRequest);
        } catch (refreshError) {
            AuthService.clearSession();
            redirectToLogin();
            return Promise.reject(refreshError);
        }
    }
);

export { api, refreshClient };
export default api;