import { useEffect, useState, type FormEvent } from "react";
import { getProfile, updateProfile, type Channel, type IdentityType, type MemberProfile, type ProfileChanges } from "../../api/member";
import { Button, ButtonLink, ErrorState, LoadingState, Notice, Panel, SelectField, StatusBadge, TextArea, TextField } from "../../components/ui";
import { useAuth } from "../../context/auth-context";
import { ApiError, errorMessage } from "../../lib/api";
import { fieldMessage } from "../../lib/fieldMessage";
import { isValidSaIdNumber } from "../../lib/saId";

// Start an application / Profile. Uses GET and PATCH /api/member/profile (docs/api-contract.md 6.2).
// Only fields that changed are sent. ID number and address are private: never shown publicly.
// Identity is a South African ID or, for members without one, a passport (6-12 letters or digits).

type Values = {
  firstName: string;
  lastName: string;
  phone: string;
  tradingName: string;
  scope: string;
  identityType: IdentityType | "";
  idNumber: string;
  physicalAddress: string;
  city: string;
  facebookUrl: string;
  instagramUrl: string;
  tiktokUrl: string;
};

const LABELS: Record<keyof Values, string> = {
  firstName: "First name",
  lastName: "Last name",
  phone: "Phone number",
  tradingName: "Trading name",
  scope: "What you source",
  identityType: "Identity document",
  idNumber: "ID or passport number",
  physicalAddress: "Address",
  city: "City or town",
  facebookUrl: "Facebook",
  instagramUrl: "Instagram",
  tiktokUrl: "TikTok",
};

// People often type a handle ("nba.naledi", "@nba.naledi") or a link without https://.
// Turn either into the full link the backend expects.
const LINK_BASE = {
  facebookUrl: { kind: "facebook", domains: ["facebook.com", "fb.com"], prefix: "https://www.facebook.com/" },
  instagramUrl: { kind: "instagram", domains: ["instagram.com"], prefix: "https://www.instagram.com/" },
  tiktokUrl: { kind: "tiktok", domains: ["tiktok.com"], prefix: "https://www.tiktok.com/@" },
} as const;
type LinkField = keyof typeof LINK_BASE;
const LINK_FIELDS = Object.keys(LINK_BASE) as LinkField[];

