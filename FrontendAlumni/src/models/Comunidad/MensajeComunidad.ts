// src/models/Comunidad/MensajeComunidad.ts

export interface MensajeComunidad {
    id?: number;
    comunidad?: number;
    autor_id?: number;
    contenido?: string;
    archivo?: string | null;
    imagen?: string | null;
    fecha_envio?: string;
}