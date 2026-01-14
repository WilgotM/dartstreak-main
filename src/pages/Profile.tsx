import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Target, ArrowLeft, UserPlus, UserCheck, Users } from "lucide-react";
import { format } from "date-fns";
import { enUS, sv } from "date-fns/locale";
import { useFriends } from "@/hooks/useFriends";
import { StatsDisplay } from "@/components/StatsDisplay";
import { AppLayout } from "@/components/AppLayout";

interface ProfileData {
  id: string;
  display_name: string;
  created_at: string;
}

export default function Profile() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [friendStatus, setFriendStatus] = useState<"none" | "friends" | "pending_sent" | "pending_received">("none");
  const { friends, outgoingRequests, incomingRequests, sendFriendRequest, acceptFriendRequest } = useFriends();

  const dateLocale = i18n.language === "sv" ? sv : enUS;
  const isOwnProfile = user?.id === id;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && id) {
      fetchProfile();
    }
  }, [user, id]);

  useEffect(() => {
    if (id && friends.length > 0) {
      const isFriend = friends.some((f) => f.id === id);
      if (isFriend) {
        setFriendStatus("friends");
        return;
      }
    }

    if (id && outgoingRequests.length > 0) {
      const isPending = outgoingRequests.some((r) => r.to_user_id === id);
      if (isPending) {
        setFriendStatus("pending_sent");
        return;
      }
    }

    if (id && incomingRequests.length > 0) {
      const isPending = incomingRequests.some((r) => r.from_user_id === id);
      if (isPending) {
        setFriendStatus("pending_received");
        return;
      }
    }

    setFriendStatus("none");
  }, [id, friends, outgoingRequests, incomingRequests]);

  const fetchProfile = async () => {
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (profileError || !profileData) {
      toast.error(t("profile.notFound"));
      navigate("/dashboard");
      return;
    }

    setProfile(profileData);
    setLoading(false);
  };

  const handleSendFriendRequest = async () => {
    if (!profile) return;
    const { error } = await sendFriendRequest(profile.display_name);
    if (error) {
      toast.error(t(`friends.errors.${error.replace(/ /g, "_").toLowerCase()}`) || error);
    } else {
      toast.success(t("friends.requestSent"));
      setFriendStatus("pending_sent");
    }
  };

  const handleAcceptRequest = async () => {
    const request = incomingRequests.find((r) => r.from_user_id === id);
    if (request) {
      await acceptFriendRequest(request.id);
      toast.success(t("friends.requestAccepted"));
      setFriendStatus("friends");
    }
  };

  if (authLoading || loading) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-pulse-soft">
            <img src="/logo.png" alt="DartStreak Logo" className="w-16 h-16 object-contain" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!profile) return null;

  return (
    <AppLayout>
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 md:top-16 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-display font-bold text-xl">{profile.display_name}</h1>
              <p className="text-sm text-muted-foreground">
                {t("profile.memberSince")} {format(new Date(profile.created_at), "MMMM yyyy", { locale: dateLocale })}
              </p>
            </div>
          </div>
          {!isOwnProfile && (
            <div>
              {friendStatus === "none" && (
                <Button variant="default" onClick={handleSendFriendRequest}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  {t("friends.addFriend")}
                </Button>
              )}
              {friendStatus === "pending_sent" && (
                <Button variant="secondary" disabled>
                  <UserPlus className="w-4 h-4 mr-2" />
                  {t("friends.requestPending")}
                </Button>
              )}
              {friendStatus === "pending_received" && (
                <Button variant="default" onClick={handleAcceptRequest}>
                  <UserCheck className="w-4 h-4 mr-2" />
                  {t("friends.acceptRequest")}
                </Button>
              )}
              {friendStatus === "friends" && (
                <Button variant="secondary" disabled>
                  <Users className="w-4 h-4 mr-2" />
                  {t("friends.alreadyFriends")}
                </Button>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-lg font-display font-semibold mb-4">{t("stats.statistics")}</h2>
          <StatsDisplay userId={id} />
        </div>
      </main>
    </AppLayout>
  );
}
