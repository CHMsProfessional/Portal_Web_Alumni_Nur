import { MensajeConversacion } from "../../models/Comunidad/MensajeConversacion";
import AuthService from "./AuthService";

export type ConversationSocketCloseCode = 4001 | 4003 | 4004 | 4008;

export interface ConversationStatusEvent {
    estado?: string;
    detail?: string;
}

export interface ConversationWebSocketCallbacks {
    onMensaje: (mensaje: MensajeConversacion) => void;
    onEscribiendo?: (userId?: number) => void;
    onEstadoConversacion?: (event: ConversationStatusEvent) => void;
    onClose?: (event?: CloseEvent) => void;
    onError?: (event: Event) => void;
    onOpen?: () => void;
    onAuthExpired?: () => void;
    onForbidden?: () => void;
    onNotFound?: () => void;
    onConversationUnavailable?: () => void;
}

type IncomingSocketMessage =
    | {
          type: "mensaje";
          mensaje: MensajeConversacion;
      }
    | {
          type: "escribiendo";
          user_id?: number;
      }
    | {
          type: "estado_conversacion";
          estado?: string;
          detail?: string;
      }
    | {
          type: "error";
          detail?: string;
          code?: string | number;
      }
    | Record<string, unknown>;

type OutgoingSocketMessage =
    | {
          type: "mensaje";
          mensaje: string;
      }
    | {
          type: "escribiendo";
      }
    | {
          type: "ping";
      };

export default class ConversationWebSocketService {
    private socket: WebSocket | null = null;
    private currentConversationId: number | null = null;
    private callbacks: ConversationWebSocketCallbacks | null = null;
    private reconnectAfterRefreshAttempted = false;
    private manuallyClosed = false;

    private buildUrl(conversacionId: number, token: string): string {
        const configuredBaseUrl = import.meta.env.VITE_WS_CONTENT_URL;
        const fallbackBaseUrl = import.meta.env.VITE_API_CONTENT_URL
            ? import.meta.env.VITE_API_CONTENT_URL
                  .replace(/\/api\/?$/, "")
                  .replace(/^http/, "ws")
            : "";

        const baseUrl = (configuredBaseUrl || fallbackBaseUrl).replace(/\/+$/, "");

        if (!baseUrl) {
            throw new Error("VITE_WS_CONTENT_URL o VITE_API_CONTENT_URL debe estar configurado.");
        }

        return `${baseUrl}/ws/conversacion/${conversacionId}/?token=${encodeURIComponent(
            token
        )}`;
    }

    private getAccessToken(): string | null {
        if (typeof AuthService.getAccessToken === "function") {
            return AuthService.getAccessToken();
        }

        

        return null;
    }

    private isValidConversationId(value: number): boolean {
        return Number.isFinite(value) && value > 0;
    }

    private safeParse(data: string): IncomingSocketMessage | null {
        try {
            return JSON.parse(data) as IncomingSocketMessage;
        } catch (error) {
            console.error(
                "No se pudo parsear el mensaje entrante del WebSocket de conversación.",
                error
            );
            return null;
        }
    }

    private notifyConversationError(detail?: string, code?: string | number): void {
        const normalizedCode = String(code ?? "").trim();

        if (normalizedCode === "4001" || normalizedCode === "4008") {
            void this.tryReconnectAfterRefresh();
            return;
        }

        if (normalizedCode === "4003") {
            this.callbacks?.onForbidden?.();
            return;
        }

        if (normalizedCode === "4004") {
            this.callbacks?.onNotFound?.();
            return;
        }

        if (detail?.toLowerCase().includes("cerrada")) {
            this.callbacks?.onConversationUnavailable?.();
            return;
        }

        this.callbacks?.onError?.(new Event("error"));
    }

