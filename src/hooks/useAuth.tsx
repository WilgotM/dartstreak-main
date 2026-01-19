import { useEffect, useState, createContext, useContext, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  display_name: string;
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

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name")
      .eq("id", userId)
      .maybeSingle();

    if (data) {
      setProfile(data);
    } else {
      setProfile(null);
    }
    setLoading(false);
  };

  const migrateGuestData = async (userId: string) => {
    const localMatches = JSON.parse(localStorage.getItem("dartstreak_guest_matches") || "[]");
    if (localMatches.length === 0) return;

    console.log(`Migrating ${localMatches.length} guest matches...`);

    // Prepare matches for insertion (remove local IDs and update player1_id)
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
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (event === 'PASSWORD_RECOVERY') {
          setIsPasswordRecovery(true);
        }

        if (session?.user) {
          // Check if this is an anonymous (guest) user
          const isAnonymousUser = session.user.is_anonymous === true;
          setIsGuest(isAnonymousUser);

          if (isAnonymousUser) {
            // Track guest activity for 30-day expiration
            updateGuestActivity();
            setGuestDaysRemaining(calculateGuestDaysRemaining());

            // Show info modal for first-time guests
            const hasSeenInfo = localStorage.getItem("dartstreak_guest_info_shown");
            if (!hasSeenInfo) {
              setShowGuestInfoModal(true);
            }
          } else {
            setGuestDaysRemaining(null);
            localStorage.removeItem("dartstreak_guest_last_active");
            localStorage.removeItem("dartstreak_guest_info_shown");
          }

          fetchProfile(session.user.id);
        } else {
          setProfile(null);
          setIsGuest(false);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        const isAnonymousUser = session.user.is_anonymous === true;
        setIsGuest(isAnonymousUser);

        if (isAnonymousUser) {
          updateGuestActivity();
          setGuestDaysRemaining(calculateGuestDaysRemaining());
        }

        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    // Update activity periodically for guests
    const activityInterval = setInterval(() => {
      if (user?.is_anonymous) {
        updateGuestActivity();
        setGuestDaysRemaining(calculateGuestDaysRemaining());
      }
    }, 60000); // Update every minute

    return () => {
      subscription.unsubscribe();
      clearInterval(activityInterval);
    };
  }, []);

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
    const { data, error } = await supabase.auth.signInAnonymously();

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
      .insert({ id: user.id, display_name: displayName })
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
