// src/models/Comunidad/ComunidadRequest.ts

export interface ComunidadRequest {
    id?: number;
    nombre: string;
    descripcion?: string;
    slug?: string;
    activo?: boolean;

    carreras?: number[] | null;
    usuarios?: number[] | null;

    imagen_portada?: string | File | null;
}