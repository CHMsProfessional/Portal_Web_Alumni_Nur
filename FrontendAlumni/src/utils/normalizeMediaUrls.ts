const CONTENT_MEDIA_BASE_RAW = (import.meta.env.VITE_CONTENT_MEDIA_URL ?? "").replace(/\/+$/, "");

const shouldPreferHttps = (): boolean => {
    if (typeof window !== "undefined" && window.location?.protocol) {
        return window.location.protocol === "https:";
    }

    return false;
};

const resolveContentMediaBase = (): string => {
    if (!CONTENT_MEDIA_BASE_RAW) return "";

    if (shouldPreferHttps() && CONTENT_MEDIA_BASE_RAW.startsWith("http://")) {
        return `https://${CONTENT_MEDIA_BASE_RAW.slice("http://".length)}`;
    }

    return CONTENT_MEDIA_BASE_RAW;
};

export const normalizeMediaString = (value?: string | null): string => {
    if (!value) return "";

    let normalized = value.trim();
    if (!normalized) return "";

    if (normalized.startsWith("http://") && shouldPreferHttps()) {
        normalized = `https://${normalized.slice("http://".length)}`;
    } else if (normalized.startsWith("//")) {
        normalized = `${shouldPreferHttps() ? "https:" : "http:"}${normalized}`;
    }

    if (normalized.startsWith("/media/")) {
        const contentMediaBase = resolveContentMediaBase();
        if (contentMediaBase) {
            normalized = `${contentMediaBase}${normalized}`;
        }
    }

    return normalized;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
    if (typeof value !== "object" || value === null) return false;
    return Object.getPrototypeOf(value) === Object.prototype;
};

export const normalizeMediaUrlsDeep = <T>(value: T): T => {
    if (Array.isArray(value)) {
        return value.map((item) => normalizeMediaUrlsDeep(item)) as T;
    }

    if (typeof value === "string") {
        return normalizeMediaString(value) as T;
    }

    if (isPlainObject(value)) {
        const mapped = Object.entries(value).reduce<Record<string, unknown>>((acc, [key, item]) => {
            acc[key] = normalizeMediaUrlsDeep(item);
            return acc;
        }, {});

        return mapped as T;
    }

    return value;
};
