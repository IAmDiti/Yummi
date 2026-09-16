/**
 * Auth + profile store. Independent of src/store/session.ts, which holds the
 * active scan/recommend/cook flow and knows nothing about who's signed in.
 *
 * In mock mode (no Supabase project configured) the app behaves as always
 * signed in with a small local profile, persisted to AsyncStorage so edits
 * stick across restarts — same as every other mock service in this app. In
 * real mode this mirrors supabase-js's own session via onAuthStateChange and
 * loads the matching public.profiles row; the profile is still persisted
 * locally as a cache so it's available instantly on the next launch.
 *
 * Sign-in is optional, not a gate: the scan -> ingredients -> recommend ->
 * cook flow works fully signed out. It's only required to post a dish photo,
 * rate a post, or edit dietary preferences.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { initialMockProfile, mockDelay, mockUser } from '../services/auth/mock';
import { IS_MOCK } from '../services/env';
import { supabase } from '../services/supabase';
import type { DietaryTag, Profile } from '../services/types';

type Status = 'loading' | 'signedOut' | 'signedIn';

type AuthState = {
  status: Status;
  userId: string | null;
  email: string | null;
  profile: Profile | null;

  /** Call once from app/_layout.tsx to start listening for session changes. */
  init: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  /**
   * Create an account. Resolves with `needsConfirmation: true` when the project
   * has "Confirm email" enabled (Supabase returns a user but no session until
   * the emailed link is followed); `false` means the caller is already signed in.
   */
  signUp: (email: string, password: string) => Promise<{ needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  updateProfile: (patch: {
    displayName?: string;
    dietaryTags?: DietaryTag[];
    hideUsername?: boolean;
  }) => Promise<void>;
  /**
   * Permanently deletes the signed-in user's account: the sign-in itself,
   * their profile, dish posts, photos, and ratings — required by Google
   * Play's account-deletion policy. Irreversible; leaves the caller signed
   * out on success.
   */
  deleteAccount: () => Promise<void>;
};

let initialized = false;

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => {
      const applySession = async (userId: string, email: string | null) => {
        set({ status: 'signedIn', userId, email });
        if (!supabase) return;
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
        if (!error && data) {
          set({
            profile: {
              id: data.id,
              displayName: data.display_name,
              avatarUrl: data.avatar_url,
              dietaryTags: (data.dietary_tags ?? []) as DietaryTag[],
              hideUsername: !!data.hide_username,
            },
          });
        }
      };

      return {
        status: IS_MOCK ? 'signedIn' : 'loading',
        userId: IS_MOCK ? mockUser.id : null,
        email: IS_MOCK ? mockUser.email : null,
        profile: IS_MOCK ? initialMockProfile : null,

        init: () => {
          if (IS_MOCK || !supabase || initialized) return;
          initialized = true;
          supabase.auth.getSession().then(({ data }) => {
            if (data.session) applySession(data.session.user.id, data.session.user.email ?? null);
            else set({ status: 'signedOut', userId: null, email: null, profile: null });
          });
          supabase.auth.onAuthStateChange((_event, session) => {
            if (session) applySession(session.user.id, session.user.email ?? null);
            else set({ status: 'signedOut', userId: null, email: null, profile: null });
          });
        },

        signIn: async (email, password) => {
          if (IS_MOCK) {
            await mockDelay(undefined, 500);
            return;
          }
          const { error } = await supabase!.auth.signInWithPassword({ email, password });
          if (error) throw error;
        },

        signUp: async (email, password) => {
          if (IS_MOCK) {
            await mockDelay(undefined, 500);
            return { needsConfirmation: false };
          }
          const { data, error } = await supabase!.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: 'yummi://auth-callback' },
          });
          if (error) throw error;
          return { needsConfirmation: !data.session };
        },

        signOut: async () => {
          if (IS_MOCK) return;
          await supabase!.auth.signOut();
        },

        updateProfile: async (patch) => {
          const current = get().profile;
          if (!current) return;
          const next: Profile = {
            ...current,
            displayName: patch.displayName ?? current.displayName,
            dietaryTags: patch.dietaryTags ?? current.dietaryTags,
            hideUsername: patch.hideUsername ?? current.hideUsername,
          };
          set({ profile: next });

          if (IS_MOCK) {
            await mockDelay(undefined, 300);
            return;
          }
          const { error } = await supabase!
            .from('profiles')
            .update({
              display_name: next.displayName,
              dietary_tags: next.dietaryTags,
              hide_username: next.hideUsername,
            })
            .eq('id', current.id);
          if (error) throw error;
        },

        deleteAccount: async () => {
          if (IS_MOCK) {
            await mockDelay(undefined, 500);
            set({ status: 'signedOut', userId: null, email: null, profile: null });
            return;
          }
          const { error } = await supabase!.functions.invoke('delete-account', {
            method: 'POST',
          });
          if (error) {
            // supabase-js's FunctionsHttpError carries our JSON { error } body
            // on `.context`, not on `.message` — surface the real reason.
            const context = (error as { context?: Response }).context;
            const body = await context?.json().catch(() => null);
            throw new Error(body?.error || error.message);
          }
          set({ status: 'signedOut', userId: null, email: null, profile: null });
        },
      };
    },
    {
      name: 'yummi-auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ profile: s.profile }),
    },
  ),
);
