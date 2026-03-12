// src/models/Usuario/UserAlumniAdminUpdateRequest.ts

export interface UserAlumniAdminUpdateRequest {
    first_name?: string;
    username?: string;
    last_name?: string;
    email?: string | null;
    password?: string;
    carrera?: number | null;
    is_admin?: boolean;
}