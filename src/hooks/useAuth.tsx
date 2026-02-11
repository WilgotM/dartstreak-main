import { useEffect, useState, createContext, useContext, ReactNode, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  display_name: string;
  avatar_url?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isGuest: boolean;
  guestDaysRemaining: number | null;
  isPasswordRecovery: boolean;
  showGuestInfoModal: boolean;
  setShowGuestInfoModal: (show: boolean) => void;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  continueAsGuest: () => Promise<{ error: Error | null }>;
  upgradeGuestAccount: (email: string, password: string, displayName: string) => Promise<{ error: Error | null }>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  createProfile: (displayName: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const GUEST_EXPIRY_DAYS = 30;

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

// Helper to calculate days remaining for guest account
const calculateGuestDaysRemaining = (): number | null => {
  const lastActive = localStorage.getItem("dartstreak_guest_last_active");
  if (!lastActive) return GUEST_EXPIRY_DAYS;

  const lastActiveDate = new Date(lastActive);
  const now = new Date();
  const daysSinceActive = Math.floor((now.getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24));
  const remaining = GUEST_EXPIRY_DAYS - daysSinceActive;

  return Math.max(0, remaining);
};

// Update guest activity timestamp
const updateGuestActivity = () => {
  if (localStorage.getItem("dartstreak_guest_mode") === "true") {
    localStorage.setItem("dartstreak_guest_last_active", new Date().toISOString());
  }
};

// Check if guest data should be expired and clean up
const checkAndCleanExpiredGuestData = () => {
  const lastActive = localStorage.getItem("dartstreak_guest_last_active");
  if (!lastActive) return false;

  const daysRemaining = calculateGuestDaysRemaining();
  if (daysRemaining !== null && daysRemaining <= 0) {
    // Clear all guest data
    localStorage.removeItem("dartstreak_guest_mode");
    localStorage.removeItem("dartstreak_guest_id");
    localStorage.removeItem("dartstreak_guest_matches");
    localStorage.removeItem("dartstreak_guest_friends");
    localStorage.removeItem("dartstreak_guest_leagues");
    localStorage.removeItem("dartstreak_guest_tournaments");
    localStorage.removeItem("dartstreak_guest_last_active");
    localStorage.removeItem("dartstreak_guest_info_shown");
    return true; // Data was expired
  }
  return false;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [guestDaysRemaining, setGuestDaysRemaining] = useState<number | null>(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [showGuestInfoModal, setShowGuestInfoModal] = useState(false);
  const didHydrateSessionRef = useRef(false);

  const applySessionState = (nextSession: Session | null) => {
    setSession(nextSession);
    setUser(nextSession?.user ?? null);

    if (nextSession?.user) {
      const isAnonymousUser = nextSession.user.is_anonymous === true;
      setIsGuest(isAnonymousUser);

      if (isAnonymousUser) {
        updateGuestActivity();
        setGuestDaysRemaining(calculateGuestDaysRemaining());

        const hasSeenInfo = localStorage.getItem("dartstreak_guest_info_shown");
        if (!hasSeenInfo) {
          setShowGuestInfoModal(true);
        }
      } else {
        setGuestDaysRemaining(null);
        localStorage.removeItem("dartstreak_guest_last_active");
        localStorage.removeItem("dartstreak_guest_info_shown");
      }

      setLoading(false);
      void fetchProfile(nextSession.user);
      return;
    }

    setProfile(null);
    setIsGuest(false);
    setGuestDaysRemaining(null);
    setLoading(false);
  };

  const fetchProfile = async (authUser: User) => {
    const userId = authUser.id;
    let profileData: { id: string; display_name: string } | null = null;
    let profileError: unknown = null;

    // Retry to reduce transient race conditions during auth/session restore.
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name")
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
      return;
    }

    // If the profile row is missing, attempt to recover automatically.
    // This can happen if a trigger failed or data drifted in production.
    if (!authUser.is_anonymous) {
      const metadataName =
        normalizeDisplayName(authUser.user_metadata?.display_name)
        || normalizeDisplayName(authUser.user_metadata?.full_name)
        || normalizeDisplayName(authUser.user_metadata?.name)
        || normalizeDisplayName(authUser.email?.split("@")[0]);
      const fallbackName = `Player${userId.slice(0, 6)}`;
      const candidates = Array.from(new Set([metadataName, `${fallbackName}`, `${fallbackName}${userId.slice(6, 10)}`].filter(Boolean) as string[]));

      for (const candidate of candidates) {
        const { data, error } = await supabase
          .from("profiles")
          .insert({ id: userId, display_name: candidate })
          .select("id, display_name")
          .single();

        if (data) {
          setProfile(data);
          return;
        }

        // display_name collision: try the next fallback candidate
        if (isUniqueConstraintError(error, "profiles_display_name_unique")) {
          continue;
        }

        // id collision means row likely exists; stop inserting and retry a direct fetch
        if (isUniqueConstraintError(error, "profiles_pkey")) {
          break;
        }

        console.error("Error recovering missing profile:", error);
        break;
      }

      const { data: retryData, error: retryError } = await supabase
        .from("profiles")
        .select("id, display_name")
        .eq("id", userId)
        .maybeSingle();

      if (retryData) {
        setProfile(retryData);
        return;
      }

      if (retryError) {
        console.error("Failed to fetch profile after recovery attempts:", retryError);
      } else if (profileError) {
        console.error("Failed to fetch profile:", profileError);
      }
    } else if (profileError) {
      console.error("Failed to fetch guest profile:", profileError);
    }

    setProfile(null);
  };

  const migrateGuestData = async (userId: string) => {
    const localMatches = JSON.parse(localStorage.getItem("dartstreak_guest_matches") || "[]");
    if (localMatches.length === 0) return;

    console.log(`Migrating ${localMatches.length} guest matches...`);

    // Prepare matches for insertion (remove local IDs and update player1_id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const matchesToMigrate = localMatches.map((m: any) => ({
      player1_id: userId,
      player2_id: null, // Guest matches are always offline/solo
      starting_score: m.starting_score,
      checkout_type: m.checkout_type,
      player1_score: m.player1_score,
      player2_score: m.player2_score,
      current_turn: userId,
      is_offline: true,
      legs_to_win: m.legs_to_win,
      sets_to_win: m.sets_to_win,
      status: m.status,
      started_at: m.started_at,
      completed_at: m.completed_at,
      winner_id: m.winner_id ? userId : null,
      created_at: m.created_at,
    }));

    const { error } = await supabase.from("matches").insert(matchesToMigrate);
    if (!error) {
      localStorage.removeItem("dartstreak_guest_matches");
      localStorage.removeItem("dartstreak_guest_id");
    } else {
      console.error("Error migrating guest data:", error);
    }
  };

  useEffect(() => {
    // Check if guest data has expired
    checkAndCleanExpiredGuestData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          setIsPasswordRecovery(true);
        }

        // Ignore transient null auth events until initial session hydration is complete.
        if (!didHydrateSessionRef.current && !session) {
          return;
        }

        applySessionState(session);
      }
    );

    // Timeout fallback to prevent infinite loading if Supabase is unresponsive
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

  useEffect(() => {
    if (!isGuest) return;

    const activityInterval = setInterval(() => {
      updateGuestActivity();
      setGuestDaysRemaining(calculateGuestDaysRemaining());
    }, 60000); // Update every minute

    return () => {
      clearInterval(activityInterval);
    };
  }, [isGuest]);

  const signUp = async (email: string, password: string, displayName: string) => {
    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          display_name: displayName,
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
    localStorage.removeItem("dartstreak_guest_last_active");
    localStorage.removeItem("dartstreak_guest_info_shown");
    setIsGuest(false);
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

  // Sign in anonymously - creates a real Supabase user for guests
  const continueAsGuest = async () => {
    const { data, error } = await supabase.auth.signInAnonymously({
      options: {
        data: {
          display_name: 'Guest'
        }
      }
    });

    if (error) {
      console.error("Error signing in anonymously:", error);
      return { error };
    }

    if (data.user) {
      // Create a profile for the anonymous user
      const guestNumber = Math.floor(Math.random() * 10000);
      const guestName = `Guest ${guestNumber}`;

      await supabase.from("profiles").upsert({
        id: data.user.id,
        display_name: guestName
      });

      // Initialize guest activity tracking
      localStorage.setItem("dartstreak_guest_last_active", new Date().toISOString());
    }

    return { error: null };
  };

  // Upgrade anonymous account to permanent account with email/password
  const upgradeGuestAccount = async (email: string, password: string, displayName: string) => {
    if (!user?.is_anonymous) {
      return { error: new Error("User is not a guest") };
    }

    // Link email and password to the anonymous account
    const { error: updateError } = await supabase.auth.updateUser({
      email,
      password
    });

    if (updateError) {
      return { error: updateError };
    }

    // Update profile with new display name
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ display_name: displayName })
      .eq("id", user.id);

    if (profileError) {
      console.error("Error updating profile:", profileError);
    }

    // Clean up guest-related localStorage
    localStorage.removeItem("dartstreak_guest_last_active");
    localStorage.removeItem("dartstreak_guest_info_shown");

    // Update local state
    setIsGuest(false);
    setGuestDaysRemaining(null);
    setProfile({ id: user.id, display_name: displayName });

    return { error: null };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Use just the origin URL - the app will redirect to dashboard after auth
        // HashRouter doesn't work with OAuth redirects that have hash paths
        redirectTo: window.location.origin,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    return { error };
  };

  const createProfile = async (displayName: string) => {
    if (!user) return { error: new Error("No user") };

    const { data, error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, display_name: displayName }, { onConflict: "id" })
      .select("id, display_name")
      .single();

    if (!error && data) {
      setProfile(data);
    }
    return { error };
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      loading,
      isGuest,
      guestDaysRemaining,
      isPasswordRecovery,
      showGuestInfoModal,
      setShowGuestInfoModal,
      signUp,
      signIn,
      signOut,
      continueAsGuest,
      upgradeGuestAccount,
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
