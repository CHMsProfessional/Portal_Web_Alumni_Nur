import { toast } from "react-toastify";

const DEFAULT_ERROR = "Ocurrio un error inesperado. Intentalo nuevamente.";

function normalizeValue(value: unknown): string {
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    if (Array.isArray(value)) return value.map(normalizeValue).join(" | ");
    if (value && typeof value === "object") {
        try {
            return JSON.stringify(value);
        } catch {
            return "";
        }
    }
    return "";
}

export function extractDetailedError(error: unknown, fallback = DEFAULT_ERROR): string {
    const err = error as {
        response?: { data?: unknown; status?: number };
        message?: string;
    };

    const data = err?.response?.data;

    if (typeof data === "string" && data.trim()) return data.trim();

    if (data && typeof data === "object") {
        const detailLike = data as Record<string, unknown>;

        const firstDirect =
            normalizeValue(detailLike.detail) ||
            normalizeValue(detailLike.error) ||
            normalizeValue(detailLike.message) ||
            normalizeValue(detailLike.non_field_errors);

        if (firstDirect.trim()) return firstDirect;

        const lines: string[] = [];
        Object.entries(detailLike).forEach(([field, value]) => {
            const normalized = normalizeValue(value).trim();
            if (!normalized) return;
            lines.push(`${field}: ${normalized}`);
        });

        if (lines.length) return lines.join("\n");
    }

    if (err?.message?.trim()) return err.message.trim();

    return fallback;
}

export function notifyError(message: string): void {
    toast.error(message, {
        position: "top-right",
        autoClose: 6500,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
    });
}

export function notifySuccess(message: string): void {
    toast.success(message, {
        position: "top-right",
        autoClose: 2800,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
    });
}

export function notifyLoginError(): void {
    notifyError("No se pudo iniciar sesion. Verifica tus credenciales e intentalo nuevamente.");
}

export function notifyAdminError(action: string, error: unknown): string {
    const detail = extractDetailedError(
        error,
        `No se pudo completar la accion: ${action}.`
    );

    notifyError(`${action}\n${detail}`);
    return detail;
}
