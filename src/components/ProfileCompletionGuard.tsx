import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import CountrySelect from "@/components/CountrySelect";

export default function ProfileCompletionGuard({ children }: { children: React.ReactNode }) {
  const { loading, user, profile, createProfile, signOut } = useAuth();
  const { t } = useTranslation();
  const [countryCode, setCountryCode] = useState("");
  const [saving, setSaving] = useState(false);

  const needsCountry = useMemo(() => {
    if (!user || !profile) return false;
    return !profile.country_code || !profile.country_timezone;
  }, [user, profile]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center">
        <div className="animate-pulse-soft">
          <img src="/logo.png" alt="DartStreak Logo" className="w-16 h-16 object-contain" />
        </div>
      </div>
    );
  }

  if (user && !profile) {
    return (
      <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center">
        <div className="animate-pulse-soft">
          <img src="/logo.png" alt="DartStreak Logo" className="w-16 h-16 object-contain" />
        </div>
      </div>
    );
  }

  if (!needsCountry || !profile) {
    return children;
  }

  const handleSave = async () => {
    if (!countryCode.trim()) {
      toast.error(t("profile.countryRequired"));
      return;
    }

    setSaving(true);
    const { error } = await createProfile(profile.display_name, countryCode);
    setSaving(false);

    if (error) {
      toast.error(t("profile.updateError"));
      return;
    }

    toast.success(t("profile.countryUpdated"));
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md animate-slide-up">
        <Card className="shadow-card border-2">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto mb-4">
              <img src="/logo.png" alt="DartStreak Logo" className="w-16 h-16 object-contain mx-auto" />
            </div>
            <CardTitle className="text-2xl font-display">{t("profile.completeProfileTitle")}</CardTitle>
            <CardDescription>{t("profile.completeProfileDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profile-country-required">{t("profile.country")}</Label>
              <CountrySelect
                id="profile-country-required"
                value={countryCode}
                onChange={setCountryCode}
              />
            </div>

            <Button onClick={handleSave} className="w-full" disabled={saving || !countryCode}>
              {saving ? t("common.loading") : t("common.save")}
            </Button>

            <Button type="button" variant="ghost" className="w-full" onClick={() => signOut()}>
              {t("auth.logout")}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
