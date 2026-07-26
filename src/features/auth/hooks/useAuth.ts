"use client";

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/features/auth/types/database.types";
import type { RealtimeChannel, User } from "@supabase/supabase-js";
import {
  buildOfflineProfileStub,
  clearCachedProfile,
  readCachedProfile,
  writeCachedProfile,
} from "@/features/offline/lib/profile-cache";
import { isBrowserOnline } from "@/features/offline/lib/offline-utils";

interface AuthState {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Omit<AuthState, "refreshProfile">>({
    user: null,
    profile: null,
    loading: true,
  });

  const fetchProfile = useCallback(async (user: User): Promise<Profile> => {
    const cached = readCachedProfile(user.id);

    if (!isBrowserOnline()) {
      return cached ?? buildOfflineProfileStub(user);
    }

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!error && data) {
        writeCachedProfile(data);
        return data;
      }
    } catch {
      // network / auth unreachable
    }

    return cached ?? buildOfflineProfileStub(user);
  }, []);

  const refreshProfile = useCallback(async () => {
    const user = state.user;
    if (!user) return;
    const profile = await fetchProfile(user);
    setState((prev) => ({ ...prev, profile }));
  }, [fetchProfile, state.user]);

  useEffect(() => {
    const supabase = createClient();
    let profileChannel: RealtimeChannel | null = null;
    let syncGeneration = 0;
    let channelSeq = 0;
    let alive = true;

    const detachProfileRealtime = async () => {
      const channel = profileChannel;
      profileChannel = null;
      if (channel) {
        await supabase.removeChannel(channel);
      }
    };

    const syncUser = async (user: User | null) => {
      const generation = ++syncGeneration;

      await detachProfileRealtime();
      if (!alive || generation !== syncGeneration) return;

      if (!user) {
        // Don't wipe the session just because a refresh failed while offline.
        if (!isBrowserOnline()) {
          try {
            const {
              data: { session },
            } = await supabase.auth.getSession();
            if (session?.user && alive && generation === syncGeneration) {
              await syncUser(session.user);
              return;
            }
          } catch {
            // continue logout path
          }
        }
        clearCachedProfile();
        setState({ user: null, profile: null, loading: false });
        return;
      }

      // Show cached user immediately so the dashboard does not hang offline.
      const quickProfile = readCachedProfile(user.id) ?? buildOfflineProfileStub(user);
      setState({ user, profile: quickProfile, loading: false });

      const profile = await fetchProfile(user);
      if (!alive || generation !== syncGeneration) return;

      setState({ user, profile, loading: false });

      if (!isBrowserOnline()) return;

      channelSeq += 1;
      const topic = `profile-changes:${user.id}:${channelSeq}`;

      const channel = supabase.channel(topic).on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          const nextProfile = payload.new as Profile;
          if (!nextProfile) return;
          writeCachedProfile(nextProfile);
          setState((prev) => ({ ...prev, profile: nextProfile }));
        }
      );

      profileChannel = channel;
      channel.subscribe();
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void syncUser(session?.user ?? null);
    });

    // Explicit session hydrate (works from local storage when offline).
    void supabase.auth.getSession().then(({ data: { session } }) => {
      void syncUser(session?.user ?? null);
    });

    return () => {
      alive = false;
      syncGeneration += 1;
      subscription.unsubscribe();
      void detachProfileRealtime();
    };
  }, [fetchProfile]);

  const value = useMemo(
    () => ({ ...state, refreshProfile }),
    [state, refreshProfile]
  );

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
