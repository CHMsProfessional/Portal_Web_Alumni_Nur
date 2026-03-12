import api from "../Interceptors/interceptorsApiAccess";
import apiContent from "../Interceptors/interceptorsApiContent";

import { Usuario } from "../../models/Usuario/Usuario";
import { UsuarioPerfil } from "../../models/Usuario/UsuarioPerfil";

import { UserAlumniAdminCreateRequest } from "../../models/Usuario/UserAlumniAdminCreateRequest";
import { UserAlumniAdminUpdateRequest } from "../../models/Usuario/UserAlumniAdminUpdateRequest";
import { UserAlumniSelfUpdateRequest } from "../../models/Usuario/UserAlumniSelfUpdateRequest";

const BASE_URL = "/userAlumni/";
const PERFIL_COMPLETO_URL = "/perfil-completo/";
const PERFIL_CACHE_KEY = "user_alumni_profile_completo";
const PERFIL_CACHE_TTL_MS = 5 * 60 * 1000; // 5 min

const setCachedPerfilCompleto = (data: UsuarioPerfil): void => {
    const payload = {
        timestamp: Date.now(),
        data,
    };
    localStorage.setItem(PERFIL_CACHE_KEY, JSON.stringify(payload));
};

const getCachedPerfilCompleto = (): UsuarioPerfil | null => {
    const raw = localStorage.getItem(PERFIL_CACHE_KEY);
    if (!raw) return null;

    try {
        const parsed = JSON.parse(raw) as {
            timestamp?: number;
            data?: UsuarioPerfil;
        };

        if (!parsed?.timestamp || !parsed?.data) {
            clearCachedPerfilCompleto();
            return null;
        }

        const isExpired =
            Date.now() - parsed.timestamp > PERFIL_CACHE_TTL_MS;

        if (isExpired) {
            clearCachedPerfilCompleto();
            return null;
        }

        return parsed.data;
    } catch (error) {
        console.warn("No se pudo leer cache de perfil completo:", error);
        clearCachedPerfilCompleto();
        return null;
    }
};

const clearCachedPerfilCompleto = (): void => {
    localStorage.removeItem(PERFIL_CACHE_KEY);
};

export const UserAlumniService = {
    // =========================
    // Helpers de cache
    // =========================
    setCachedPerfilCompleto,
    getCachedPerfilCompleto,
    clearCachedPerfilCompleto,

    // =========================
    // Lectura admin
    // =========================
    async getAll(): Promise<Usuario[]> {
        const response = await api.get<Usuario[]>(BASE_URL);
        return response.data;
    },

    async getById(id: number): Promise<Usuario> {
        const response = await api.get<Usuario>(`${BASE_URL}${id}/`);
        return response.data;
    },

    async getByCarrera(carreraId: number): Promise<Usuario[]> {
        const response = await api.get<Usuario[]>(
            `${BASE_URL}?carrera=${carreraId}`
        );
        return response.data;
    },

    async getByIds(ids: number[]): Promise<{
        encontrados: Usuario[];
        faltantes: number[];
    }> {
        const uniqueIds = Array.from(new Set(ids)).filter((id) =>
            Number.isFinite(id)
        );

        if (!uniqueIds.length) {
            return { encontrados: [], faltantes: [] };
        }

        const response = await api.get<{
            encontrados: Usuario[];
            faltantes: number[];
        }>(`${BASE_URL}?ids=${uniqueIds.join(",")}`);

        return response.data;
    },

    // =========================
    // Perfil propio
    // =========================
    async getMe(): Promise<Usuario> {
        const response = await api.get<Usuario>(`${BASE_URL}me/`);
        return response.data;
    },

    async getPerfilCompleto(): Promise<UsuarioPerfil> {
        const response = await apiContent.get<UsuarioPerfil>(PERFIL_COMPLETO_URL);
        return response.data;
    },

    async loadPerfilCompleto(forceRefresh = false): Promise<UsuarioPerfil> {
        if (!forceRefresh) {
            const cached = getCachedPerfilCompleto();
            if (cached) {
                return cached;
            }
        }

        const data = await this.getPerfilCompleto();
        setCachedPerfilCompleto(data);
        return data;
    },

    // =========================
    // Mutaciones admin
    // =========================
    async createAdminUser(
        payload: UserAlumniAdminCreateRequest
    ): Promise<Usuario> {
        const response = await api.post<Usuario>(BASE_URL, payload);
        clearCachedPerfilCompleto();
        return response.data;
    },

    async updateAdminUser(
        id: number,
        payload: UserAlumniAdminUpdateRequest
    ): Promise<Usuario> {
        const response = await api.put<Usuario>(`${BASE_URL}${id}/`, payload);
        clearCachedPerfilCompleto();
        return response.data;
    },

    async patchAdminUser(
        id: number,
        payload: Partial<UserAlumniAdminUpdateRequest>
    ): Promise<Usuario> {
        const response = await api.patch<Usuario>(`${BASE_URL}${id}/`, payload);
        clearCachedPerfilCompleto();
        return response.data;
    },

    async deleteUser(id: number): Promise<void> {
        await api.delete(`${BASE_URL}${id}/`);
        clearCachedPerfilCompleto();
    },

    // =========================
    // Mutaciones usuario autenticado
    // =========================
    async updateMyProfile(
        id: number,
        payload: UserAlumniSelfUpdateRequest
    ): Promise<Usuario> {
        const response = await api.put<Usuario>(`${BASE_URL}${id}/`, payload);

        clearCachedPerfilCompleto();

        try {
            await this.loadPerfilCompleto(true);
        } catch (error) {
            console.warn(
                "Se actualizó el perfil, pero no se pudo refrescar el cache local:",
                error
            );
        }

        return response.data;
    },

    async patchMyProfile(
        id: number,
        payload: Partial<UserAlumniSelfUpdateRequest>
    ): Promise<Usuario> {
        const response = await api.patch<Usuario>(`${BASE_URL}${id}/`, payload);

        clearCachedPerfilCompleto();

        try {
            await this.loadPerfilCompleto(true);
        } catch (error) {
            console.warn(
                "Se actualizó el perfil, pero no se pudo refrescar el cache local:",
                error
            );
        }

        return response.data;
    },
};

export default UserAlumniService;