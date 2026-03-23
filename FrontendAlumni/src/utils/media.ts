export const joinUrl = (base: string, path: string): string => {
    const cleanBase = (base ?? "").trim();
    const cleanPath = (path ?? "").trim();

    if (!cleanBase) return cleanPath;
    if (!cleanPath) return cleanBase;

    const baseEnds = cleanBase.endsWith("/");
    const pathStarts = cleanPath.startsWith("/");

    if (baseEnds && pathStarts) return cleanBase + cleanPath.slice(1);
    if (!baseEnds && !pathStarts) return `${cleanBase}/${cleanPath}`;

    return cleanBase + cleanPath;
};

const isAbsoluteUrl = (value: string): boolean => {
    const raw = value.trim().toLowerCase();
    return raw.startsWith("http://") || raw.startsWith("https://");
};

export const resolveMediaSrc = (
    mediaBaseUrl: string,
    value?: string | null,
    fallbackSrc: string = ""
): string => {
    const raw = (value ?? "").toString().trim();

    if (!raw || raw === "null" || raw === "undefined") {
        return fallbackSrc;
    }

    if (raw.startsWith("//")) {
        return `https:${raw}`;
    }

    if (isAbsoluteUrl(raw) || raw.startsWith("data:") || raw.startsWith("blob:")) {
        return raw;
    }

    return joinUrl(mediaBaseUrl, raw);
};
