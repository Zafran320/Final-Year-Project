import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo } from "react";

const RUNTIME_USER_STORAGE_KEY = "manus-runtime-user-info";

export function readRuntimeUserMirror<T extends object>(): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(RUNTIME_USER_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed as T : null;
  } catch {
    return null;
  }
}

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  // Login is started via startLogin() in the effect below, only when we actually
  // navigate — never during render. startLogin() mints a one-time nonce + writes
  // the state cookie, so calling it per render would overwrite the cookie and
  // desync it from an in-flight login's `state`.
  const { redirectOnUnauthenticated = false, redirectPath } = options ?? {};
  const utils = trpc.useUtils();

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error: unknown) {
      if (
        error instanceof TRPCClientError &&
        error.data?.code === "UNAUTHORIZED"
      ) {
        return;
      }
      throw error;
    } finally {
      // Clear the local runtime mirror so sign-out is reflected immediately
      // while the managed session cookie is invalidated by the server.
      try {
        sessionStorage.removeItem("manus-cookie");
        localStorage.removeItem(RUNTIME_USER_STORAGE_KEY);
      } catch {}
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
    }
  }, [logoutMutation, utils]);

  const cachedUser = useMemo<NonNullable<typeof meQuery.data> | null>(() => (
    meQuery.isLoading ? readRuntimeUserMirror<NonNullable<typeof meQuery.data>>() : null
  ), [meQuery.isLoading]);

  const user = meQuery.data ?? cachedUser ?? null;

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (meQuery.data) localStorage.setItem(RUNTIME_USER_STORAGE_KEY, JSON.stringify(meQuery.data));
      else if (!meQuery.isLoading) localStorage.removeItem(RUNTIME_USER_STORAGE_KEY);
    } catch {}
  }, [meQuery.data, meQuery.isLoading]);

  const state = useMemo(() => {
    return {
      user,
      loading: meQuery.isLoading || logoutMutation.isPending,
      error: meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: Boolean(user),
    };
  }, [
    user,
    meQuery.error,
    meQuery.isLoading,
    logoutMutation.error,
    logoutMutation.isPending,
  ]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (meQuery.isLoading || logoutMutation.isPending) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (redirectPath && window.location.pathname === redirectPath) return;

    // Navigate at this moment only. startLogin() mints the nonce + cookie itself.
    if (redirectPath) {
      window.location.href = redirectPath;
    } else {
      window.location.href = "/login";
    }
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    logoutMutation.isPending,
    meQuery.isLoading,
    state.user,
  ]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
