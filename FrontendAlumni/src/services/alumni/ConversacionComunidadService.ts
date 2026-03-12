// src/services/alumni/ConversacionComunidadService.ts

import api from "../Interceptors/interceptorsApiContent";
import type {
    ConversacionComunidad,
    EstadoConversacion,
} from "../../models/Comunidad/ConversacionComunidad";
import type { ConversacionComunidadRequest } from "../../models/Comunidad/ConversacionComunidadRequest";
import type { MensajeConversacion } from "../../models/Comunidad/MensajeConversacion";

type PrimitiveValue = string | number | boolean | null | undefined;

export interface ConversacionComunidadFilters {
    comunidad?: number;
    estado?: EstadoConversacion;
    activa?: boolean;
    mine?: boolean;
}

const buildQueryParams = (
    filters?: ConversacionComunidadFilters
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

const hasFileValue = (value: unknown): value is File => {
    return typeof File !== "undefined" && value instanceof File;
};

const appendPrimitive = (
    formData: FormData,
    key: string,
    value: PrimitiveValue
): void => {
    if (value === undefined || value === null) return;
    formData.append(key, String(value));
};

const toFormData = (
    payload: ConversacionComunidadRequest
): FormData => {
    const formData = new FormData();

    appendPrimitive(formData, "comunidad", payload.comunidad);
    appendPrimitive(formData, "titulo", payload.titulo);
    appendPrimitive(formData, "descripcion", payload.descripcion);
    appendPrimitive(formData, "estado", payload.estado);
    appendPrimitive(formData, "activa", payload.activa);

    if (payload.imagen === null) {
        formData.append("imagen", "");
    } else if (hasFileValue(payload.imagen)) {
        formData.append("imagen", payload.imagen);
    } else if (typeof payload.imagen === "string" && payload.imagen.trim()) {
        formData.append("imagen", payload.imagen);
    }

    return formData;
};

const shouldUseFormData = (
    payload: ConversacionComunidadRequest | Partial<ConversacionComunidadRequest>
): boolean => {
    return hasFileValue(payload.imagen) || payload.imagen === null;
};

export const ConversacionComunidadService = {
    async list(
        filters?: ConversacionComunidadFilters
    ): Promise<ConversacionComunidad[]> {
        const params = buildQueryParams(filters);
        const query = params.toString();
        const endpoint = query ? `conversaciones/?${query}` : "conversaciones/";

        const response = await api.get<ConversacionComunidad[]>(endpoint);
        return response.data;
    },

    async get(id: number): Promise<ConversacionComunidad> {
        const response = await api.get<ConversacionComunidad>(`conversaciones/${id}/`);
        return response.data;
    },

    async listByComunidad(
        comunidadId: number,
        extraFilters?: Omit<ConversacionComunidadFilters, "comunidad">
    ): Promise<ConversacionComunidad[]> {
        return this.list({
            comunidad: comunidadId,
            ...extraFilters,
        });
    },

    async create(
        data: ConversacionComunidadRequest
    ): Promise<ConversacionComunidad> {
        const payload = shouldUseFormData(data) ? toFormData(data) : data;

        const response = await api.post<ConversacionComunidad>(
            "conversaciones/",
            payload,
            {
                headers:
                    payload instanceof FormData
                        ? { "Content-Type": "multipart/form-data" }
                        : undefined,
            }
        );

        return response.data;
    },

    async update(
        id: number,
        data: Partial<ConversacionComunidadRequest>
    ): Promise<ConversacionComunidad> {
        const payload = shouldUseFormData(data) ? toFormData({
            comunidad: data.comunidad as number,
            titulo: data.titulo as string,
            descripcion: data.descripcion,
            imagen: data.imagen,
            estado: data.estado,
            activa: data.activa,
        }) : data;

        const response = await api.put<ConversacionComunidad>(
            `conversaciones/${id}/`,
            payload,
            {
                headers:
                    payload instanceof FormData
                        ? { "Content-Type": "multipart/form-data" }
                        : undefined,
            }
        );

        return response.data;
    },

    async patch(
        id: number,
        data: Partial<ConversacionComunidadRequest>
    ): Promise<ConversacionComunidad> {
        const payload = shouldUseFormData(data) ? toFormData({
            comunidad: data.comunidad as number,
            titulo: data.titulo as string,
            descripcion: data.descripcion,
            imagen: data.imagen,
            estado: data.estado,
            activa: data.activa,
        }) : data;

        const response = await api.patch<ConversacionComunidad>(
            `conversaciones/${id}/`,
            payload,
            {
                headers:
                    payload instanceof FormData
                        ? { "Content-Type": "multipart/form-data" }
                        : undefined,
            }
        );

        return response.data;
    },

    async cerrar(id: number): Promise<ConversacionComunidad> {
        const response = await api.post<ConversacionComunidad>(
            `conversaciones/${id}/cerrar/`
        );
        return response.data;
    },

    async reabrir(id: number): Promise<ConversacionComunidad> {
        const response = await api.post<ConversacionComunidad>(
            `conversaciones/${id}/reabrir/`
        );
        return response.data;
    },

    async mensajes(id: number): Promise<MensajeConversacion[]> {
        const response = await api.get<MensajeConversacion[]>(
            `conversaciones/${id}/mensajes/`
        );
        return response.data;
    },

    async delete(id: number): Promise<void> {
        await api.delete(`conversaciones/${id}/`);
    },
};