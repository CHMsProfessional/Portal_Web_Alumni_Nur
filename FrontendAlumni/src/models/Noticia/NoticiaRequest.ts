// src/models/Noticia/NoticiaRequest.ts

import type { TipoNoticia } from "./TipoNoticia";
import type { DestinoNoticia } from "./DestinoNoticia";

export interface NoticiaRequest {
    titulo: string;
    contenido: string;

    resumen?: string;
    imagen?: string | File | null;

    tipo?: TipoNoticia;
    destino?: DestinoNoticia;

    comunidad?: number | null;
    evento?: number | null;

    boton_texto?: string | null;
    boton_url?: string | null;

    publicado?: boolean;
    destacado?: boolean;
    orden?: number;

    notify_registered?: boolean;

    fecha_publicacion?: string | null;
    fecha_inicio_publicacion?: string | null;
    fecha_fin_publicacion?: string | null;
}