// src/models/Usuario/UsuarioPerfil.ts

import { Usuario } from "./Usuario.ts";
import { Comunidad } from "../Comunidad/Comunidad.ts";
import { Curso } from "../Curso/Curso.ts";
import { Evento } from "../Evento/Evento.ts";

export interface UsuarioPerfil {
    usuario: Usuario | null;
    comunidades: Comunidad[];
    cursos: Curso[];
    eventos: Evento[];
}