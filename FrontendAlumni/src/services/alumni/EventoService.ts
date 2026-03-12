// src/services/alumni/EventoService.ts

import api from "../Interceptors/interceptorsApiContent";
import type {
    Evento,
    EventoEstado,
    EventoParticipante,
} from "../../models/Evento/Evento";
import type { EventoRequest } from "../../models/Evento/EventoRequest";

export interface EventoListFilters {
    estado?: EventoEstado;
    requiere_registro?: boolean;
    carrera?: number;
    para_mi?: boolean;
}

export interface EventoInscripcionResponse {
    message: string;
    evento?: Evento;
}

const buildQueryParams = (filters?: EventoListFilters): URLSearchParams => {
    const params = new URLSearchParams();

    if (!filters) return params;

    if (filters.estado) {
        params.set("estado", filters.estado);
    }

    if (typeof filters.requiere_registro === "boolean") {
        params.set("requiere_registro", String(filters.requiere_registro));
    }

    if (typeof filters.carrera === "number" && Number.isFinite(filters.carrera)) {
        params.set("carrera", String(filters.carrera));
    }

    if (typeof filters.para_mi === "boolean") {
        params.set("para_mi", String(filters.para_mi));
    }

    return params;
};

const multipartHeaders = (data: FormData | unknown) =>
    data instanceof FormData
        ? { "Content-Type": "multipart/form-data" }
        : undefined;

export const EventoService = {
    async list(filters?: EventoListFilters): Promise<Evento[]> {
        const params = buildQueryParams(filters);
        const query = params.toString();
        const url = query ? `evento/?${query}` : "evento/";

        const response = await api.get<Evento[]>(url);
        return Array.isArray(response.data) ? response.data : [];
    },

    async get(id: number): Promise<Evento> {
        const response = await api.get<Evento>(`evento/${id}/`);
        return response.data;
    },

    async create(data: FormData | EventoRequest): Promise<Evento> {
        const response = await api.post<Evento>("evento/", data, {
            headers: multipartHeaders(data),
        });
        return response.data;
    },

    async update(id: number, data: FormData | EventoRequest | Partial<EventoRequest>): Promise<Evento> {
        const response = await api.put<Evento>(`evento/${id}/`, data, {
            headers: multipartHeaders(data),
        });
        return response.data;
    },

    async delete(id: number): Promise<void> {
        await api.delete(`evento/${id}/`);
    },

    async inscribirUsuario(eventoId: number, userId?: number): Promise<EventoInscripcionResponse> {
        const payload = typeof userId === "number" ? { user_id: userId } : {};
        const response = await api.post<EventoInscripcionResponse>(
            `evento/${eventoId}/inscribir_usuario/`,
            payload
        );
        return response.data;
    },

    async desinscribirUsuario(eventoId: number, userId?: number): Promise<EventoInscripcionResponse> {
        const payload = typeof userId === "number" ? { user_id: userId } : {};
        const response = await api.post<EventoInscripcionResponse>(
            `evento/${eventoId}/desinscribir_usuario/`,
            payload
        );
        return response.data;
    },

    async usuariosDetalle(eventoId: number): Promise<EventoParticipante[]> {
        const response = await api.get<{ usuarios: EventoParticipante[] }>(
            `evento/${eventoId}/usuarios_detalle/`
        );
        return Array.isArray(response.data?.usuarios) ? response.data.usuarios : [];
    },
};