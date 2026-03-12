// src/models/Comunidad/MensajeConversacion.ts

export type EstadoMensajeConversacion = "ENVIADO" | "EDITADO" | "ELIMINADO";

export interface MensajeConversacion {
    id?: number;

    conversacion?: number;

    autor_id?: number | null;

    contenido?: string | null;

    archivo?: string | null;
    imagen?: string | null;

    estado?: EstadoMensajeConversacion | string | null;

    fecha_envio?: string | null;
    fecha_actualizacion?: string | null;

    editado?: boolean;
}