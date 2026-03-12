// src/models/Comunidad/Comunidad.ts

export interface Comunidad {
    id?: number;

    nombre?: string;
    descripcion?: string;

    slug?: string;
    activo?: boolean;

    carreras?: number[];
    usuarios?: number[];

    imagen_portada?: string | null;

    fecha_creacion?: string | null;
    fecha_actualizacion?: string | null;

    total_miembros?: number;
    total_conversaciones?: number;
    total_conversaciones_abiertas?: number;
    total_noticias_publicadas?: number;

    pertenece_usuario_actual?: boolean;
    puede_crear_conversacion?: boolean;
    puede_publicar_noticia?: boolean;
}