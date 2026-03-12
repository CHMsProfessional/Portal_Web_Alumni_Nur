// src/models/Usuario/UsuarioUpdateRequest.ts

export interface UsuarioUpdateRequest {
    id?: number;
    is_admin?: boolean;
    carrera?: number | null;
    first_name?: string;
    last_name?: string;
    email?: string | null;
    username?: string;
    password?: string;
}

/**
 * Alias temporal para no romper imports existentes.
 * Se puede eliminar cuando todo el frontend use UsuarioUpdateRequest.
 */
export type UsuarioRequest = UsuarioUpdateRequest;