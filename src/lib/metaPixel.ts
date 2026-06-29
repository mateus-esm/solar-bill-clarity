type MetaPixelFn = {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[];
  loaded?: boolean;
  version?: string;
  push?: MetaPixelFn;
};

declare global {
  interface Window {
    fbq?: MetaPixelFn;
    _fbq?: MetaPixelFn;
  }
}

const pixelId = import.meta.env.VITE_META_PIXEL_ID || "27105892315707931";

export const isMetaPixelConfigured = Boolean(pixelId);

export function initMetaPixel() {
  if (!pixelId || typeof window === "undefined") return;

  if (!window.fbq) {
    const fbq = function (...args: unknown[]) {
      if (fbq.callMethod) {
        fbq.callMethod(...args);
      } else {
        fbq.queue?.push(args);
      }
    } as MetaPixelFn;

    window.fbq = fbq;
    window._fbq = fbq;
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = "2.0";
    fbq.queue = [];

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    const firstScript = document.getElementsByTagName("script")[0];
    firstScript.parentNode?.insertBefore(script, firstScript);
  }

  window.fbq("init", pixelId);
  trackMetaPageView();
}

export function trackMetaPageView() {
  window.fbq?.("track", "PageView");
}

export function trackMetaLead(params?: Record<string, unknown>) {
  window.fbq?.("track", "Lead", params);
}

export function trackMetaCustomEvent(eventName: string, params?: Record<string, unknown>) {
  window.fbq?.("trackCustom", eventName, params);
}
