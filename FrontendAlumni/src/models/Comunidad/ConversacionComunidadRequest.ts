// src/models/Comunidad/ConversacionComunidadRequest.ts

import type { EstadoConversacion } from "./ConversacionComunidad";

export interface ConversacionComunidadRequest {
    comunidad: number;

    titulo: string;
    descripcion?: string;

    imagen?: string | File | null;

    estado?: EstadoConversacion;
    activa?: boolean;
}