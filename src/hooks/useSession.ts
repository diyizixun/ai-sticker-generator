"use client";

import { useState, useEffect, useCallback } from "react";

interface Session {
  email: string;
  iat: number;
  exp: number;
}

interface UseSessionReturn {
  session: Session | null;
  status: "loading" | "authenticated" | "unauthenticated";
  refresh: () => void;
}

export function useSession(): UseSessionReturn {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading");

  const fetchSession = useCallback(() => {
    setStatus("loading");
    fetch("/api/auth/session")
      .then((r) => {
        if (!r.ok) throw new Error("Not authenticated");
        return r.json();
      })
      .then((data) => {
        if (data.email) {
          setSession(data);
          setStatus("authenticated");
        } else {
          setSession(null);
          setStatus("unauthenticated");
        }
      })
      .catch(() => {
        setSession(null);
        setStatus("unauthenticated");
      });
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  return { session, status, refresh: fetchSession };
}
