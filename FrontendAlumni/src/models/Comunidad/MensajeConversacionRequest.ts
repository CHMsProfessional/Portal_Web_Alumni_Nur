// src/models/Comunidad/MensajeConversacionRequest.ts

export interface MensajeConversacionRequest {
    conversacion: number;

    contenido?: string | null;

    archivo?: File | null;
    imagen?: File | null;
}