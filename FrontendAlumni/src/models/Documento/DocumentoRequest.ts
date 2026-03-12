// src/models/Documento/DocumentoRequest.ts

export interface DocumentoRequest {
    id?: number;
    nombre: string;
    tipo: "TESIS" | "CERTIFICADO" | "INVESTIGACION" | "INFORME" | "OTRO";
    carrera?: number | null;
    descripcion?: string | null;
    autor: string;
    archivo_documento?: File | string | null;
    imagen_portada?: File | string | null;
}