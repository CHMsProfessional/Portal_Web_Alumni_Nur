/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  CSSProperties,
  MouseEvent as ReactMouseEvent,
  TouchEvent as ReactTouchEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { FaTimes, FaMicrosoft, FaCube, FaSyncAlt, FaRobot } from 'react-icons/fa';
import './ChatBotFloating.css';

type AgentMode = 'agent1' | 'agent2';

type AgentConfig = {
  agentUrl1: string;
  agentUrl2?: string;
  agent2CropTopPx: number;

  useOverlay: boolean;
  overlayColor: string;

  keyboardShortcut: {
    enabled: boolean;
    key: string;
    modifiers: Array<'Alt' | 'Shift' | 'Ctrl' | 'Meta'>;
  };

  enableDraggable: boolean;

  floatingButtonTitle: string;
  modalTitle: string;
  ariaLabels: {
    openButton: string;
    closeButton: string;
    modal: string;
    reloadButton: string;
  };
};

const DEFAULT_CONFIG: AgentConfig = {
  agentUrl1: '',
  agentUrl2: 'https://ca-api-qns6fah5szisq.mangoisland-6858f4fe.eastus2.azurecontainerapps.io/',
  agent2CropTopPx: 64,

  useOverlay: false,
  overlayColor: 'rgba(15, 23, 42, 0.38)',

  keyboardShortcut: { enabled: true, key: 'C', modifiers: ['Alt', 'Shift'] },

  enableDraggable: true,

  floatingButtonTitle: 'Asistente Alumni NUR',
  modalTitle: 'Asistente Alumni NUR',
  ariaLabels: {
    openButton: 'Abrir asistente virtual Alumni NUR',
    closeButton: 'Cerrar asistente virtual',
    modal: 'Asistente virtual Alumni NUR',
    reloadButton: 'Recargar conversación',
  },
};

