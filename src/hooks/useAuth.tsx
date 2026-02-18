import { useEffect, useState, createContext, useContext, ReactNode, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getCountryTimezone } from "@/lib/countries";

interface Profile {
  id: string;
  display_name: string;
  timezone: string | null;
  country_code: string | null;
  country_timezone: string | null;
  avatar_url?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isPasswordRecovery: boolean;
  signUp: (email: string, password: string, displayName: string, countryCode: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  createProfile: (displayName: string, countryCode: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeDisplayName = (value?: string | null) => {
  if (!value) return null;
  const normalized = value.trim().replace(/\s+/g, " ").slice(0, 32);
  return normalized.length >= 2 ? normalized : null;
};

const isUniqueConstraintError = (error: unknown, constraintFragment: string) => {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: string }).code;
  const message = ((error as { message?: string }).message || "").toLowerCase();
  return code === "23505" && message.includes(constraintFragment.toLowerCase());
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const didHydrateSessionRef = useRef(false);

  const fetchProfile = async (authUser: User) => {
    const userId = authUser.id;
    let profileData: Profile | null = null;
    let profileError: unknown = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, timezone, country_code, country_timezone")
        .eq("id", userId)
        .maybeSingle();

      if (data) {
        profileData = data;
        break;
      }

      profileError = error;

      if (attempt < 2) {
        await sleep(300 * (attempt + 1));
      }
    }

    if (profileData) {
      setProfile(profileData);
      if (profileData.country_code && profileData.country_timezone) {
        await supabase.rpc("ensure_system_memberships", { p_user_id: userId });
      }
      return;
    }

    const metadataName =
      normalizeDisplayName(authUser.user_metadata?.display_name)
      || normalizeDisplayName(authUser.user_metadata?.full_name)
      || normalizeDisplayName(authUser.user_metadata?.name)
      || normalizeDisplayName(authUser.email?.split("@")[0]);
    const fallbackName = `Player${userId.slice(0, 6)}`;
    const candidates = Array.from(
      new Set([metadataName, `${fallbackName}`, `${fallbackName}${userId.slice(6, 10)}`].filter(Boolean) as string[])
    );

    for (const candidate of candidates) {
      const metadataCountryCode = authUser.user_metadata?.country_code
        ? String(authUser.user_metadata.country_code).toUpperCase()
        : null;
      const metadataCountryTimezone = authUser.user_metadata?.country_timezone
        ? String(authUser.user_metadata.country_timezone)
        : metadataCountryCode
          ? getCountryTimezone(metadataCountryCode)
          : null;

      const { data, error } = await supabase
        .from("profiles")
        .insert({
          id: userId,
          display_name: candidate,
          timezone: null,
          country_code: metadataCountryCode,
          country_timezone: metadataCountryTimezone,
        })
        .select("id, display_name, timezone, country_code, country_timezone")
        .single();

      if (data) {
        setProfile(data);
        if (data.country_code && data.country_timezone) {
          await supabase.rpc("ensure_system_memberships", { p_user_id: userId });
        }
        return;
      }

      if (isUniqueConstraintError(error, "profiles_display_name_unique")) {
        continue;
      }

      if (isUniqueConstraintError(error, "profiles_pkey")) {
        break;
      }

      console.error("Error recovering missing profile:", error);
      break;
    }

    const { data: retryData, error: retryError } = await supabase
      .from("profiles")
      .select("id, display_name, timezone, country_code, country_timezone")
      .eq("id", userId)
      .maybeSingle();

    if (retryData) {
      setProfile(retryData);
      if (retryData.country_code && retryData.country_timezone) {
        await supabase.rpc("ensure_system_memberships", { p_user_id: userId });
      }
      return;
    }

    if (retryError) {
      console.error("Failed to fetch profile after recovery attempts:", retryError);
    } else if (profileError) {
      console.error("Failed to fetch profile:", profileError);
    }

    setProfile(null);
  };

  const applySessionState = (nextSession: Session | null) => {
    setSession(nextSession);
    setUser(nextSession?.user ?? null);

    if (nextSession?.user) {
      setLoading(false);
      void fetchProfile(nextSession.user);
      return;
    }

    setProfile(null);
    setLoading(false);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "PASSWORD_RECOVERY") {
          setIsPasswordRecovery(true);
        }

        if (!didHydrateSessionRef.current && !session) {
          return;
        }

        applySessionState(session);
      }
    );

    const sessionTimeout = setTimeout(() => {
      console.warn("Session fetch timeout - continuing without auth");
      didHydrateSessionRef.current = true;
      setLoading(false);
    }, 3000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(sessionTimeout);
      didHydrateSessionRef.current = true;
      applySessionState(session);
    }).catch((error) => {
      clearTimeout(sessionTimeout);
      console.error("Error fetching session:", error);
      didHydrateSessionRef.current = true;
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
    // applySessionState is intentionally not in deps to keep one stable subscription lifecycle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signUp = async (email: string, password: string, displayName: string, countryCode: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const normalizedCountryCode = countryCode.toUpperCase();
    const countryTimezone = getCountryTimezone(normalizedCountryCode);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          display_name: displayName,
          country_code: normalizedCountryCode,
          country_timezone: countryTimezone,
        },
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });
    return { error };
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({
      password: password
    });
    return { error };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
    return { error };
  };

  const createProfile = async (displayName: string, countryCode: string) => {
    if (!user) return { error: new Error("No user") };
    const normalizedCountryCode = countryCode.toUpperCase();
    const countryTimezone = getCountryTimezone(normalizedCountryCode);

    const { data, error } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        display_name: displayName,
        country_code: normalizedCountryCode,
        country_timezone: countryTimezone,
      }, { onConflict: "id" })
      .select("id, display_name, timezone, country_code, country_timezone")
      .single();

    if (!error && data) {
      setProfile(data);
      await supabase.rpc("ensure_system_memberships", { p_user_id: user.id });
    }
    return { error };
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      loading,
      isPasswordRecovery,
      signUp,
      signIn,
      signOut,
      resetPassword,
      updatePassword,
      signInWithGoogle,
      createProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
