// In-app history stack tracking to guarantee back navigation stays within the app and never drops to '/'
export const inAppHistoryStack: string[] = [];

export function canGoBackInApp(): boolean {
  if (typeof window === "undefined") return false;
  if (window.history.length <= 1) return false;
  if (inAppHistoryStack.length > 1) {
    const prev = inAppHistoryStack[inAppHistoryStack.length - 2];
    if (prev && prev !== "/" && prev !== "/consent" && prev !== "/signup") {
      return true;
    }
  }
  return false;
}
