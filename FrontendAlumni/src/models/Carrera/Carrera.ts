// src/models/Carrera/Carrera.ts

export interface Carrera {
    id: number;
    codigo: string;
    nombre: string;
    descripcion?: string | null;
    activo?: boolean;
}