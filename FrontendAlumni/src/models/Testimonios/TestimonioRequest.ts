// src/models/Testimonios/TestimonioRequest.ts

export interface TestimonioRequest {
    id?: number;
    titulo: string;
    contenido: string;
    autor?: string;
    imagen?: string | File | null;
}