// src/routes/CONSTANTS.ts

export const Routes = {
    HOME: "/",

    AUTH: {
        LOGIN: "/login",
    },

    USER: {
        LIST: "/usuarios",
        CREATE: "/usuarios/crear",
        EDIT: "/perfil/editar",
        PROFILE: () => "/perfil",
    },

    EVENTOS: "/eventos",

    NOTICIAS: "/noticias",
    NOTICIAS_DETALLE: "/noticias/:id",
    NOTICIAS_DETALLE_PARAM: (id?: number) => `/noticias/${id}`,

    TESTIMONIOS: "/testimonios",
    SERVICIOS: "/servicios",
    REPOSITORIO: "/repositorio",
    HISTORIA: "/historia",

    COMUNIDAD: {
        HOME: "/comunidad",

        // Legacy
        CHAT: "/comunidad/chat/:id",
        CHAT_PARAM: (id?: number) => `/comunidad/chat/${id}`,

        // Nuevo dominio hub / conversaciones
        DETAIL: "/comunidad/:id",
        DETAIL_PARAM: (id?: number) => `/comunidad/${id}`,

        HUB: "/comunidad/:id/hub",
        HUB_PARAM: (id?: number) => `/comunidad/${id}/hub`,

        CONVERSACIONES: "/comunidad/:id/conversaciones",
        CONVERSACIONES_PARAM: (id?: number) =>
            `/comunidad/${id}/conversaciones`,

        CONVERSACION: "/comunidad/:comunidadId/conversaciones/:conversacionId",
        CONVERSACION_PARAM: (
            comunidadId?: number,
            conversacionId?: number
        ) => `/comunidad/${comunidadId}/conversaciones/${conversacionId}`,
    },

    CURSOS: {
        ME: "/cursos",
        LIST: "/cursos/lista",
        DETAIL: "/cursos/detalle/:id",
        DETAIL_PARAM: (id?: number) => `/cursos/detalle/${id}`,
    },

    ADMIN: {
        USUARIOS: {
            LIST: "/admin/usuarios",
            CREATE: "/admin/usuarios/crear",
            EDIT: "/admin/usuarios/editar/:id",
            EDIT_PARAM: (id?: number) => `/admin/usuarios/editar/${id}`,
        },

        EVENTOS: {
            LIST: "/admin/eventos",
            CREATE: "/admin/eventos/crear",
            EDIT: "/admin/eventos/editar/:id",
            EDIT_PARAM: (id?: number) => `/admin/eventos/editar/${id}`,
        },

        COMUNIDADES: {
            LIST: "/admin/comunidades",
            CREATE: "/admin/comunidades/crear",
            EDIT: "/admin/comunidades/editar/:id",
            EDIT_PARAM: (id?: number) => `/admin/comunidades/editar/${id}`,

            DETAIL: "/admin/comunidades/:id",
            DETAIL_PARAM: (id?: number) => `/admin/comunidades/${id}`,

            CONVERSACIONES: "/admin/comunidades/:id/conversaciones",
            CONVERSACIONES_PARAM: (id?: number) =>
                `/admin/comunidades/${id}/conversaciones`,

            CONVERSACION_CREATE: "/admin/comunidades/:id/conversaciones/crear",
            CONVERSACION_CREATE_PARAM: (id?: number) =>
                `/admin/comunidades/${id}/conversaciones/crear`,

            CONVERSACION_EDIT:
                "/admin/comunidades/:comunidadId/conversaciones/editar/:conversacionId",
            CONVERSACION_EDIT_PARAM: (
                comunidadId?: number,
                conversacionId?: number
            ) =>
                `/admin/comunidades/${comunidadId}/conversaciones/editar/${conversacionId}`,
        },

        DOCUMENTOS: {
            LIST: "/admin/repositorio",
            CREATE: "/admin/repositorio/crear",
            EDIT: "/admin/repositorio/editar/:id",
            EDIT_PARAM: (id?: number) => `/admin/repositorio/editar/${id}`,
        },

        TESTIMONIOS: {
            LIST: "/admin/testimonios",
            CREATE: "/admin/testimonios/crear",
            EDIT: "/admin/testimonios/editar/:id",
            EDIT_PARAM: (id?: number) => `/admin/testimonios/editar/${id}`,
        },

        NOTICIAS: {
            LIST: "/admin/noticias",
            CREATE: "/admin/noticias/crear",
            EDIT: "/admin/noticias/editar/:id",
            EDIT_PARAM: (id?: number) => `/admin/noticias/editar/${id}`,

            COMUNIDAD_LIST: "/admin/comunidades/:id/noticias",
            COMUNIDAD_LIST_PARAM: (id?: number) =>
                `/admin/comunidades/${id}/noticias`,

            COMUNIDAD_CREATE: "/admin/comunidades/:id/noticias/crear",
            COMUNIDAD_CREATE_PARAM: (id?: number) =>
                `/admin/comunidades/${id}/noticias/crear`,
        },

        SERVICIOS: {
            LIST: "/admin/servicios",
            CREATE: "/admin/servicios/crear",
            EDIT: "/admin/servicios/editar/:id",
            EDIT_PARAM: (id?: number) => `/admin/servicios/editar/${id}`,
        },

        CURSOS: {
            LIST: "/admin/cursos",
            CREATE: "/admin/cursos/crear",
            EDIT: "/admin/cursos/editar/:id",
            EDIT_PARAM: (id?: number) => `/admin/cursos/editar/${id}`,
        },
    },
} as const;