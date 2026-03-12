// src/models/Usuario/UserAlumniAdminCreateRequest.ts

export interface UserAlumniAdminCreateRequest {
    username: string;
    first_name: string;
    last_name: string;
    email?: string | null;
    password: string;
    carrera: number | null;
    is_admin: boolean;
}