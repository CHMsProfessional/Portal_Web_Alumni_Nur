// src/models/Usuario/Usuario.ts

export interface Usuario {
    id?: number;
    is_admin?: boolean;
    carrera?: number | null;
    carrera_id?: number | null;
    carrera_codigo?: string | null;
    carrera_nombre?: string | null;
    user?: User | null;
}

export interface User {
    id?: number;
    username?: string;
    first_name?: string;
    last_name?: string;
    email?: string | null;
}