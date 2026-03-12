import api from "../Interceptors/interceptorsApiAccess";
import type { Carrera } from "../../models/Carrera/Carrera";

const CARRERAS_CACHE_KEY = "carreras_catalog_cache";
const CARRERA_CACHE_TTL_MS = 30 * 60 * 1000;

type CarreraCachePayload = {
    timestamp: number;
    data: Carrera[];
};

const setCachedCarreras = (data: Carrera[]): void => {
    const payload: CarreraCachePayload = {
        timestamp: Date.now(),
        data,
    };

    localStorage.setItem(CARRERAS_CACHE_KEY, JSON.stringify(payload));
};

const getCachedCarreras = (): Carrera[] | null => {
    const raw = localStorage.getItem(CARRERAS_CACHE_KEY);
    if (!raw) return null;

    try {
        const parsed = JSON.parse(raw) as Partial<CarreraCachePayload>;

        if (!parsed?.timestamp || !Array.isArray(parsed.data)) {
            clearCachedCarreras();
            return null;
        }

        const isExpired = Date.now() - parsed.timestamp > CARRERA_CACHE_TTL_MS;

        if (isExpired) {
            clearCachedCarreras();
            return null;
        }

        return parsed.data;
    } catch (error) {
        console.warn("No se pudo leer el cache de carreras:", error);
        clearCachedCarreras();
        return null;
    }
};

const clearCachedCarreras = (): void => {
    localStorage.removeItem(CARRERAS_CACHE_KEY);
};

export const CarreraService = {
    getCachedCarreras,
    clearCachedCarreras,

    async list(forceRefresh = false): Promise<Carrera[]> {
        if (!forceRefresh) {
            const cached = getCachedCarreras();
            if (cached) {
                return cached;
            }
        }

        const response = await api.get<Carrera[]>("carrera/");
        const data = Array.isArray(response.data) ? response.data : [];

        setCachedCarreras(data);
        return data;
    },

    async get(id: number, forceRefresh = false): Promise<Carrera> {
        if (!forceRefresh) {
            const cached = getCachedCarreras();
            const cachedCarrera = cached?.find((carrera) => carrera.id === id);

            if (cachedCarrera) {
                return cachedCarrera;
            }
        }

        const response = await api.get<Carrera>(`carrera/${id}/`);
        const carrera = response.data;

        if (carrera?.id) {
            const cached = getCachedCarreras() ?? [];
            const merged = [
                ...cached.filter((item) => item.id !== carrera.id),
                carrera,
            ].sort((a, b) => a.id - b.id);

            setCachedCarreras(merged);
        }

        return carrera;
    },
};

export default CarreraService;