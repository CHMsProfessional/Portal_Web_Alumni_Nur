// src/models/ServicioAlumni/ServicioAlumni.ts

export interface ServicioAlumni {
    id?: number;
    nombre?: string;
    tipo?: 'educacion' | 'biblioteca' | 'deporte' | 'otros';
    descripcion?: string;
    icono?: string | null;
    link?: string | null;
    fecha_creacion?: string;
}