// src/services/alumni/ComunidadService.ts

import api from "../Interceptors/interceptorsApiContent";
import type { Comunidad } from "../../models/Comunidad/Comunidad";
import type { ComunidadRequest } from "../../models/Comunidad/ComunidadRequest";
import type { ConversacionComunidad, EstadoConversacion } from "../../models/Comunidad/ConversacionComunidad";
import type { Noticia } from "../../models/Noticia/Noticia";
import type { Usuario } from "../../models/Usuario/Usuario";
import type { Carrera } from "../../models/Carrera/Carrera";

export interface ComunidadFilters {
    activo?: boolean;
    carrera?: number;
    usuario?: number;
    [key: string]: PrimitiveValue;
}

export interface ComunidadNoticiasFilters {
    publicado?: boolean;
    destacado?: boolean;
    vigente?: boolean;
    [key: string]: PrimitiveValue;
}

export interface ComunidadConversacionesFilters {
    estado?: EstadoConversacion;
    [key: string]: PrimitiveValue | EstadoConversacion;
}

export interface ComunidadHubResponse {
    comunidad: Comunidad;
    conversaciones: ConversacionComunidad[];
    noticias: Noticia[];
}

type PrimitiveValue = string | number | boolean | null | undefined;

const buildQueryParams = (
    filters?: Record<string, PrimitiveValue>
): URLSearchParams => {
    const params = new URLSearchParams();

    if (!filters) {
        return params;
    }

    Object.entries(filters).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "") {
            return;
        }

        if (typeof value === "boolean") {
            params.append(key, value ? "true" : "false");
            return;
        }

        params.append(key, String(value));
    });

    return params;
};

export const ComunidadService = {
    async list(filters?: ComunidadFilters): Promise<Comunidad[]> {
        const params = buildQueryParams(filters);
        const query = params.toString();
        const endpoint = query ? `comunidad/?${query}` : "comunidad/";

        const response = await api.get<Comunidad[]>(endpoint);
        return response.data;
    },

    async get(id: number): Promise<Comunidad> {
        const response = await api.get<Comunidad>(`comunidad/${id}/`);
        return response.data;
    },

    async create(data: FormData | ComunidadRequest): Promise<Comunidad> {
        const response = await api.post<Comunidad>("comunidad/", data, {
            headers:
                data instanceof FormData
                    ? { "Content-Type": "multipart/form-data" }
                    : undefined,
        });

        return response.data;
    },

    async update(
        id: number,
        data: FormData | Partial<ComunidadRequest>
    ): Promise<Comunidad> {
        const response = await api.put<Comunidad>(`comunidad/${id}/`, data, {
            headers:
                data instanceof FormData
                    ? { "Content-Type": "multipart/form-data" }
                    : undefined,
        });

        return response.data;
    },

    async patch(
        id: number,
        data: FormData | Partial<ComunidadRequest>
    ): Promise<Comunidad> {
        const response = await api.patch<Comunidad>(`comunidad/${id}/`, data, {
            headers:
                data instanceof FormData
                    ? { "Content-Type": "multipart/form-data" }
                    : undefined,
        });

        return response.data;
    },

    async delete(id: number): Promise<void> {
        await api.delete(`comunidad/${id}/`);
    },

    async agregarUsuario(comunidadId: number, userId: number): Promise<Comunidad> {
        const response = await api.post<{ comunidad: Comunidad }>(
            `comunidad/${comunidadId}/agregar_usuario/`,
            { user_id: userId }
        );

        return response.data.comunidad;
    },

    async quitarUsuario(
        comunidadId: number,
        userId: number
    ): Promise<{ message: string }> {
        const response = await api.post<{ message: string }>(
            `comunidad/${comunidadId}/quitar_usuario/`,
            { user_id: userId }
        );

        return response.data;
    },

    async miembrosDetalle(comunidadId: number): Promise<{ usuarios: Usuario[] }> {
        const response = await api.get<{ usuarios: Usuario[] }>(
            `comunidad/${comunidadId}/miembros_detalle/`
        );
        return response.data;
    },

    async carrerasDetalle(comunidadId: number): Promise<{ carreras: Carrera[] }> {
        const response = await api.get<{ carreras: Carrera[] }>(
            `comunidad/${comunidadId}/carreras_detalle/`
        );
        return response.data;
    },

    async getComunidadesOfUser(userId: number): Promise<Comunidad[]> {
        const response = await api.post<Comunidad[]>(
            "comunidad/get-comunidades-of-user/",
            { user_id: userId }
        );
        return response.data;
    },

    async conversaciones(
        comunidadId: number,
        filters?: ComunidadConversacionesFilters
    ): Promise<ConversacionComunidad[]> {
        const params = buildQueryParams(filters);
        const query = params.toString();
        const endpoint = query
            ? `comunidad/${comunidadId}/conversaciones/?${query}`
            : `comunidad/${comunidadId}/conversaciones/`;

        const response = await api.get<{ conversaciones: ConversacionComunidad[] }>(endpoint);
        return response.data.conversaciones ?? [];
    },

    async noticias(
        comunidadId: number,
        filters?: ComunidadNoticiasFilters
    ): Promise<Noticia[]> {
        const params = buildQueryParams(filters);
        const query = params.toString();
        const endpoint = query
            ? `comunidad/${comunidadId}/noticias/?${query}`
            : `comunidad/${comunidadId}/noticias/`;

        const response = await api.get<{ noticias: Noticia[] }>(endpoint);
        return response.data.noticias ?? [];
    },

    async hub(comunidadId: number): Promise<ComunidadHubResponse> {
        const response = await api.get<ComunidadHubResponse>(
            `comunidad/${comunidadId}/hub/`
        );
        return response.data;
    },
};