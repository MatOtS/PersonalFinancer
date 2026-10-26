"use client";

import { useEffect } from "react";
import { markSession } from "@/domain/auth/session-mark";

// Rendered by the protected layout: it notes that this tab showed a protected
// page, so the sign-in page can tell an ended session from a new visit (ADR-17).
export function SessionMarker() {
  useEffect(() => {
    markSession(window.sessionStorage);
  }, []);
  return null;
}
