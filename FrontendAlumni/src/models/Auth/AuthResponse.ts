// src/models/Auth/AuthResponse.ts

export interface AuthResponse {
    refresh: string;
    access: string;
    is_admin: boolean;
    carrera_id: number | null;
    carrera_codigo: string | null;
    carrera_nombre: string | null;
}