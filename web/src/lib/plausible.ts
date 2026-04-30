/**
 * Typed wrapper around Plausible's window.plausible() event tracker.
 *
 * Usage from client components:
 *   import { trackEvent } from "@/lib/plausible";
 *   trackEvent("Booking Completed", { service: "Šišanje", price: 900 });
 *
 * No-ops on the server, in dev (no env), and in privacy-mode browsers that
 * block the script — never throws.
 */

type PlausibleProps = Record<string, string | number | boolean>;

declare global {
  interface Window {
    plausible?: (eventName: string, options?: { props?: PlausibleProps; callback?: () => void; revenue?: { currency: string; amount: number } }) => void;
  }
}

export const EVENTS = {
  BOOKING_COMPLETED: "Booking Completed",
  WALK_IN_CREATED: "Walk-In Created",
  ORDER_PLACED: "Order Placed",
  LANG_TOGGLED: "Lang Toggled",
  ADMIN_LOGIN: "Admin Login",
  SOCIAL_LINK_CLICK: "Social Link Click",
} as const;

export type EventName = typeof EVENTS[keyof typeof EVENTS];

export function trackEvent(name: EventName, props?: PlausibleProps): void {
  if (typeof window === "undefined") return;
  if (typeof window.plausible !== "function") return;
  try {
    window.plausible(name, props ? { props } : undefined);
  } catch {
    // never let analytics break the app
  }
}

/** Track a revenue-generating event (orders) so Plausible's Goals UI shows
 *  total RSD per period. */
export function trackRevenue(name: EventName, amountRsd: number, props?: PlausibleProps): void {
  if (typeof window === "undefined") return;
  if (typeof window.plausible !== "function") return;
  try {
    window.plausible(name, {
      props,
      revenue: { currency: "RSD", amount: amountRsd },
    });
  } catch {
    // ignore
  }
}
