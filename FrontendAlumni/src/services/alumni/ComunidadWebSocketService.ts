import { MensajeComunidad } from "../../models/Comunidad/MensajeComunidad";
import { AuthService } from "./AuthService";

export interface WebSocketCallbacks {
    onMensaje: (mensaje: MensajeComunidad) => void;
    onEscribiendo?: (userId?: number) => void;
    onClose?: (event?: CloseEvent) => void;
    onError?: (event: Event) => void;
    onOpen?: () => void;
}

type IncomingSocketMessage =
    | {
          type: "mensaje";
          mensaje: MensajeComunidad;
      }
    | {
          type: "escribiendo";
          user_id?: number;
      }
    | {
          type: "error";
          detail?: string;
      }
    | Record<string, unknown>;

export class ComunidadWebSocketService {
    private socket: WebSocket | null = null;

    connect(comunidadId: number, callbacks: WebSocketCallbacks): void {
        const token = AuthService.getAccessToken();
        if (!token) {
            throw new Error("No existe access token para abrir el WebSocket.");
        }

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

        const url = `${baseUrl}/ws/comunidad/${comunidadId}/?token=${encodeURIComponent(token)}`;

        this.socket = new WebSocket(url);

        this.socket.onopen = () => {
            callbacks.onOpen?.();
        };

        this.socket.onmessage = (event: MessageEvent) => {
            try {
                const data = JSON.parse(event.data) as IncomingSocketMessage;

                if (data.type === "mensaje" && "mensaje" in data && data.mensaje) {
                    callbacks.onMensaje(data.mensaje as MensajeComunidad);
                    return;
                }

                if (data.type === "escribiendo") {
                    callbacks.onEscribiendo?.(
                        typeof data.user_id === "number" ? data.user_id : undefined
                    );
                    return;
                }

                if (data.type === "error") {
                    console.warn("WebSocket error lógico:", data.detail || "Error no especificado");
                }
            } catch (error) {
                console.error("Error procesando mensaje WebSocket:", error);
            }
        };

        this.socket.onclose = (event) => {
            callbacks.onClose?.(event);
        };

        this.socket.onerror = (event) => {
            callbacks.onError?.(event);
        };
    }

    enviarMensaje(mensaje: string): void {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            return;
        }

        this.socket.send(
            JSON.stringify({
                mensaje,
            })
        );
    }

    enviarEscribiendo(): void {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            return;
        }

        this.socket.send(
            JSON.stringify({
                type: "escribiendo",
            })
        );
    }

    isOpen(): boolean {
        return this.socket?.readyState === WebSocket.OPEN;
    }

    disconnect(): void {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
    }
}