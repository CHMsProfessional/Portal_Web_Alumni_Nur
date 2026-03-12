// src/models/Documento/Documento.ts

export interface Documento {
    id?: number;
    nombre?: string;
    tipo?: "TESIS" | "CERTIFICADO" | "INVESTIGACION" | "INFORME" | "OTRO" | null;
    tipo_display?: string | null;

    carrera?: number | null;
    carrera_id?: number | null;
    carrera_codigo?: string | null;
    carrera_nombre?: string | null;

    descripcion?: string | null;
    autor?: string | null;
    archivo_documento?: string | null;
    imagen_portada?: string | null;
    fecha_subida?: string | null;
}