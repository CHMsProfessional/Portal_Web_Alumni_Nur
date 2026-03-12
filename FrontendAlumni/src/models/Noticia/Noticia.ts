// src/models/Noticia/Noticia.ts

import type { TipoNoticia } from "./TipoNoticia";
import type { DestinoNoticia } from "./DestinoNoticia";

export interface Noticia {
    id?: number;

    titulo?: string;
    resumen?: string;
    contenido?: string;
    imagen?: string | null;

    tipo?: TipoNoticia;
    tipo_display?: string | null;

    destino?: DestinoNoticia;
    destino_display?: string | null;

    comunidad?: number | null;
    comunidad_nombre?: string | null;

    evento?: number | null;
    evento_titulo?: string | null;

    boton_texto?: string | null;
    boton_url?: string | null;

    publicado?: boolean;
    destacado?: boolean;
    orden?: number;

    fecha_publicacion?: string | null;
    fecha_actualizacion?: string | null;
    fecha_inicio_publicacion?: string | null;
    fecha_fin_publicacion?: string | null;

    creado_por_id?: number | null;
    actualizado_por_id?: number | null;
}