// src/models/Evento/EventoRequest.ts

import type { EventoEstado } from "./Evento";

export interface EventoRequest {
    id?: number;

    titulo: string;
    descripcion?: string | null;

    fecha_inicio: string;
    fecha_fin?: string | null;

    carreras?: number[];
    usuarios?: number[];

    requiere_registro: boolean;
    estado: EventoEstado;

    imagen_portada?: string | File | null;
}