function normalizeLink(field: LinkField, raw: string) {
  const value = raw.trim();
  if (!value) return "";
  const { domains, prefix } = LINK_BASE[field];
  if (/^https?:\/\//i.test(value)) return value;
  if (domains.some((d) => value.toLowerCase().replace(/^www\./, "").startsWith(d))) return `https://${value}`;
  if (/^@?[\w.-]+$/.test(value)) return prefix + value.replace(/^@/, "");
  return value; // leave anything else for the check below to flag
}

function isLinkFor(field: LinkField, value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return ["http:", "https:"].includes(url.protocol) && LINK_BASE[field].domains.some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

function channelFor(profile: MemberProfile, field: LinkField): Channel | undefined {
  return profile.memberProfile.channels.find((c) => c.kind === LINK_BASE[field].kind);
}

function toValues(profile: MemberProfile): Values {
  const p = profile.memberProfile;
  return {
    firstName: p.firstName ?? "",
    lastName: p.lastName ?? "",
    phone: p.phone ?? "",
    tradingName: p.tradingName ?? "",
    scope: p.scope ?? "",
    identityType: p.identityType ?? "",
    idNumber: "", // the server only returns a masked number, so a new one is typed in fresh
    physicalAddress: p.physicalAddress ?? "",
    city: p.city ?? "",
    facebookUrl: channelFor(profile, "facebookUrl")?.value ?? "",
    instagramUrl: channelFor(profile, "instagramUrl")?.value ?? "",
    tiktokUrl: channelFor(profile, "tiktokUrl")?.value ?? "",
  };
}

const REQUIRED: Partial<Record<keyof Values, string>> = {
  firstName: "Enter your first name.",
  lastName: "Enter your last name.",
  phone: "Enter a phone number customers and PSSA can reach you on.",
  scope: "Tell us what you source.",
  physicalAddress: "Enter your address.",
  city: "Enter your city or town.",
};

const IDENTITY_OPTIONS: { value: IdentityType; label: string }[] = [
  { value: "sa_id", label: "South African ID" },
  { value: "passport", label: "Passport" },
];

const isValidPassport = (value: string) => /^[A-Z0-9]{6,12}$/.test(value);
const cleanId = (value: string) => value.replace(/\s/g, "").toUpperCase();

/** The member already has a number on file for the identity type that's selected now. */
const keepsNumberOnFile = (v: Values, initial: Values, hasIdOnFile: boolean) =>
  hasIdOnFile && v.identityType === initial.identityType;

/** Checks one field. Returns an error message, or undefined when the field is fine. */
function checkField(key: keyof Values, v: Values, initial: Values, hasIdOnFile: boolean): string | undefined {
  if (key === "identityType") return v.identityType ? undefined : "Choose South African ID or passport.";
  if (key === "idNumber") {
    const id = cleanId(v.idNumber);
    const passport = v.identityType === "passport";
    if (!id) {
      if (keepsNumberOnFile(v, initial, hasIdOnFile)) return undefined;
      return passport ? "Enter your passport number." : "Enter your South African ID number.";
    }
    if (passport) return isValidPassport(id) ? undefined : "Enter a valid passport number (6 to 12 letters or digits).";
    return isValidSaIdNumber(id) ? undefined : "Enter a valid 13-digit South African ID number.";
  }
  if ((LINK_FIELDS as string[]).includes(key)) {
    const field = key as LinkField;
    const name = LABELS[field];
    return !v[field].trim() || isLinkFor(field, v[field].trim()) ? undefined : `Enter your ${name} handle or a ${name} link.`;
  }
  const required = REQUIRED[key];
  return required && !String(v[key]).trim() ? required : undefined;
}

function validate(v: Values, initial: Values, hasIdOnFile: boolean) {
  const errors: Partial<Record<keyof Values, string>> = {};
  for (const key of Object.keys(LABELS) as (keyof Values)[]) {
    const message = checkField(key, v, initial, hasIdOnFile);
    if (message) errors[key] = message;
  }
  return errors;
}

/** Only the fields that changed. Empty optional fields are sent as null so they are cleared. */
function changes(initial: Values, v: Values): ProfileChanges {
  const out: ProfileChanges = {};
  const t = (key: keyof Values) => String(v[key]).trim();
  if (t("firstName") !== initial.firstName) out.firstName = t("firstName");
  if (t("lastName") !== initial.lastName) out.lastName = t("lastName");
  if (t("phone") !== initial.phone) out.phone = t("phone") || null;
  if (t("tradingName") !== initial.tradingName) out.tradingName = t("tradingName") || null;
  if (t("scope") !== initial.scope) out.scope = t("scope") || null;
  // The backend checks the number against the type, so they always travel together.
  const id = cleanId(v.idNumber);
  if (id || (v.identityType && v.identityType !== initial.identityType)) {
    if (v.identityType) out.identityType = v.identityType;
    if (id) out.idNumber = id;
  }
  if (t("physicalAddress") !== initial.physicalAddress) out.physicalAddress = t("physicalAddress") || null;
  if (t("city") !== initial.city) out.city = t("city") || null;
  for (const field of LINK_FIELDS) if (t(field) !== initial[field]) out[field] = t(field) || null;
  return out;
}

function ChannelHint({ channel }: { channel?: Channel }) {
  if (!channel) return <>Optional.</>;
  return channel.status === "confirmed" ? (
    <StatusBadge tone="green">Confirmed</StatusBadge>
  ) : (
    <>Not confirmed yet. You'll prove you control it under Verification.</>
  );
}

export default function Profile() {
  const { user, setUser } = useAuth();
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [initial, setInitial] = useState<Values | null>(null);
  const [values, setValues] = useState<Values | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof Values, string>>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    getProfile(controller.signal)
      .then(({ profile }) => {
        setProfile(profile);
        const v = toValues(profile);
        setInitial(v);
        setValues(v);
        setLoadError(null);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setLoadError(errorMessage(err));
      });
    return () => controller.abort();
  }, [attempt]);

  if (loadError) {
    return (
      <ErrorState
        title="We couldn't load your profile"
        text={loadError}
        onRetry={() => {
          setLoadError(null);
          setAttempt((n) => n + 1);
        }}
      />
    );
  }
  if (!profile || !values || !initial) return <LoadingState rows={3} label="Loading your profile" />;

  const p = profile.memberProfile;
  const hasIdOnFile = Boolean(p.idNumber);
  const isPassport = values.identityType === "passport";
  const keepsOnFile = keepsNumberOnFile(values, initial, hasIdOnFile);
  const idName = isPassport ? "passport number" : "South African ID number";
  const idLabel = keepsOnFile ? `New ${idName}` : idName[0].toUpperCase() + idName.slice(1);

  const set = (key: keyof Values) => (e: { target: { value: string } }) => {
    setValues({ ...values, [key]: e.target.value });
    setSaved(false);
    if (errors[key]) setErrors({ ...errors, [key]: undefined });
  };

  // When the member leaves a field: tidy a link, then check just that field.
  const leave = (key: keyof Values) => () => {
    let next = values;
    if ((LINK_FIELDS as string[]).includes(key)) {
      const tidy = normalizeLink(key as LinkField, values[key]);
      if (tidy !== values[key]) {
        next = { ...values, [key]: tidy };
        setValues(next);
      }
    }
    setErrors((current) => ({ ...current, [key]: checkField(key, next, initial, hasIdOnFile) }));
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!values || !initial) return;
    setSaveError(null);
    setSaved(false);
    const tidied = { ...values };
    for (const key of LINK_FIELDS) tidied[key] = normalizeLink(key, values[key]);
    setValues(tidied);
    const found = validate(tidied, initial, hasIdOnFile);
    setErrors(found);
    if (Object.keys(found).length) return;

    const body = changes(initial, tidied);
    if (Object.keys(body).length === 0) {
      setSaved(true);
      return;
    }
    setSaving(true);
    try {
      const { profile } = await updateProfile(body);
      setProfile(profile);
      const v = toValues(profile);
      setInitial(v);
      setValues(v);
      setSaved(true);
      // Update the signed-in user so the sidebar shows the new name straight away.
      if (user) setUser({ ...user, firstName: profile.memberProfile.firstName, lastName: profile.memberProfile.lastName });
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fields).length) {
        const mapped: Partial<Record<keyof Values, string>> = {};
        for (const [field, message] of Object.entries(err.fields)) {
          if (field in LABELS) mapped[field as keyof Values] = fieldMessage(LABELS[field as keyof Values], message);
        }
        setErrors(mapped);
        setSaveError(err.message);
      } else {
        setSaveError(errorMessage(err));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="workspace-title">
        <div>
          <span>Step 1 of 6</span>
          <h1>Your profile</h1>
          <p>Tell us who you are and how you trade. We check these details during verification.</p>
        </div>
      </div>

      <form onSubmit={onSubmit} noValidate style={{ display: "grid", gap: 18, maxWidth: 820 }}>
        {saved && <Notice tone="green" title="Your profile is saved." />}
        {saveError && <Notice tone="red" title="We couldn't save your profile">{saveError}</Notice>}

        <Panel icon="user" title="Your details" subtitle={`Signed in as ${profile.email}`}>
          <div className="profile-grid">
            <TextField label="First name" autoComplete="given-name" value={values.firstName} onChange={set("firstName")} onBlur={leave("firstName")} error={errors.firstName} required />
            <TextField label="Last name" autoComplete="family-name" value={values.lastName} onChange={set("lastName")} onBlur={leave("lastName")} error={errors.lastName} required />
          </div>
          <TextField
            label="Phone number"
            type="tel"
            autoComplete="tel"
            placeholder="e.g. 082 123 4567"
            value={values.phone}
            onChange={set("phone")}
            onBlur={leave("phone")}
            error={errors.phone}
            hint="A new number has to be confirmed again."
            required
          />
        </Panel>

        <Panel icon="badge" title="Your business" subtitle="How customers know you and what you do">
          <TextField
            label="Trading name"
            value={values.tradingName}
            onChange={set("tradingName")}
            onBlur={leave("tradingName")}
            error={errors.tradingName}
            hint="Optional. Leave empty if you trade under your own name."
          />
          <TextField
            label="What you source"
            placeholder="e.g. Fashion, beauty, homeware"
            maxLength={150}
            value={values.scope}
            onChange={set("scope")}
            onBlur={leave("scope")}
            error={errors.scope}
            hint="The kinds of goods or services you offer. This becomes the scope on your certificate."
            required
          />
        </Panel>

        <Panel icon="lock" title="Identity and address" subtitle="Private: only you and PSSA reviewers can see these">
          <SelectField
            label="Identity document"
            placeholder="Choose one"
            options={IDENTITY_OPTIONS}
            value={values.identityType}
            onChange={(e) => {
              setValues({ ...values, identityType: e.target.value as Values["identityType"], idNumber: "" });
              setSaved(false);
              setErrors({ ...errors, identityType: undefined, idNumber: undefined });
            }}
            error={errors.identityType}
            hint="Use a passport only if you don't have a South African ID."
            required
          />
          <TextField
            label={idLabel}
            inputMode={isPassport ? "text" : "numeric"}
            autoCapitalize={isPassport ? "characters" : "off"}
            autoComplete="off"
            maxLength={isPassport ? 14 : 16}
            placeholder={keepsOnFile ? (p.idNumber ?? "") : isPassport ? "6 to 12 letters or digits" : "13 digits"}
            value={values.idNumber}
            onChange={set("idNumber")}
            onBlur={leave("idNumber")}
            error={errors.idNumber}
            hint={keepsOnFile ? `On file: ${p.idNumber}. Leave empty to keep it.` : isPassport ? "It must match your passport." : "It must match your ID document."}
            required={!keepsOnFile}
            disabled={!values.identityType}
          />
          <TextArea
            label="Residential or operating address"
            rows={3}
            maxLength={300}
            value={values.physicalAddress}
            onChange={set("physicalAddress")}
            onBlur={leave("physicalAddress")}
            error={errors.physicalAddress}
            hint="It must match your proof of address."
            required
          />
          <TextField label="City or town" autoComplete="address-level2" maxLength={100} value={values.city} onChange={set("city")} onBlur={leave("city")} error={errors.city} required />
        </Panel>

        <Panel icon="people" title="Trading channels" subtitle="The social pages you sell on. You'll prove you control them under Verification.">
          {LINK_FIELDS.map((field) => (
            <TextField
              key={field}
              label={LABELS[field]}
              placeholder={field === "facebookUrl" ? "Page name or link" : "@handle or link"}
              value={values[field]}
              onChange={set(field)}
              onBlur={leave(field)}
              error={errors[field]}
              hint={<ChannelHint channel={channelFor(profile, field)} />}
            />
          ))}
        </Panel>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Button type="submit" variant="green" loading={saving}>
            Save profile
          </Button>
          <ButtonLink to="/member" variant="outline">
            Back to your application
          </ButtonLink>
        </div>
      </form>
    </>
  );
}
