// src/models/Testimonios/Testimonio.ts

export interface Testimonio {
    id?: number;
    titulo?: string;
    contenido?: string;
    autor?: string | null;
    fecha?: string;
    imagen?: string | null;
}