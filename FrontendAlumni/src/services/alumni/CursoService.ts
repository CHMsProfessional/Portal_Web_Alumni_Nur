import api from "../Interceptors/interceptorsApiContent";
import type { Curso } from "../../models/Curso/Curso";
import type { CursoRequest } from "../../models/Curso/CursoRequest";

export interface CursoUsuariosDetalleResponse<TUser = unknown> {
    usuarios: TUser[];
}

export interface CursoActionResponse {
    message?: string;
    detail?: string;
    error?: string;
}

const assertPositiveInteger = (value: number, fieldName: string): void => {
    if (!Number.isInteger(value) || value <= 0) {
        throw new Error(`${fieldName} debe ser un entero positivo válido.`);
    }
};

export const CursoService = {
    async list(): Promise<Curso[]> {
        const response = await api.get<Curso[]>("curso/");
        return response.data;
    },

    async get(id: number): Promise<Curso> {
        assertPositiveInteger(id, "id");
        const response = await api.get<Curso>(`curso/${id}/`);
        return response.data;
    },

    async create(data: FormData | CursoRequest): Promise<Curso> {
        const response = await api.post<Curso>("curso/", data);
        return response.data;
    },

    async update(id: number, data: FormData | Partial<CursoRequest>): Promise<Curso> {
        assertPositiveInteger(id, "id");
        const response = await api.put<Curso>(`curso/${id}/`, data);
        return response.data;
    },

    async delete(id: number): Promise<void> {
        assertPositiveInteger(id, "id");
        await api.delete(`curso/${id}/`);
    },

    async getUsuariosDetalle<TUser = unknown>(
        cursoId: number
    ): Promise<CursoUsuariosDetalleResponse<TUser>> {
        assertPositiveInteger(cursoId, "cursoId");
        const response = await api.get<CursoUsuariosDetalleResponse<TUser>>(
            `curso/${cursoId}/usuarios_detalle/`
        );
        return response.data;
    },

    async inscribirUsuario(
        cursoId: number,
        userId: number
    ): Promise<CursoActionResponse> {
        assertPositiveInteger(cursoId, "cursoId");
        assertPositiveInteger(userId, "userId");

        const response = await api.post<CursoActionResponse>(
            `curso/${cursoId}/inscribir_usuario/`,
            { user_id: userId }
        );
        return response.data;
    },

    async desinscribirUsuario(
        cursoId: number,
        userId: number
    ): Promise<CursoActionResponse> {
        assertPositiveInteger(cursoId, "cursoId");
        assertPositiveInteger(userId, "userId");

        const response = await api.post<CursoActionResponse>(
            `curso/${cursoId}/desinscribir_usuario/`,
            { user_id: userId }
        );
        return response.data;
    },

    isUserInscrito(curso: Curso | null | undefined, userId: number): boolean {
        if (!curso) return false;
        if (!Number.isInteger(userId) || userId <= 0) return false;

        const inscritos = curso.inscritos ?? [];
        return inscritos.includes(userId);
    },
};