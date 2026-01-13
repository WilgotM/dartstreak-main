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
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  continueAsGuest: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name")
      .eq("id", userId)
      .single();

    if (data) {
      setProfile(data);
    }
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
    const guestStatus = localStorage.getItem("dartstreak_guest_mode") === "true";
    if (guestStatus) {
      setIsGuest(true);
      const guestId = localStorage.getItem("dartstreak_guest_id") || `guest_${Math.floor(Math.random() * 10000)}`;
      localStorage.setItem("dartstreak_guest_id", guestId);
      setProfile({
        id: guestId,
        display_name: `Guest ${guestId.split('_')[1] || ''}`,
      });
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setIsGuest(false);
          localStorage.removeItem("dartstreak_guest_mode");
          fetchProfile(session.user.id);
          migrateGuestData(session.user.id);
        } else if (!guestStatus) {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setIsGuest(false);
        localStorage.removeItem("dartstreak_guest_mode");
        fetchProfile(session.user.id);
        migrateGuestData(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
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
    localStorage.removeItem("dartstreak_guest_mode");
    localStorage.removeItem("dartstreak_guest_id");
    setIsGuest(false);
  };

  const continueAsGuest = () => {
    setIsGuest(true);
    const guestId = `guest_${Math.floor(Math.random() * 10000)}`;
    localStorage.setItem("dartstreak_guest_mode", "true");
    localStorage.setItem("dartstreak_guest_id", guestId);
    setProfile({
      id: guestId,
      display_name: `Guest ${guestId.split('_')[1]}`,
    });
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, isGuest, signUp, signIn, signOut, continueAsGuest }}>
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
