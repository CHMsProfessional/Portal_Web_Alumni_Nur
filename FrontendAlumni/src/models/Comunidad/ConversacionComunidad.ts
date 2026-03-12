// src/models/Comunidad/ConversacionComunidad.ts

export type EstadoConversacion = "ABIERTA" | "CERRADA";

export interface ConversacionComunidad {
    id?: number;

    comunidad: number;
    comunidad_nombre?: string;

    titulo: string;
    slug?: string;

    descripcion?: string;
    imagen?: string | null;

    creador_id?: number;

    estado?: EstadoConversacion;
    activa?: boolean;

    fecha_creacion?: string;
    fecha_actualizacion?: string | null;
    fecha_cierre?: string | null;

    cerrado_por_id?: number | null;
    ultimo_mensaje_at?: string | null;

    total_mensajes?: number;

    es_miembro_comunidad?: boolean;
    puede_escribir?: boolean;
    puede_cerrar?: boolean;
    puede_reabrir?: boolean;
}