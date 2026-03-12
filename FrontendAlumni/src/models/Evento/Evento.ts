// src/models/Evento/Evento.ts

import type { Carrera } from "../Carrera/Carrera";
import type { Usuario } from "../Usuario/Usuario";

export type EventoEstado = "ACTIVO" | "FINALIZADO" | "CANCELADO";
export type EventoAlcance = "GLOBAL" | "CARRERAS";

export interface EventoParticipante extends Usuario {}

export interface Evento {
    id?: number;

    titulo?: string;
    descripcion?: string | null;

    fecha_inicio?: string | null;
    fecha_fin?: string | null;

    carreras?: number[];
    usuarios?: number[];

    requiere_registro?: boolean;
    estado?: EventoEstado;
    estado_display?: string | null;

    imagen_portada?: string | null;
    fecha_creacion?: string | null;

    // Campos derivados nuevos desde backend
    inscritos_count?: number;
    esta_inscrito?: boolean;
    alcance?: EventoAlcance;
    carreras_detalle?: Carrera[];
    puede_gestionar?: boolean;
    es_visible_para_mi?: boolean;
}