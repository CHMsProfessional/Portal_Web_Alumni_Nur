// src/models/Curso/Curso.ts

export interface Curso {
    id?: number;
    titulo?: string;
    descripcion?: string | null;
    responsable?: string;
    modalidad?: 'PRESENCIAL' | 'VIRTUAL' | 'MIXTO';
    modalidad_display?: string | null;
    estado?: 'ACTIVO' | 'INACTIVO' | 'FINALIZADO' | 'CANCELADO';
    estado_display?: string | null;
    fecha_inicio?: string;
    fecha_fin?: string | null;
    inscritos?: number[];
    imagen_portada?: string | null;
    fecha_creacion?: string;
}