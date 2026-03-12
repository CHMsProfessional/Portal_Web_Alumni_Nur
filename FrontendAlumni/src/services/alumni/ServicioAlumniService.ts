import api from "../Interceptors/interceptorsApiContent";
import type { ServicioAlumni } from "../../models/ServicioAlumni/ServicioAlumni";
import type { ServicioAlumniRequest } from "../../models/ServicioAlumni/ServicioAlumniRequest";

type ServicioAlumniListResponse =
    | ServicioAlumni[]
    | { results?: ServicioAlumni[] | null }
    | null
    | undefined;

const BASE_URL = "servicioalumni/";

const ensureValidId = (id: number): number => {
    if (!Number.isFinite(id) || id <= 0) {
        throw new Error("Id de servicio inválido.");
    }

    return id;
};

const buildDetailUrl = (id: number): string => `${BASE_URL}${ensureValidId(id)}/`;

const normalizeListResponse = (data: ServicioAlumniListResponse): ServicioAlumni[] => {
    if (Array.isArray(data)) {
        return data;
    }

    if (Array.isArray(data?.results)) {
        return data.results;
    }

    return [];
};

export const ServicioAlumniService = {
    async list(): Promise<ServicioAlumni[]> {
        const response = await api.get<ServicioAlumniListResponse>(BASE_URL);
        return normalizeListResponse(response.data);
    },

    async listByTipo(
        tipo: NonNullable<ServicioAlumni["tipo"]>
    ): Promise<ServicioAlumni[]> {
        const servicios = await this.list();
        return servicios.filter((servicio) => servicio.tipo === tipo);
    },

    async get(id: number): Promise<ServicioAlumni> {
        const response = await api.get<ServicioAlumni>(buildDetailUrl(id));
        return response.data;
    },

    async create(payload: ServicioAlumniRequest): Promise<ServicioAlumni> {
        const response = await api.post<ServicioAlumni>(BASE_URL, payload);
        return response.data;
    },

    async update(
        id: number,
        payload: ServicioAlumniRequest | Partial<ServicioAlumniRequest>
    ): Promise<ServicioAlumni> {
        const response = await api.put<ServicioAlumni>(buildDetailUrl(id), payload);
        return response.data;
    },

    async patch(
        id: number,
        payload: Partial<ServicioAlumniRequest>
    ): Promise<ServicioAlumni> {
        const response = await api.patch<ServicioAlumni>(buildDetailUrl(id), payload);
        return response.data;
    },

    async delete(id: number): Promise<void> {
        await api.delete(buildDetailUrl(id));
    },
};