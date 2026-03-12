// src/services/alumni/AuthService.ts

import authClient from "../Interceptors/interceptorsApiAccess";
import type { AuthResponse } from "../../models/Auth/AuthResponse";
import type { LoginRequest } from "../../models/Auth/LoginRequest";

type SessionData = {
    accessToken: string | null;
    refreshToken: string | null;
    isAdmin: boolean;
    carreraId: number | null;
    carreraCodigo: string | null;
    carreraNombre: string | null;
};

type RefreshResponse = {
    access: string;
    refresh?: string;
};

export const AUTH_STATE_EVENT = "auth-state-changed";

const STORAGE_KEYS = {
    accessToken: "access_token",
    refreshToken: "refresh_token",
    isAdmin: "is_admin",
    carreraId: "carrera_id",
    carreraCodigo: "carrera_codigo",
    carreraNombre: "carrera_nombre",
    profileCache: "user_alumni_profile_completo",
} as const;

const parseBoolean = (value: string | null): boolean => value === "true";

const parseNumberOrNull = (value: string | null): number | null => {
    if (value === null || value.trim() === "") return null;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
};

const parseStringOrNull = (value: string | null): string | null => {
    if (value === null || value.trim() === "") return null;
    return value;
};

const notifyAuthStateChanged = (): void => {
    window.dispatchEvent(
        new CustomEvent(AUTH_STATE_EVENT, {
            detail: {
                isAuthenticated: Boolean(localStorage.getItem(STORAGE_KEYS.accessToken)),
                isAdmin: parseBoolean(localStorage.getItem(STORAGE_KEYS.isAdmin)),
            },
        })
    );
};

export const AuthService = {
    async login(loginRequest: LoginRequest): Promise<AuthResponse> {
        const response = await authClient.post<AuthResponse>("token/", loginRequest);
        const auth = response.data;

        this.saveSession(auth);
        return auth;
    },

    getCurrentUserId(): number | null {
        const accessToken = this.getAccessToken();
        if (!accessToken) {
            return null;
        }
        try {
            const payloadBase64 = accessToken.split(".")[1];
            const payloadJson = atob(payloadBase64);
            const payload = JSON.parse(payloadJson);
            return typeof payload.user_id === "number" ? payload.user_id : null;
        } catch (error) {
            console.warn("No se pudo obtener el ID de usuario del token:", error);
            return null;
        }
    },

    saveSession(auth: AuthResponse): void {
        localStorage.setItem(STORAGE_KEYS.accessToken, auth.access);
        localStorage.setItem(STORAGE_KEYS.refreshToken, auth.refresh);
        localStorage.setItem(STORAGE_KEYS.isAdmin, String(auth.is_admin));

        if (auth.carrera_id === null) {
            localStorage.removeItem(STORAGE_KEYS.carreraId);
        } else {
            localStorage.setItem(STORAGE_KEYS.carreraId, String(auth.carrera_id));
        }

        if (auth.carrera_codigo === null) {
            localStorage.removeItem(STORAGE_KEYS.carreraCodigo);
        } else {
            localStorage.setItem(STORAGE_KEYS.carreraCodigo, auth.carrera_codigo);
        }

        if (auth.carrera_nombre === null) {
            localStorage.removeItem(STORAGE_KEYS.carreraNombre);
        } else {
            localStorage.setItem(STORAGE_KEYS.carreraNombre, auth.carrera_nombre);
        }

        localStorage.removeItem(STORAGE_KEYS.profileCache);
        notifyAuthStateChanged();
    },

    getSession(): SessionData {
        return {
            accessToken: localStorage.getItem(STORAGE_KEYS.accessToken),
            refreshToken: localStorage.getItem(STORAGE_KEYS.refreshToken),
            isAdmin: parseBoolean(localStorage.getItem(STORAGE_KEYS.isAdmin)),
            carreraId: parseNumberOrNull(localStorage.getItem(STORAGE_KEYS.carreraId)),
            carreraCodigo: parseStringOrNull(localStorage.getItem(STORAGE_KEYS.carreraCodigo)),
            carreraNombre: parseStringOrNull(localStorage.getItem(STORAGE_KEYS.carreraNombre)),
        };
    },

    getAccessToken(): string | null {
        return this.getSession().accessToken;
    },

    getRefreshToken(): string | null {
        return this.getSession().refreshToken;
    },

    getCarreraId(): number | null {
        return this.getSession().carreraId;
    },

    getCarreraCodigo(): string | null {
        return this.getSession().carreraCodigo;
    },

    getCarreraNombre(): string | null {
        return this.getSession().carreraNombre;
    },

    isAuthenticated(): boolean {
        return Boolean(this.getAccessToken());
    },

    isAdmin(): boolean {
        return this.getSession().isAdmin;
    },

    updateTokens(access: string, refresh?: string | null): void {
        localStorage.setItem(STORAGE_KEYS.accessToken, access);

        if (refresh && refresh.trim()) {
            localStorage.setItem(STORAGE_KEYS.refreshToken, refresh);
        }

        notifyAuthStateChanged();
    },

    async refreshSession(): Promise<string | null> {
        const refresh = this.getRefreshToken();

        if (!refresh) {
            return null;
        }

        try {
            const response = await authClient.post<RefreshResponse>("token/refresh/", {
                refresh,
            });

            const newAccess = response.data.access;
            const newRefresh = response.data.refresh ?? refresh;

            this.updateTokens(newAccess, newRefresh);
            return newAccess;
        } catch (error) {
            console.warn("No se pudo refrescar la sesión.", error);
            this.clearSession();
            return null;
        }
    },

    clearSession(): void {
        localStorage.removeItem(STORAGE_KEYS.accessToken);
        localStorage.removeItem(STORAGE_KEYS.refreshToken);
        localStorage.removeItem(STORAGE_KEYS.isAdmin);
        localStorage.removeItem(STORAGE_KEYS.carreraId);
        localStorage.removeItem(STORAGE_KEYS.carreraCodigo);
        localStorage.removeItem(STORAGE_KEYS.carreraNombre);
        localStorage.removeItem(STORAGE_KEYS.profileCache);
        notifyAuthStateChanged();
    },
};

export default AuthService;