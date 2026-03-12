// src/models/ServicioAlumni/ServicioAlumniRequest.ts

export interface ServicioAlumniRequest {
    id?: number;
    nombre: string;
    tipo: 'educacion' | 'biblioteca' | 'deporte' | 'otros';
    descripcion: string;
    icono?: string | null;
    link?: string | null;
}