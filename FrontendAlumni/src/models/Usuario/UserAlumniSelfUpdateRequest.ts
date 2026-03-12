// src/models/Usuario/UserAlumniSelfUpdateRequest.ts

export interface UserAlumniSelfUpdateRequest {
    first_name?: string;
    last_name?: string;
    email?: string | null;
    password?: string;
}