    private handleIncomingMessage(event: MessageEvent<string>): void {
        const payload = this.safeParse(event.data);

        if (!payload || typeof payload !== "object" || !("type" in payload)) {
            return;
        }

        switch (payload.type) {
            case "mensaje":
                if ("mensaje" in payload && payload.mensaje) {
                    this.callbacks?.onMensaje(payload.mensaje);
                }
                break;

            case "escribiendo":
                this.callbacks?.onEscribiendo?.(
                    typeof payload.user_id === "number" ? payload.user_id : undefined
                );
                break;

            case "estado_conversacion":
                this.callbacks?.onEstadoConversacion?.({
                    estado:
                        typeof payload.estado === "string" ? payload.estado : undefined,
                    detail:
                        typeof payload.detail === "string" ? payload.detail : undefined,
                });

                if (
                    typeof payload.estado === "string" &&
                    payload.estado.toUpperCase() === "CERRADA"
                ) {
                    this.callbacks?.onConversationUnavailable?.();
                }
                break;

            case "error":
                this.notifyConversationError(
                    typeof payload.detail === "string" ? payload.detail : undefined,
                    typeof payload.code === "string" || typeof payload.code === "number"
                        ? payload.code
                        : undefined
                );
                break;

            default:
                break;
        }
    }

    private async tryReconnectAfterRefresh(): Promise<void> {
        if (
            this.reconnectAfterRefreshAttempted ||
            this.currentConversationId === null ||
            !this.callbacks
        ) {
            return;
        }

        this.reconnectAfterRefreshAttempted = true;

        try {
            const newAccessToken = await AuthService.refreshSession();

            if (!newAccessToken) {
                this.callbacks.onAuthExpired?.();
                return;
            }

            this.openSocket(this.currentConversationId, newAccessToken, this.callbacks);
        } catch (error) {
            console.error(
                "No se pudo refrescar la sesión para reconectar el WebSocket de conversación.",
                error
            );
            this.callbacks.onAuthExpired?.();
        }
    }

    private handleClose(event: CloseEvent): void {
        this.callbacks?.onClose?.(event);

        if (this.manuallyClosed) {
            return;
        }

        switch (event.code as ConversationSocketCloseCode) {
            case 4001:
            case 4008:
                void this.tryReconnectAfterRefresh();
                break;

            case 4003:
                this.callbacks?.onForbidden?.();
                break;

            case 4004:
                this.callbacks?.onNotFound?.();
                break;

            default:
                break;
        }
    }

    private openSocket(
        conversacionId: number,
        token: string,
        callbacks: ConversationWebSocketCallbacks
    ): void {
        const url = this.buildUrl(conversacionId, token);

        this.socket = new WebSocket(url);

        this.socket.onopen = () => {
            this.reconnectAfterRefreshAttempted = false;
            callbacks.onOpen?.();
        };

        this.socket.onmessage = (event) => {
            this.handleIncomingMessage(event);
        };

        this.socket.onerror = (event) => {
            callbacks.onError?.(event);
        };

        this.socket.onclose = (event) => {
            this.handleClose(event);
        };
    }

    connect(
        conversacionId: number,
        callbacks: ConversationWebSocketCallbacks
    ): void {
        if (!this.isValidConversationId(conversacionId)) {
            callbacks.onError?.(new Event("error"));
            return;
        }

        const token = this.getAccessToken();

        if (!token) {
            callbacks.onAuthExpired?.();
            return;
        }

        this.disconnect();

        this.manuallyClosed = false;
        this.currentConversationId = conversacionId;
        this.callbacks = callbacks;
        this.reconnectAfterRefreshAttempted = false;

        this.openSocket(conversacionId, token, callbacks);
    }

    disconnect(): void {
        this.manuallyClosed = true;

        if (this.socket) {
            this.socket.onopen = null;
            this.socket.onmessage = null;
            this.socket.onerror = null;
            this.socket.onclose = null;

            if (
                this.socket.readyState === WebSocket.OPEN ||
                this.socket.readyState === WebSocket.CONNECTING
            ) {
                this.socket.close();
            }
        }

        this.socket = null;
    }

    isConnected(): boolean {
        return this.socket?.readyState === WebSocket.OPEN;
    }

    getConversationId(): number | null {
        return this.currentConversationId;
    }

    getSocket(): WebSocket | null {
        return this.socket;
    }

    send(payload: OutgoingSocketMessage): void {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            throw new Error("El WebSocket de conversación no está conectado.");
        }

        this.socket.send(JSON.stringify(payload));
    }

    sendMessage(contenido: string): void {
        const normalized = contenido.trim();

        if (!normalized) {
            throw new Error("No se puede enviar un mensaje vacío.");
        }

        this.send({
            type: "mensaje",
            mensaje: normalized,
        });
    }

    sendTyping(): void {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            return;
        }

        this.send({
            type: "escribiendo",
        });
    }

    sendPing(): void {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            return;
        }

        this.send({
            type: "ping",
        });
    }
}