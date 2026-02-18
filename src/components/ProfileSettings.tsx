import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Settings, Clock } from "lucide-react";
import { differenceInDays } from "date-fns";
import CountrySelect from "@/components/CountrySelect";
import { getCountryTimezone } from "@/lib/countries";

const TIMEZONES = [
  { value: "Europe/Stockholm", label: "Stockholm (CET)" },
  { value: "Europe/London", label: "London (GMT)" },
  { value: "Europe/Paris", label: "Paris (CET)" },
  { value: "Europe/Berlin", label: "Berlin (CET)" },
  { value: "America/New_York", label: "New York (EST)" },
  { value: "America/Los_Angeles", label: "Los Angeles (PST)" },
  { value: "America/Chicago", label: "Chicago (CST)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Shanghai", label: "Shanghai (CST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
];

interface ProfileSettingsProps {
  currentDisplayName: string;
  currentEmail: string;
  currentTimezone: string;
  currentCountryCode: string;
  currentCountryTimezone: string;
  displayNameChangedAt: string | null;
  emailChangedAt: string | null;
  onUpdate: () => void;
}

export function ProfileSettings({
  currentDisplayName,
  currentEmail,
  currentTimezone,
  currentCountryCode,
  currentCountryTimezone,
  displayNameChangedAt,
  emailChangedAt,
  onUpdate,
}: ProfileSettingsProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState(currentDisplayName);
  const [email, setEmail] = useState(currentEmail);
  const [timezone, setTimezone] = useState(currentTimezone || "Europe/Stockholm");
  const [countryCode, setCountryCode] = useState(currentCountryCode || "");
  const [saving, setSaving] = useState(false);

  const canChangeDisplayName = !displayNameChangedAt || 
    differenceInDays(new Date(), new Date(displayNameChangedAt)) >= 7;
  
  const canChangeEmail = !emailChangedAt || 
    differenceInDays(new Date(), new Date(emailChangedAt)) >= 7;

  const getDaysUntilChange = (changedAt: string | null) => {
    if (!changedAt) return 0;
    const daysSince = differenceInDays(new Date(), new Date(changedAt));
    return Math.max(0, 7 - daysSince);
  };

  const handleSaveDisplayName = async () => {
    if (!user || !displayName.trim()) return;
    if (!canChangeDisplayName) {
      toast.error(t("profile.cannotChangeYet", { days: getDaysUntilChange(displayNameChangedAt) }));
      return;
    }

    setSaving(true);
    
    // Check if username is taken
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("display_name", displayName.trim())
      .neq("id", user.id)
      .single();

    if (existing) {
      toast.error(t("auth.usernameTaken"));
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ 
        display_name: displayName.trim(),
        display_name_changed_at: new Date().toISOString()
      })
      .eq("id", user.id);

    setSaving(false);
    
    if (error) {
      toast.error(t("profile.updateError"));
    } else {
      toast.success(t("profile.usernameUpdated"));
      onUpdate();
    }
  };

  const handleSaveEmail = async () => {
    if (!user || !email.trim()) return;
    if (!canChangeEmail) {
      toast.error(t("profile.cannotChangeYet", { days: getDaysUntilChange(emailChangedAt) }));
      return;
    }

    setSaving(true);
    
    const { error } = await supabase.auth.updateUser({ email: email.trim() });

    if (!error) {
      // Update the email_changed_at in profiles
      await supabase
        .from("profiles")
        .update({ email_changed_at: new Date().toISOString() })
        .eq("id", user.id);
    }

    setSaving(false);
    
    if (error) {
      toast.error(t("profile.updateError"));
    } else {
      toast.success(t("profile.emailUpdated"));
      onUpdate();
    }
  };

  const handleSaveTimezone = async () => {
    if (!user) return;

    setSaving(true);
    
    const { error } = await supabase
      .from("profiles")
      .update({ timezone })
      .eq("id", user.id);

    setSaving(false);
    
    if (error) {
      toast.error(t("profile.updateError"));
    } else {
      toast.success(t("profile.timezoneUpdated"));
      onUpdate();
    }
  };

  const handleSaveCountry = async () => {
    if (!user || !countryCode) return;

    setSaving(true);
    const countryTimezone = getCountryTimezone(countryCode);

    const { error } = await supabase
      .from("profiles")
      .update({
        country_code: countryCode.toUpperCase(),
        country_timezone: countryTimezone,
      })
      .eq("id", user.id);

    if (!error) {
      await supabase.rpc("ensure_system_memberships", {
        p_user_id: user.id,
        p_previous_country_code: currentCountryCode || null,
        p_previous_country_timezone: currentCountryTimezone || null,
      });
    }

    setSaving(false);

    if (error) {
      toast.error(t("profile.updateError"));
    } else {
      toast.success(t("profile.countryUpdated"));
      onUpdate();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          {t("profile.settings")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Username */}
        <div className="space-y-2">
          <Label htmlFor="displayName">{t("profile.username")}</Label>
          <div className="flex gap-2">
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={!canChangeDisplayName}
              className="flex-1"
            />
            <Button 
              onClick={handleSaveDisplayName} 
              disabled={saving || !canChangeDisplayName || displayName === currentDisplayName}
            >
              {t("common.save")}
            </Button>
          </div>
          {!canChangeDisplayName && (
            <p className="text-xs text-muted-foreground">
              {t("profile.canChangeIn", { days: getDaysUntilChange(displayNameChangedAt) })}
            </p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email">{t("profile.email")}</Label>
          <div className="flex gap-2">
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!canChangeEmail}
              className="flex-1"
            />
            <Button 
              onClick={handleSaveEmail} 
              disabled={saving || !canChangeEmail || email === currentEmail}
            >
              {t("common.save")}
            </Button>
          </div>
          {!canChangeEmail && (
            <p className="text-xs text-muted-foreground">
              {t("profile.canChangeIn", { days: getDaysUntilChange(emailChangedAt) })}
            </p>
          )}
        </div>

        {/* Timezone */}
        <div className="space-y-2">
          <Label htmlFor="country">{t("profile.country")}</Label>
          <div className="flex gap-2">
            <CountrySelect
              id="country"
              value={countryCode}
              onChange={setCountryCode}
              disabled={saving}
              className="flex-1"
            />
            <Button
              onClick={handleSaveCountry}
              disabled={saving || !countryCode || countryCode === currentCountryCode}
            >
              {t("common.save")}
            </Button>
          </div>
        </div>

        {/* Timezone */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            {t("profile.timezone")}
          </Label>
          <div className="flex gap-2">
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              onClick={handleSaveTimezone} 
              disabled={saving || timezone === currentTimezone}
            >
              {t("common.save")}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("profile.timezoneDescription")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
