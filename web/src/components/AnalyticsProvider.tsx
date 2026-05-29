"use client";

import React, { useEffect, useRef, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { logPageView, logClick, logError, getClientGeoInfo } from "../lib/logger";

function AnalyticsTrackerInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activePathRef = useRef<string>("");

  useEffect(() => {
    const paramsStr = searchParams?.toString();
    const fullPath = pathname + (paramsStr ? `?${paramsStr}` : "");
    
    // Prevent duplicate logs on strict mode double-renders or empty re-renders
    if (activePathRef.current !== fullPath) {
      activePathRef.current = fullPath;
      logPageView(fullPath);
    }
  }, [pathname, searchParams]);

  return null;
}

export default function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  // 1. Setup global handlers on mount (non-search params dependent logic)
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Trigger lazy geo resolution instantly on mount
    getClientGeoInfo().catch(() => {});

    // --- Global Click Interceptor ---
    const handleGlobalClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      // Intercept clicks on buttons, links, submits, inputs or data-track custom tags
      const interactiveEl = target.closest("button, a, input[type='button'], input[type='submit'], [role='button'], [data-track]");
      if (!interactiveEl) return;

      const elementId = interactiveEl.id || "unspecified";
      const classes = interactiveEl.className || "";
      
      // Resolve a meaningful and clean label for the event
      let label = interactiveEl.getAttribute("data-track") || "";
      if (!label) {
        const textContent = (interactiveEl.textContent || "").trim();
        if (textContent) {
          // Truncate text content if it contains complex nested tags or overflows
          label = textContent.length > 50 ? textContent.slice(0, 47) + "..." : textContent;
        } else if (interactiveEl.getAttribute("placeholder")) {
          label = interactiveEl.getAttribute("placeholder") || "";
        } else if (interactiveEl.getAttribute("aria-label")) {
          label = interactiveEl.getAttribute("aria-label") || "";
        } else if (interactiveEl.tagName === "INPUT") {
          label = (interactiveEl as HTMLInputElement).value || "";
        }
      }

      if (!label) {
        label = `${interactiveEl.tagName.toLowerCase()} element`;
      }

      const tagName = interactiveEl.tagName.toLowerCase();
      const href = interactiveEl.getAttribute("href") || undefined;

      // Log click event centrally
      logClick(elementId, label, {
        tagName,
        classes,
        href,
        destination: href || null
      });
    };

    // --- Uncaught JavaScript Crash/Error Listener (Web Crashlytics) ---
    const handleUncaughtError = (event: ErrorEvent) => {
      const { message, filename, lineno, colno, error } = event;
      
      logError(`Crash: ${message || "Uncaught runtime exception"}`, {
        type: "uncaught_error",
        filename,
        line: lineno,
        column: colno,
        stack: error?.stack || null,
        message: message,
      });
    };

    // --- Unhandled Promise Rejection Listener (Web Crashlytics) ---
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      let errorMsg = "Unhandled promise rejection";
      let stack = null;

      if (reason instanceof Error) {
        errorMsg = reason.message;
        stack = reason.stack;
      } else if (typeof reason === "string") {
        errorMsg = reason;
      } else if (reason) {
        try {
          errorMsg = JSON.stringify(reason);
        } catch (_) {}
      }

      logError(`Promise Reject: ${errorMsg}`, {
        type: "unhandled_rejection",
        message: errorMsg,
        stack,
      });
    };

    window.addEventListener("click", handleGlobalClick, { capture: true });
    window.addEventListener("error", handleUncaughtError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    console.log("[AnalyticsProvider] Global trackers and exception boundaries mounted successfully");

    return () => {
      window.removeEventListener("click", handleGlobalClick, { capture: true });
      window.removeEventListener("error", handleUncaughtError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return (
    <>
      <Suspense fallback={null}>
        <AnalyticsTrackerInner />
      </Suspense>
      {children}
    </>
  );
}
