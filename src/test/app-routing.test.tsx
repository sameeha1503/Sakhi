import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
describe("App routing", () => {
  it("matches a page for / instead of falling back to not found", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/");

    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it("asserts /visit matches its own route and not /care", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/visit");
    const matchedRouteId = matches.at(-1)?.routeId;

    expect(matchedRouteId).toBe("/visit");
    expect(matchedRouteId).not.toBe("/care");
  });

  it("asserts /visit?tab=summary matches /visit route and not /care", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/visit", { tab: "summary" });
    const matchedRouteId = matches.at(-1)?.routeId;

    expect(matchedRouteId).toBe("/visit");
    expect(matchedRouteId).not.toBe("/care");
  });

  it("asserts /schemes matches its own route and not /care", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/schemes");
    const matchedRouteId = matches.at(-1)?.routeId;

    expect(matchedRouteId).toBe("/schemes");
    expect(matchedRouteId).not.toBe("/care");
  });

  it("asserts /learn is removed and does not match a valid route", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/learn");
    expect(matches.at(-1)?.routeId).toBe(rootRouteId);
  });
});
