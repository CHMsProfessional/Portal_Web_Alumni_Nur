// src/models/Usuario/UserAlumniRegisterRequest.ts

export interface UserAlumniRegisterRequest {
    username: string;
    first_name: string;
    last_name: string;
    email?: string | null;
    password: string;
    carrera: number | null;
}