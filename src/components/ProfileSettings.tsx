import { ChangeEvent, ComponentType, useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Settings, Clock, UserIcon, MailIcon, Globe2Icon, CheckCircle2, ChevronRight } from "lucide-react";
import { differenceInDays } from "date-fns";
import CountrySelect from "@/components/CountrySelect";
import { getCountryTimezone } from "@/lib/countries";
import gsap from "gsap";

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

interface CustomInputGroupProps {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSave: () => void;
  saving: boolean;
  disabled: boolean;
  hasChanged: boolean;
  helperText?: string;
  type?: "text" | "email";
  idx: number;
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
  const [savingField, setSavingField] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const fieldsRef = useRef<(HTMLDivElement | null)[]>([]);

  const canChangeDisplayName = !displayNameChangedAt || 
    differenceInDays(new Date(), new Date(displayNameChangedAt)) >= 7;
  
  const canChangeEmail = !emailChangedAt || 
    differenceInDays(new Date(), new Date(emailChangedAt)) >= 7;

  const getDaysUntilChange = (changedAt: string | null) => {
    if (!changedAt) return 0;
    const daysSince = differenceInDays(new Date(), new Date(changedAt));
    return Math.max(0, 7 - daysSince);
  };

  useEffect(() => {
    const ctx = gsap.context(() => {
      const validFields = fieldsRef.current.filter(Boolean);
      if (validFields.length === 0) return;
      
      gsap.set(validFields, { opacity: 0, x: -20 });
      gsap.to(validFields, {
        opacity: 1,
        x: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: "power3.out",
        delay: 0.2
      });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  const handleSaveDisplayName = async () => {
    if (!user || !displayName.trim()) return;
    if (!canChangeDisplayName) {
      toast.error(t("profile.cannotChangeYet", { days: getDaysUntilChange(displayNameChangedAt) }));
      return;
    }

    setSavingField("displayName");
    
    // Check if username is taken
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("display_name", displayName.trim())
      .neq("id", user.id)
      .single();

    if (existing) {
      toast.error(t("auth.usernameTaken"));
      setSavingField(null);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ 
        display_name: displayName.trim(),
        display_name_changed_at: new Date().toISOString()
      })
      .eq("id", user.id);

    setSavingField(null);
    
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

    setSavingField("email");
    
    const { error } = await supabase.auth.updateUser({ email: email.trim() });

    if (!error) {
      // Update the email_changed_at in profiles
      await supabase
        .from("profiles")
        .update({ email_changed_at: new Date().toISOString() })
        .eq("id", user.id);
    }

    setSavingField(null);
    
    if (error) {
      toast.error(t("profile.updateError"));
    } else {
      toast.success(t("profile.emailUpdated"));
      onUpdate();
    }
  };

  const handleSaveTimezone = async () => {
    if (!user) return;

    setSavingField("timezone");
    
    const { error } = await supabase
      .from("profiles")
      .update({ timezone })
      .eq("id", user.id);

    setSavingField(null);
    
    if (error) {
      toast.error(t("profile.updateError"));
    } else {
      toast.success(t("profile.timezoneUpdated"));
      onUpdate();
    }
  };

  const handleSaveCountry = async () => {
    if (!user || !countryCode) return;

    setSavingField("country");
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

    setSavingField(null);

    if (error) {
      toast.error(t("profile.updateError"));
    } else {
      toast.success(t("profile.countryUpdated"));
      onUpdate();
    }
  };

  // Helper for rendering custom inputs
  const CustomInputGroup = ({ 
    id, 
    label, 
    icon: Icon, 
    value, 
    onChange, 
    onSave, 
    saving, 
    disabled, 
    hasChanged, 
    helperText, 
    type = "text",
    idx
  }: CustomInputGroupProps) => {
    return (
      <div ref={(el) => (fieldsRef.current[idx] = el)} className="group space-y-2">
        <label htmlFor={id} className="flex items-center gap-2 text-sm font-bold tracking-wide text-[#FAF8F5]/80 pl-1">
          <Icon className="h-4 w-4 text-[#22C55E]" />
          {label}
        </label>
        <div className="relative flex items-center gap-3">
          <div className="relative flex-1">
            <input
              id={id}
              type={type}
              value={value}
              onChange={onChange}
              disabled={disabled}
              className="peer w-full rounded-2xl border border-[#FAF8F5]/10 bg-[#0D0D12] px-4 py-4 text-base font-semibold text-[#FAF8F5] shadow-inner transition-all duration-300 placeholder:text-[#FAF8F5]/30 focus:border-[#22C55E]/50 focus:bg-[#16161C] focus:outline-none focus:ring-1 focus:ring-[#22C55E]/50 disabled:cursor-not-allowed disabled:opacity-50"
            />
            {/* Ambient glow behind input on focus */}
            <div className="pointer-events-none absolute -inset-1 z-[-1] rounded-3xl bg-[#22C55E]/20 opacity-0 blur-lg transition-opacity duration-300 peer-focus:opacity-100" />
          </div>
          <button
            onClick={onSave}
            disabled={saving || disabled || !hasChanged}
            className={`flex h-[56px] w-[56px] shrink-0 items-center justify-center rounded-2xl border transition-all duration-300 ${
              hasChanged && !disabled
                ? "border-[#22C55E]/40 bg-[#22C55E]/10 text-[#22C55E] shadow-[0_0_15px_rgba(34,197,94,0.3)] hover:scale-105 hover:bg-[#22C55E]/20 hover:shadow-[0_0_20px_rgba(34,197,94,0.5)]"
                : "border-[#FAF8F5]/5 bg-[#0D0D12] text-[#FAF8F5]/30 cursor-not-allowed"
            }`}
          >
            {saving ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <CheckCircle2 className={`h-6 w-6 ${hasChanged && !disabled ? "drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]" : ""}`} />
            )}
          </button>
        </div>
        {helperText && (
          <p className="pl-1 text-xs font-medium text-[#FAF8F5]/40">{helperText}</p>
        )}
      </div>
    );
  };

  return (
    <div ref={containerRef} className="overflow-hidden rounded-[2.5rem] border border-[#FAF8F5]/10 bg-[#16161C]/50 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl">
      <div className="border-b border-[#FAF8F5]/10 bg-[#0D0D12]/40 px-6 py-5 sm:px-8">
        <h2 className="flex items-center gap-3 text-xl font-black tracking-tight text-[#FAF8F5]">
          <span className="flex h-10 w-10 items-center justify-center rounded-[1rem] bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20">
            <Settings className="h-5 w-5" />
          </span>
          {t("profile.settings")}
        </h2>
      </div>
      <div className="space-y-8 p-6 sm:p-8">
        {/* Username */}
        <CustomInputGroup
          idx={0}
          id="displayName"
          label={t("profile.username")}
          icon={UserIcon}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          onSave={handleSaveDisplayName}
          saving={savingField === "displayName"}
          disabled={!canChangeDisplayName}
          hasChanged={displayName !== currentDisplayName}
          helperText={!canChangeDisplayName ? t("profile.canChangeIn", { days: getDaysUntilChange(displayNameChangedAt) }) : undefined}
        />

        {/* Email */}
        <CustomInputGroup
          idx={1}
          id="email"
          type="email"
          label={t("profile.email")}
          icon={MailIcon}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onSave={handleSaveEmail}
          saving={savingField === "email"}
          disabled={!canChangeEmail}
          hasChanged={email !== currentEmail}
          helperText={!canChangeEmail ? t("profile.canChangeIn", { days: getDaysUntilChange(emailChangedAt) }) : undefined}
        />

        <div className="h-px w-full bg-gradient-to-r from-transparent via-[#FAF8F5]/10 to-transparent" />

        {/* Country */}
        <div ref={(el) => (fieldsRef.current[2] = el)} className="space-y-2">
          <label htmlFor="country" className="flex items-center gap-2 text-sm font-bold tracking-wide text-[#FAF8F5]/80 pl-1">
            <Globe2Icon className="h-4 w-4 text-[#38BDF8]" />
            {t("profile.country")}
          </label>
          <div className="flex gap-3">
            {/* Intentionally keeping CountrySelect mostly as-is, but wrapping in styles if possible, else relying on its classname */}
            <div className="flex-1 rounded-2xl border border-[#FAF8F5]/10 bg-[#0D0D12] overflow-hidden shadow-inner focus-within:ring-1 focus-within:ring-[#38BDF8]/50 focus-within:border-[#38BDF8]/50 transition-all duration-300 [&>button]:h-[56px] [&>button]:bg-transparent [&>button]:border-none [&>button]:text-[#FAF8F5] [&>button]:font-semibold">
              <CountrySelect
                id="country"
                value={countryCode}
                onChange={setCountryCode}
                disabled={savingField === "country"}
                className="w-full h-full"
              />
            </div>
            <button
              onClick={handleSaveCountry}
              disabled={savingField === "country" || countryCode === currentCountryCode}
              className={`flex h-[56px] w-[56px] shrink-0 items-center justify-center rounded-2xl border transition-all duration-300 ${
                countryCode !== currentCountryCode
                  ? "border-[#38BDF8]/40 bg-[#38BDF8]/10 text-[#38BDF8] shadow-[0_0_15px_rgba(56,189,248,0.3)] hover:scale-105 hover:bg-[#38BDF8]/20 hover:shadow-[0_0_20px_rgba(56,189,248,0.5)]"
                  : "border-[#FAF8F5]/5 bg-[#0D0D12] text-[#FAF8F5]/30 cursor-not-allowed"
              }`}
            >
              {savingField === "country" ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <CheckCircle2 className={`h-6 w-6 ${countryCode !== currentCountryCode ? "drop-shadow-[0_0_8px_rgba(56,189,248,0.8)]" : ""}`} />
              )}
            </button>
          </div>
        </div>

        {/* Timezone */}
        <div ref={(el) => (fieldsRef.current[3] = el)} className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-bold tracking-wide text-[#FAF8F5]/80 pl-1">
            <Clock className="h-4 w-4 text-[#FACC15]" />
            {t("profile.timezone")}
          </label>
          <div className="flex gap-3">
            {/* Custom wrapper around the generic select to match our intense aesthetic */}
            <div className="flex-1 rounded-2xl border border-[#FAF8F5]/10 bg-[#0D0D12] shadow-inner focus-within:ring-1 focus-within:ring-[#FACC15]/50 focus-within:border-[#FACC15]/50 transition-all duration-300">
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger className="h-[56px] w-full border-none bg-transparent px-4 font-semibold text-[#FAF8F5] shadow-none focus:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-[#FAF8F5]/10 bg-[#16161C] text-[#FAF8F5] backdrop-blur-xl">
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value} className="focus:bg-[#FAF8F5]/10 focus:text-[#FAF8F5]">
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <button
              onClick={handleSaveTimezone}
              disabled={savingField === "timezone" || timezone === currentTimezone}
              className={`flex h-[56px] w-[56px] shrink-0 items-center justify-center rounded-2xl border transition-all duration-300 ${
                timezone !== currentTimezone
                  ? "border-[#FACC15]/40 bg-[#FACC15]/10 text-[#FACC15] shadow-[0_0_15px_rgba(250,204,21,0.3)] hover:scale-105 hover:bg-[#FACC15]/20 hover:shadow-[0_0_20px_rgba(250,204,21,0.5)]"
                  : "border-[#FAF8F5]/5 bg-[#0D0D12] text-[#FAF8F5]/30 cursor-not-allowed"
              }`}
            >
              {savingField === "timezone" ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <CheckCircle2 className={`h-6 w-6 ${timezone !== currentTimezone ? "drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]" : ""}`} />
              )}
            </button>
          </div>
          <p className="pl-1 text-xs font-medium text-[#FAF8F5]/40">{t("profile.timezoneDescription")}</p>
        </div>
      </div>
    </div>
  );
}
