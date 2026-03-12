// src/services/alumni/MensajeConversacionService.ts

import api from "../Interceptors/interceptorsApiContent";
import type { MensajeConversacion } from "../../models/Comunidad/MensajeConversacion";
import type { MensajeConversacionRequest } from "../../models/Comunidad/MensajeConversacionRequest";

type PrimitiveValue = string | number | boolean | null | undefined;

export interface MensajeConversacionFilters {
    conversacion?: number;
    autor?: number;
    ordering?: string;
}

const buildQueryParams = (
    filters?: MensajeConversacionFilters
): URLSearchParams => {
    const params = new URLSearchParams();

    if (!filters) {
        return params;
    }

    Object.entries(filters).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "") {
            return;
        }

        params.append(key, String(value));
    });

    return params;
};

const appendPrimitive = (
    formData: FormData,
    key: string,
    value: PrimitiveValue
): void => {
    if (value === undefined || value === null) return;
    formData.append(key, String(value));
};

const toFormData = (payload: MensajeConversacionRequest): FormData => {
    const formData = new FormData();

    appendPrimitive(formData, "conversacion", payload.conversacion);

    if (payload.contenido !== undefined && payload.contenido !== null) {
        formData.append("contenido", payload.contenido);
    }

    if (payload.archivo) {
        formData.append("archivo", payload.archivo);
    }

    if (payload.imagen) {
        formData.append("imagen", payload.imagen);
    }

    return formData;
};

const validatePayload = (payload: Partial<MensajeConversacionRequest>): void => {
    const hasContenido =
        typeof payload.contenido === "string" && payload.contenido.trim().length > 0;
    const hasArchivo = payload.archivo instanceof File;
    const hasImagen = payload.imagen instanceof File;

    if (!hasContenido && !hasArchivo && !hasImagen) {
        throw new Error(
            "Debe enviar al menos contenido, archivo o imagen para registrar el mensaje."
        );
    }
};

export const MensajeConversacionService = {
    async list(
        filters?: MensajeConversacionFilters
    ): Promise<MensajeConversacion[]> {
        const params = buildQueryParams(filters);
        const query = params.toString();
        const endpoint = query
            ? `mensajes-conversacion/?${query}`
            : "mensajes-conversacion/";

        const response = await api.get<MensajeConversacion[]>(endpoint);
        return response.data;
    },

    async get(id: number): Promise<MensajeConversacion> {
        const response = await api.get<MensajeConversacion>(
            `mensajes-conversacion/${id}/`
        );
        return response.data;
    },

    async listByConversacion(
        conversacionId: number
    ): Promise<MensajeConversacion[]> {
        const response = await api.get<MensajeConversacion[]>(
            `conversaciones/${conversacionId}/mensajes/`
        );
        return response.data;
    },

    async create(
        data: MensajeConversacionRequest
    ): Promise<MensajeConversacion> {
        validatePayload(data);

        const payload = toFormData(data);

        const response = await api.post<MensajeConversacion>(
            "mensajes-conversacion/",
            payload,
            {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            }
        );

        return response.data;
    },

    async update(
        id: number,
        data: MensajeConversacionRequest
    ): Promise<MensajeConversacion> {
        validatePayload(data);

        const payload = toFormData(data);

        const response = await api.put<MensajeConversacion>(
            `mensajes-conversacion/${id}/`,
            payload,
            {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            }
        );

        return response.data;
    },

    async patch(
        id: number,
        data: Partial<MensajeConversacionRequest>
    ): Promise<MensajeConversacion> {
        validatePayload(data);

        const formData = new FormData();

        if (data.conversacion !== undefined && data.conversacion !== null) {
            formData.append("conversacion", String(data.conversacion));
        }

        if (data.contenido !== undefined && data.contenido !== null) {
            formData.append("contenido", data.contenido);
        }

        if (data.archivo) {
            formData.append("archivo", data.archivo);
        }

        if (data.imagen) {
            formData.append("imagen", data.imagen);
        }

        const response = await api.patch<MensajeConversacion>(
            `mensajes-conversacion/${id}/`,
            formData,
            {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            }
        );

        return response.data;
    },

    async delete(id: number): Promise<void> {
        await api.delete(`mensajes-conversacion/${id}/`);
    },
};