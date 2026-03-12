// src/models/Comunidad/MensajeComunidadRequest.ts

export interface MensajeComunidadRequest {
    comunidad: number;
    autor_id?: number;
    contenido?: string;
    archivo?: File | null;
    imagen?: File | null;
}