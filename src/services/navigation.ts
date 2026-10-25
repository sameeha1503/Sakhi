import { prefs } from "@/services/auth";

export interface NavigationHistoryLocation {
  pathname?: string;
}

export interface NavigationHistoryEvent {
  action?: { type?: string };
  type?: string;
  location?: NavigationHistoryLocation;
  pathname?: string;
}

export interface NavigationHistory {
  location?: NavigationHistoryLocation;
  length?: number;
  back?: () => void;
  subscribe?: (listener: (event: NavigationHistoryEvent) => void) => () => void;
}

export interface NavigationRouter {
  history?: NavigationHistory;
  navigate?: (opts: { to: string; replace?: boolean }) => void;
}

let inAppHistory: string[] = [];
let subscribedHistory: NavigationHistory | null = null;

/**
 * Initialize navigation tracker on router history.
 * Tracks push, replace, and back actions to know whether a previous page exists inside Sakhi.
 */
export function initNavigationTracker(router: NavigationRouter | undefined | null) {
  if (!router?.history) return;
  if (subscribedHistory === router.history) return;
  subscribedHistory = router.history;

  const currentPath =
    router.history.location?.pathname ||
    (typeof window !== "undefined" ? window.location.pathname : "/");

  if (inAppHistory.length === 0) {
    inAppHistory = [currentPath];
  }

  if (typeof router.history.subscribe === "function") {
    router.history.subscribe((event: NavigationHistoryEvent) => {
      const action = event?.action?.type || event?.type || "PUSH";
      const path = event?.location?.pathname || event?.pathname || "";

      if (action === "PUSH") {
        inAppHistory.push(path);
      } else if (action === "REPLACE") {
        if (inAppHistory.length > 0) {
          inAppHistory[inAppHistory.length - 1] = path;
        } else {
          inAppHistory.push(path);
        }
      } else if (action === "BACK") {
        if (inAppHistory.length > 1) {
          inAppHistory.pop();
        }
      }
    });
  }
}

/**
 * Returns true only if there is a previous navigation entry recorded inside this Sakhi session.
 */
export function canGoBackInApp(router?: NavigationRouter | undefined): boolean {
  const historyLen =
    router?.history?.length ?? (typeof window !== "undefined" ? window.history.length : 1);
  return inAppHistory.length > 1 && historyLen > 1;
}

/**
 * Reset navigation history (useful for test isolation).
 */
export function resetNavigationHistory(initialEntries?: string[]) {
  inAppHistory = initialEntries ? [...initialEntries] : [];
  subscribedHistory = null;
}

/**
 * Get a copy of the recorded in-app navigation stack.
 */
export function getInAppHistory(): string[] {
  return [...inAppHistory];
}

/**
 * Check if the given pathname should exclude the top Back button.
 * Excluded: /, /home, /consent, /signup, /urgent, and /share (public view).
 */
export function isBackButtonExcluded(pathname: string): boolean {
  if (!pathname) return false;
  if (
    pathname === "/" ||
    pathname === "/home" ||
    pathname === "/consent" ||
    pathname === "/signup" ||
    pathname === "/urgent" ||
    pathname.startsWith("/share")
  ) {
    return true;
  }
  return false;
}

export interface GoBackOptions {
  router?: NavigationRouter | undefined;
  navigate?: ((opts: { to: string; replace?: boolean }) => void) | undefined;
  fallback?: string | undefined;
  isLoggedIn?: boolean | undefined;
}

/**
 * Consistent back navigation helper:
 * - If browser history has a previous page inside Sakhi, calls router.history.back().
 * - Otherwise (opened directly, QR link, or refresh), navigates to /home (or / if logged out).
 */
export function goBack(options?: GoBackOptions): void {
  const router = options?.router;
  const navigate = options?.navigate;

  if (canGoBackInApp(router)) {
    if (router?.history?.back) {
      router.history.back();
      return;
    }
    if (typeof window !== "undefined" && window.history?.back) {
      window.history.back();
      return;
    }
  }

  // Fallback when opened directly, after refresh, or no previous in-app entry
  const loggedIn = options?.isLoggedIn ?? prefs.loggedIn();
  const defaultFallback = loggedIn ? "/home" : "/";
  const target = options?.fallback ?? defaultFallback;

  if (navigate) {
    navigate({ to: target });
  } else if (router?.navigate) {
    router.navigate({ to: target });
  } else if (typeof window !== "undefined") {
    window.location.href = target;
  }
}
