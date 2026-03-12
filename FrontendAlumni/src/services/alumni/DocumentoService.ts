import api from "../Interceptors/interceptorsApiContent";
import type { Documento } from "../../models/Documento/Documento";
import type { DocumentoRequest } from "../../models/Documento/DocumentoRequest";

export interface DocumentoListFilters {
    carrera?: number | null;
    tipo?: DocumentoRequest["tipo"] | null;
}

const buildQueryParams = (filters?: DocumentoListFilters): URLSearchParams | undefined => {
    if (!filters) return undefined;

    const params = new URLSearchParams();

    if (
        typeof filters.carrera === "number" &&
        Number.isInteger(filters.carrera) &&
        filters.carrera > 0
    ) {
        params.set("carrera", String(filters.carrera));
    }

    if (filters.tipo) {
        params.set("tipo", filters.tipo);
    }

    return params.toString() ? params : undefined;
};

export const DocumentoService = {
    async list(filters?: DocumentoListFilters): Promise<Documento[]> {
        const response = await api.get<Documento[]>("documento/", {
            params: buildQueryParams(filters),
        });
        return response.data;
    },

    async get(id: number): Promise<Documento> {
        const response = await api.get<Documento>(`documento/${id}/`);
        return response.data;
    },

    async create(data: FormData | DocumentoRequest): Promise<Documento> {
        const response = await api.post<Documento>("documento/", data, {
            headers: data instanceof FormData
                ? { "Content-Type": "multipart/form-data" }
                : undefined,
        });
        return response.data;
    },

    async update(id: number, data: FormData | Partial<DocumentoRequest>): Promise<Documento> {
        const response = await api.put<Documento>(`documento/${id}/`, data, {
            headers: data instanceof FormData
                ? { "Content-Type": "multipart/form-data" }
                : undefined,
        });
        return response.data;
    },

    async delete(id: number): Promise<void> {
        await api.delete(`documento/${id}/`);
    },
};