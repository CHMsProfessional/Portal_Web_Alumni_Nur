// src/services/alumni/NoticiaService.ts

import api from "../Interceptors/interceptorsApiContent";
import type { Noticia } from "../../models/Noticia/Noticia";
import type { NoticiaRequest } from "../../models/Noticia/NoticiaRequest";
import type { TipoNoticia } from "../../models/Noticia/TipoNoticia";
import type { DestinoNoticia } from "../../models/Noticia/DestinoNoticia";

type PrimitiveValue = string | number | boolean | null | undefined;

export interface NoticiaFilters {
    destino?: DestinoNoticia;
    comunidad?: number;
    publicado?: boolean;
    destacado?: boolean;
    vigente?: boolean;
    tipo?: TipoNoticia;
    [key: string]: PrimitiveValue;
}

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

const toFormData = (payload: Partial<NoticiaRequest>): FormData => {
    const formData = new FormData();

    appendPrimitive(formData, "titulo", payload.titulo);
    appendPrimitive(formData, "contenido", payload.contenido);
    appendPrimitive(formData, "resumen", payload.resumen);
    appendPrimitive(formData, "tipo", payload.tipo);
    appendPrimitive(formData, "destino", payload.destino);
    appendPrimitive(formData, "comunidad", payload.comunidad);
    appendPrimitive(formData, "evento", payload.evento);
    appendPrimitive(formData, "boton_texto", payload.boton_texto);
    appendPrimitive(formData, "boton_url", payload.boton_url);
    appendPrimitive(formData, "publicado", payload.publicado);
    appendPrimitive(formData, "destacado", payload.destacado);
    appendPrimitive(formData, "orden", payload.orden);
    appendPrimitive(formData, "notify_registered", payload.notify_registered);
    appendPrimitive(formData, "fecha_publicacion", payload.fecha_publicacion);
    appendPrimitive(
        formData,
        "fecha_inicio_publicacion",
        payload.fecha_inicio_publicacion
    );
    appendPrimitive(
        formData,
        "fecha_fin_publicacion",
        payload.fecha_fin_publicacion
    );

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
    payload: NoticiaRequest | Partial<NoticiaRequest>
): boolean => {
    return hasFileValue(payload.imagen) || payload.imagen === null;
};

export const NoticiaService = {
    async list(filters?: NoticiaFilters): Promise<Noticia[]> {
        const params = buildQueryParams(filters);
        const query = params.toString();
        const endpoint = query ? `noticia/?${query}` : "noticia/";

        const response = await api.get<Noticia[]>(endpoint);
        return response.data;
    },

    async get(id: number): Promise<Noticia> {
        const response = await api.get<Noticia>(`noticia/${id}/`);
        return response.data;
    },

    async listHome(
        filters?: Omit<NoticiaFilters, "destino" | "comunidad">
    ): Promise<Noticia[]> {
        return this.list({
            ...filters,
            destino: "HOME",
        });
    },

    async listComunidad(
        comunidadId: number,
        filters?: Omit<NoticiaFilters, "destino" | "comunidad">
    ): Promise<Noticia[]> {
        return this.list({
            ...filters,
            destino: "COMUNIDAD",
            comunidad: comunidadId,
        });
    },

    async listPublicadas(
        filters?: Omit<NoticiaFilters, "publicado">
    ): Promise<Noticia[]> {
        return this.list({
            ...filters,
            publicado: true,
        });
    },

    async listDestacadas(
        filters?: Omit<NoticiaFilters, "destacado">
    ): Promise<Noticia[]> {
        return this.list({
            ...filters,
            destacado: true,
        });
    },

    async listVigentes(
        filters?: Omit<NoticiaFilters, "vigente">
    ): Promise<Noticia[]> {
        return this.list({
            ...filters,
            vigente: true,
        });
    },

    async create(data: NoticiaRequest): Promise<Noticia> {
        const payload = shouldUseFormData(data) ? toFormData(data) : data;

        const response = await api.post<Noticia>("noticia/", payload, {
            headers:
                payload instanceof FormData
                    ? { "Content-Type": "multipart/form-data" }
                    : undefined,
        });

        return response.data;
    },

    async update(
        id: number,
        data: Partial<NoticiaRequest>
    ): Promise<Noticia> {
        const payload = shouldUseFormData(data) ? toFormData(data) : data;

        const response = await api.put<Noticia>(`noticia/${id}/`, payload, {
            headers:
                payload instanceof FormData
                    ? { "Content-Type": "multipart/form-data" }
                    : undefined,
        });

        return response.data;
    },

    async patch(
        id: number,
        data: Partial<NoticiaRequest>
    ): Promise<Noticia> {
        const payload = shouldUseFormData(data) ? toFormData(data) : data;

        const response = await api.patch<Noticia>(`noticia/${id}/`, payload, {
            headers:
                payload instanceof FormData
                    ? { "Content-Type": "multipart/form-data" }
                    : undefined,
        });

        return response.data;
    },

    async delete(id: number): Promise<void> {
        await api.delete(`noticia/${id}/`);
    },
};

export default NoticiaService;