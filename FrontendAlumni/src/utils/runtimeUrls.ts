const isBrowser = typeof window !== "undefined" && typeof window.location !== "undefined";

const isLocalHostname = (hostname: string): boolean => {
    const value = hostname.trim().toLowerCase();
    return value === "localhost" || value === "127.0.0.1" || value === "0.0.0.0";
};

/**
 * Resolves a URL coming from Vite env vars so that "localhost" works when the app
 * is opened from another machine (where localhost would point to the client).
 *
 * Example:
 * - env:  http://localhost:8900/api/
 * - page: http://192.168.17.2:8980
 * - out:  http://192.168.17.2:8900/api/
 */
export const resolveEnvUrl = (raw?: string | null): string => {
    const value = (raw ?? "").toString().trim();
    if (!value) return "";

    if (!isBrowser) return value;

    try {
        const parsed = new URL(value);

        if (isLocalHostname(parsed.hostname)) {
            parsed.hostname = window.location.hostname;
        }

        return parsed.toString();
    } catch {
        return value;
    }
};
