// src/models/Curso/CursoRequest.ts

export interface CursoRequest {
    id?: number;
    titulo: string;
    descripcion?: string | null;
    responsable: string;
    modalidad: 'PRESENCIAL' | 'VIRTUAL' | 'MIXTO';
    estado: 'ACTIVO' | 'INACTIVO' | 'FINALIZADO' | 'CANCELADO';
    fecha_inicio: string;
    fecha_fin?: string | null;
    inscritos?: number[] | null;
    imagen_portada?: string | File | null;
}