function addCacheBust(url: string) {
  if (!url) return '';
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}ts=${Date.now()}`;
}

function detectPortalTheme(): 'dark' | 'light' {
  if (typeof document === 'undefined' || typeof window === 'undefined') return 'light';

  const root = document.documentElement;
  const body = document.body;

  const dataTheme =
    root.getAttribute('data-theme') ||
    body?.getAttribute('data-theme') ||
    root.getAttribute('theme') ||
    body?.getAttribute('theme');

  if (dataTheme?.toLowerCase() === 'dark') return 'dark';
  if (dataTheme?.toLowerCase() === 'light') return 'light';

  const classSignalsDark =
    root.classList.contains('dark') ||
    root.classList.contains('theme-dark') ||
    body?.classList.contains('dark') ||
    body?.classList.contains('theme-dark');

  if (classSignalsDark) return 'dark';

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function withThemeParam(rawUrl: string, theme: 'dark' | 'light'): string {
  if (!rawUrl) return rawUrl;

  try {
    const parsed = new URL(rawUrl, window.location.origin);
    parsed.searchParams.set('theme', theme);
    return parsed.toString();
  } catch {
    const sep = rawUrl.includes('?') ? '&' : '?';
    return `${rawUrl}${sep}theme=${theme}`;
  }
}

// ─── Session persistence (localStorage) ─────────────────────────────────────
const LS_PREFIX = 'chatbot_session_src::';

function sessionKey(baseUrl: string) {
  return LS_PREFIX + baseUrl;
}

/** Returns an existing session src or creates + saves a new one. */
function getOrCreateSession(baseUrl: string): string {
  try {
    const stored = localStorage.getItem(sessionKey(baseUrl));
    if (stored) return stored;
  } catch { /* localStorage unavailable */ }
  const src = addCacheBust(baseUrl);
  saveSession(baseUrl, src);
  return src;
}

function saveSession(baseUrl: string, src: string): void {
  try { localStorage.setItem(sessionKey(baseUrl), src); } catch { /* ignore */ }
}

function clearSession(baseUrl: string): void {
  try { localStorage.removeItem(sessionKey(baseUrl)); } catch { /* ignore */ }
}
// ─────────────────────────────────────────────────────────────────────────────

function isMobile() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 640px)').matches;
}

const ChatBotFloating = () => {
  const config: AgentConfig = useMemo(() => {
    const w = typeof window !== 'undefined' ? (window as any) : null;
    return (w?.ALUMNI_CHAT_CONFIG
      ? { ...DEFAULT_CONFIG, ...w.ALUMNI_CHAT_CONFIG }
      : DEFAULT_CONFIG) as AgentConfig;
  }, []);

  const hasAgent1 = Boolean(config.agentUrl1?.trim());
  const preferredTheme = useMemo(() => detectPortalTheme(), []);

  const themedAgentUrl1 = useMemo(() => {
    if (!hasAgent1) return '';
    return withThemeParam(config.agentUrl1!.trim(), preferredTheme);
  }, [config.agentUrl1, hasAgent1, preferredTheme]);

  const themedAgentUrl2 = useMemo(
    () => withThemeParam(config.agentUrl2!.trim(), preferredTheme),
    [config.agentUrl2, preferredTheme]
  );

  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<AgentMode>('agent2');

  const currentUrl =
    mode === 'agent1' && hasAgent1 ? themedAgentUrl1 : themedAgentUrl2;

  // iframeSrc is initialised from localStorage so the session survives page reloads and new tabs.
  // reloadKey only increments on explicit user-triggered reload.
  const [iframeSrc, setIframeSrc] = useState<string>(() =>
    getOrCreateSession(themedAgentUrl2)
  );
  const [reloadKey, setReloadKey] = useState(0);

  const [pos, setPos] = useState<{ top: number; left: number }>(() => {
    if (typeof window === 'undefined') return { top: 100, left: 100 };

    const pad = 24;
    const modalWidth = Math.min(460, Math.round(window.innerWidth * 0.92));
    const modalHeight = Math.min(Math.round(window.innerHeight * 0.78), 720);

    return {
      top: Math.max(pad, window.innerHeight - modalHeight - pad),
      left: Math.max(pad, window.innerWidth - modalWidth - pad),
    };
  });

  const panelRef = useRef<HTMLDivElement>(null);
  const lastFocusRef = useRef<HTMLElement | null>(null);

  const draggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number; top: number; left: number } | null>(null);

  const openPanel = () => {
    if (typeof document !== 'undefined') {
      lastFocusRef.current = document.activeElement as HTMLElement | null;
    }
    setVisible(true);
  };

  const closePanel = () => {
    setVisible(false);

    setTimeout(() => {
      if (lastFocusRef.current && typeof lastFocusRef.current.focus === 'function') {
        lastFocusRef.current.focus({ preventScroll: true });
      }
    }, 0);
  };

  const toggleChat = () => {
    if (visible) {
      closePanel();
    } else {
      openPanel();
    }
  };

  const reloadIframe = () => {
    clearSession(currentUrl);
    const newSrc = addCacheBust(currentUrl);
    saveSession(currentUrl, newSrc);
    setIframeSrc(newSrc);
    setReloadKey(k => k + 1);
  };

  // When URL context changes (mode/theme), load (or create) the session for that URL.
  useEffect(() => {
    setIframeSrc(getOrCreateSession(currentUrl));
    setReloadKey(0);
  }, [currentUrl]);

  // Clear ALL chatbot sessions when the app dispatches a 'alumni-logout' event.
  useEffect(() => {
    const handleLogout = () => {
      [themedAgentUrl1, themedAgentUrl2].forEach(url => {
        if (url?.trim()) clearSession(url.trim());
      });
      const freshSrc = addCacheBust(currentUrl);
      saveSession(currentUrl, freshSrc);
      setIframeSrc(freshSrc);
      setReloadKey(k => k + 1);
    };
    window.addEventListener('alumni-logout', handleLogout);
    return () => window.removeEventListener('alumni-logout', handleLogout);
  }, [themedAgentUrl1, themedAgentUrl2, currentUrl]);

  useEffect(() => {
    const onResize = () => {
      const el = panelRef.current;
      if (!el || !visible) return;

      const rect = el.getBoundingClientRect();
      const pad = 8;
      const maxLeft = Math.max(pad, window.innerWidth - rect.width - pad);
      const maxTop = Math.max(pad, window.innerHeight - rect.height - pad);

      setPos(prev => ({
        top: Math.min(Math.max(prev.top, pad), maxTop),
        left: Math.min(Math.max(prev.left, pad), maxLeft),
      }));
    };

    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, [visible]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && visible) {
        closePanel();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [visible]);

  useEffect(() => {
    if (!config.keyboardShortcut?.enabled) return;

    const onKey = (e: KeyboardEvent) => {
      const mods = config.keyboardShortcut.modifiers || [];
      const key = (config.keyboardShortcut.key || 'C').toUpperCase();

      const matchesModifiers =
        (!mods.includes('Alt') || e.altKey) &&
        (!mods.includes('Shift') || e.shiftKey) &&
        (!mods.includes('Ctrl') || e.ctrlKey) &&
        (!mods.includes('Meta') || e.metaKey);

      if (matchesModifiers && e.key.toUpperCase() === key && !visible) {
        openPanel();
      }
    };

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [config.keyboardShortcut, visible]);

  useEffect(() => {
    if (!visible) return;

    const el = panelRef.current;
    if (!el) return;

    const focusableSelector =
      'button, [href], input, select, textarea, iframe, [tabindex]:not([tabindex="-1"])';

    const focusFirst = () => {
      const focusable = Array.from(el.querySelectorAll<HTMLElement>(focusableSelector)).filter(
        item => !item.hasAttribute('disabled') && item.offsetParent !== null
      );

      if (focusable.length > 0) {
        focusable[0].focus();
      }
    };

    focusFirst();

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const list = Array.from(el.querySelectorAll<HTMLElement>(focusableSelector)).filter(
        item => !item.hasAttribute('disabled') && item.offsetParent !== null
      );

      if (list.length === 0) return;

      const first = list[0];
      const last = list[list.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          last.focus();
          e.preventDefault();
        }
      } else if (document.activeElement === last) {
        first.focus();
        e.preventDefault();
      }
    };

    el.addEventListener('keydown', onKey);
    return () => el.removeEventListener('keydown', onKey);
  }, [visible]);

  const startDrag = (clientX: number, clientY: number) => {
    if (!config.enableDraggable || isMobile()) return;

    const el = panelRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();

    draggingRef.current = true;
    dragStartRef.current = { x: clientX, y: clientY, top: rect.top, left: rect.left };
    document.body.classList.add('chat-khipus-ia-noselect');
  };

  const onMouseDown = (e: ReactMouseEvent) => {
    if (!(e.target as HTMLElement)?.closest('.chat-khipus-ia-header')) return;
    startDrag(e.clientX, e.clientY);
  };

  const onTouchStart = (e: ReactTouchEvent) => {
    const touch = e.touches[0];
    if (!(e.target as HTMLElement)?.closest('.chat-khipus-ia-header')) return;
    startDrag(touch.clientX, touch.clientY);
  };

  useEffect(() => {
    const move = (clientX: number, clientY: number) => {
      if (!draggingRef.current || !dragStartRef.current || !panelRef.current) return;

      const pad = 8;
      const rect = panelRef.current.getBoundingClientRect();

      const dx = clientX - dragStartRef.current.x;
      const dy = clientY - dragStartRef.current.y;

      let nextLeft = dragStartRef.current.left + dx;
      let nextTop = dragStartRef.current.top + dy;

      nextLeft = Math.min(Math.max(pad, nextLeft), window.innerWidth - rect.width - pad);
      nextTop = Math.min(Math.max(pad, nextTop), window.innerHeight - rect.height - pad);

      setPos({ top: nextTop, left: nextLeft });
    };

    const onMouseMove = (e: MouseEvent) => move(e.clientX, e.clientY);

    const finishDrag = () => {
      draggingRef.current = false;
      dragStartRef.current = null;
      document.body.classList.remove('chat-khipus-ia-noselect');
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches?.[0]) {
        move(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', finishDrag);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', finishDrag);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', finishDrag);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', finishDrag);
    };
  }, []);

  const overlayEl =
    config.useOverlay && visible ? (
      <div
        id="chat-khipus-ia-overlay"
        style={{ background: config.overlayColor }}
        onClick={closePanel}
        aria-hidden="true"
      />
    ) : null;

  const portal = createPortal(
    <>
      {overlayEl}

      <div
        id="chat-khipus-ia-modal"
        ref={panelRef}
        className={[
          visible ? 'chat-khipus-ia-visible' : 'chat-khipus-ia-hidden',
          mode === 'agent2' ? 'chat-khipus-ia--agent2' : 'chat-khipus-ia--agent1',
        ].join(' ')}
        role="dialog"
        aria-modal="true"
        aria-label={config.ariaLabels.modal}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        style={
          {
            top: pos.top,
            left: pos.left,
            ['--agent2-crop-top' as any]: `${config.agent2CropTopPx}px`,
          } as CSSProperties
        }
      >
        <div className="chat-khipus-ia-header">
          <div className="chat-khipus-ia-headerRow chat-khipus-ia-headerRow--top">
            <div className="chat-khipus-ia-titleWrap">
              <span className="chat-khipus-ia-brandIcon" aria-hidden="true">
                <FaRobot />
              </span>

              <div className="chat-khipus-ia-titleGroup">
                <span className="chat-khipus-ia-title">{config.modalTitle}</span>
                <span className="chat-khipus-ia-subtitle">Soporte inteligente para graduados</span>
              </div>

              <span
                className="chat-khipus-ia-modeBadge"
                aria-label={`Modo actual: ${mode === 'agent2' ? 'Foundry' : 'Copilot'}`}
                title={`Estás usando ${mode === 'agent2' ? 'Foundry' : 'Copilot'}`}
              >
                {mode === 'agent2' ? 'FOUNDRY' : 'COPILOT'}
              </span>
            </div>

            <button
              type="button"
              className="chat-khipus-ia-close"
              onClick={closePanel}
              aria-label={config.ariaLabels.closeButton}
              title="Cerrar"
            >
              <FaTimes />
            </button>
          </div>

          <div className="chat-khipus-ia-headerRow chat-khipus-ia-headerRow--bottom">
            {hasAgent1 ? (
              <div className="chat-khipus-ia-modePicker" role="tablist" aria-label="Seleccionar motor del asistente">
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'agent2'}
                  className={['chat-khipus-ia-modeOption', mode === 'agent2' ? 'is-active' : ''].join(' ')}
                  onClick={() => setMode('agent2')}
                  title="Usar Azure AI Foundry"
                >
                  <span className="chat-khipus-ia-modeIcon" aria-hidden="true">
                    <FaCube />
                  </span>
                  <span className="chat-khipus-ia-modeText">
                    <span className="chat-khipus-ia-modeName">Foundry</span>
                    <span className="chat-khipus-ia-modeDesc">Agente avanzado / integración externa</span>
                  </span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'agent1'}
                  className={['chat-khipus-ia-modeOption', mode === 'agent1' ? 'is-active' : ''].join(' ')}
                  onClick={() => setMode('agent1')}
                  title="Usar Copilot Studio"
                >
                  <span className="chat-khipus-ia-modeIcon" aria-hidden="true">
                    <FaMicrosoft />
                  </span>
                  <span className="chat-khipus-ia-modeText">
                    <span className="chat-khipus-ia-modeName">Copilot</span>
                    <span className="chat-khipus-ia-modeDesc">Asistente institucional embebido</span>
                  </span>
                </button>
              </div>
            ) : (
              <div className="chat-khipus-ia-modeSingle">
                <span className="chat-khipus-ia-modeSinglePill">Azure AI Foundry</span>
              </div>
            )}

            <button
              type="button"
              className="chat-khipus-ia-reload"
              onClick={reloadIframe}
              title={config.ariaLabels.reloadButton}
              aria-label={config.ariaLabels.reloadButton}
            >
              <FaSyncAlt />
            </button>
          </div>
        </div>

        <div className="chat-khipus-ia-iframeWrap">
          <iframe
            key={`${mode}-${reloadKey}`}
            src={iframeSrc}
            frameBorder={0}
            title={config.ariaLabels.modal}
            allow="clipboard-write; microphone; camera"
          />
        </div>
      </div>
    </>,
    document.body
  );

  return (
    <>
      <button
        id="chat-khipus-ia-fab"
        className={visible ? 'chat-khipus-ia-fab--hidden' : 'chat-khipus-ia-fab--show'}
        onClick={toggleChat}
        title={config.floatingButtonTitle}
        aria-label={config.ariaLabels.openButton}
        aria-controls="chat-khipus-ia-modal"
        aria-expanded={visible}
        type="button"
      >
        <span className="chat-khipus-ia-fab-icon">IA</span>
      </button>

      {portal}
    </>
  );
};

export default ChatBotFloating;