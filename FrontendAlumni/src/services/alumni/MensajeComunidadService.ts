import api from "../Interceptors/interceptorsApiContent";
import { MensajeComunidad } from "../../models/Comunidad/MensajeComunidad";
import { MensajeComunidadRequest } from "../../models/Comunidad/MensajeComunidadRequest";

export const MensajeComunidadService = {
    async list(): Promise<MensajeComunidad[]> {
        const response = await api.get<MensajeComunidad[]>("mensajes/");
        return response.data;
    },

    async listByComunidad(comunidadId: number): Promise<MensajeComunidad[]> {
        const response = await api.get<MensajeComunidad[]>(`mensajes/?comunidad=${comunidadId}`);
        return response.data;
    },

    async get(id: number): Promise<MensajeComunidad> {
        const response = await api.get<MensajeComunidad>(`mensajes/${id}/`);
        return response.data;
    },

    async create(data: FormData | MensajeComunidadRequest): Promise<MensajeComunidad> {
        const response = await api.post<MensajeComunidad>("mensajes/", data, {
            headers: data instanceof FormData
                ? { "Content-Type": "multipart/form-data" }
                : undefined,
        });
        return response.data;
    },

    async update(id: number, data: FormData | Partial<MensajeComunidadRequest>): Promise<MensajeComunidad> {
        const response = await api.put<MensajeComunidad>(`mensajes/${id}/`, data, {
            headers: data instanceof FormData
                ? { "Content-Type": "multipart/form-data" }
                : undefined,
        });
        return response.data;
    },

    async delete(id: number): Promise<void> {
        await api.delete(`mensajes/${id}/`);
    },
};