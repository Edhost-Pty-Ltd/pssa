import { useEffect, useState, type FormEvent } from "react";
import { getProfile, MEMBER_CATEGORIES, updateProfile, type MemberProfile, type ProfileChanges } from "../../api/member";
import { Button, ButtonLink, ErrorState, LoadingState, Notice, Panel, SelectField, TextArea, TextField } from "../../components/ui";
import { useAuth } from "../../context/auth-context";
import { ApiError, errorMessage } from "../../lib/api";
import { fieldMessage } from "../../lib/fieldMessage";
import { isValidSaIdNumber } from "../../lib/saId";

// Start an application / Profile. Uses GET and PATCH /api/member/profile.
// Only fields that changed are sent. ID number, address and banking details are never shown publicly.

type Values = {
  firstName: string;
  lastName: string;
  phone: string;
  businessName: string;
  category: string;
  idNumber: string;
  physicalAddress: string;
  facebookUrl: string;
  instagramUrl: string;
  tiktokUrl: string;
};

const LABELS: Record<keyof Values, string> = {
  firstName: "First name",
  lastName: "Last name",
  phone: "Phone number",
  businessName: "Trading name",
  category: "Category",
  idNumber: "ID number",
  physicalAddress: "Address",
  facebookUrl: "Facebook link",
  instagramUrl: "Instagram link",
  tiktokUrl: "TikTok link",
};

// People often type a handle ("nba.naledi", "@nba.naledi") or a link without https://.
// Turn either into the full link the backend expects.
const LINK_BASE = {
  facebookUrl: { domains: ["facebook.com", "fb.com"], prefix: "https://www.facebook.com/" },
  instagramUrl: { domains: ["instagram.com"], prefix: "https://www.instagram.com/" },
  tiktokUrl: { domains: ["tiktok.com"], prefix: "https://www.tiktok.com/@" },
} as const;
type LinkField = keyof typeof LINK_BASE;

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

const LINK_FIELDS: LinkField[] = ["facebookUrl", "instagramUrl", "tiktokUrl"];
const PLATFORM_NAME: Record<LinkField, string> = { facebookUrl: "Facebook", instagramUrl: "Instagram", tiktokUrl: "TikTok" };

function toValues(profile: MemberProfile): Values {
  const social = (platform: string) => profile.member.socialAccounts.find((s) => s.platform === platform)?.url ?? "";
  return {
    firstName: profile.firstName ?? "",
    lastName: profile.lastName ?? "",
    phone: profile.phone ?? "",
    businessName: profile.member.businessName ?? "",
    category: profile.member.category ?? "",
    idNumber: "", // the server only returns a masked number, so a new one is typed in fresh
    physicalAddress: profile.member.physicalAddress ?? "",
    facebookUrl: social("facebook"),
    instagramUrl: social("instagram"),
    tiktokUrl: social("tiktok"),
  };
}

/** Checks one field. Returns an error message, or undefined when the field is fine. */
function checkField(key: keyof Values, v: Values, hasIdOnFile: boolean): string | undefined {
  switch (key) {
    case "firstName":
      return v.firstName.trim() ? undefined : "Enter your first name.";
    case "lastName":
      return v.lastName.trim() ? undefined : "Enter your last name.";
    case "category":
      return v.category ? undefined : "Choose a category.";
    case "idNumber": {
      const id = v.idNumber.replace(/\s/g, "");
      if (!id) return hasIdOnFile ? undefined : "Enter your South African ID number.";
      return isValidSaIdNumber(id) ? undefined : "Enter a valid 13-digit South African ID number.";
    }
    case "physicalAddress":
      return v.physicalAddress.trim() ? undefined : "Enter your address.";
    case "facebookUrl":
    case "instagramUrl":
    case "tiktokUrl":
      return !v[key].trim() || isLinkFor(key, v[key].trim()) ? undefined : `Enter your ${PLATFORM_NAME[key]} handle or a ${PLATFORM_NAME[key]} link.`;
    default:
      return undefined;
  }
}

function validate(v: Values, hasIdOnFile: boolean) {
  const errors: Partial<Record<keyof Values, string>> = {};
  for (const key of Object.keys(LABELS) as (keyof Values)[]) {
    const message = checkField(key, v, hasIdOnFile);
    if (message) errors[key] = message;
  }
  return errors;
}

/** Only the fields that changed. Empty optional fields are sent as null so they are cleared. */
function changes(initial: Values, v: Values): ProfileChanges {
  const out: ProfileChanges = {};
  const trimmed = (key: keyof Values) => v[key].trim();
  if (trimmed("firstName") !== initial.firstName) out.firstName = trimmed("firstName");
  if (trimmed("lastName") !== initial.lastName) out.lastName = trimmed("lastName");
  if (trimmed("phone") !== initial.phone) out.phone = trimmed("phone") || null;
  if (trimmed("businessName") !== initial.businessName) out.businessName = trimmed("businessName") || null;
  if (v.category !== initial.category) out.category = v.category as ProfileChanges["category"];
  if (v.idNumber.replace(/\s/g, "")) out.idNumber = v.idNumber.replace(/\s/g, "");
  if (trimmed("physicalAddress") !== initial.physicalAddress) out.physicalAddress = trimmed("physicalAddress") || null;
  if (trimmed("facebookUrl") !== initial.facebookUrl) out.facebookUrl = trimmed("facebookUrl") || null;
  if (trimmed("instagramUrl") !== initial.instagramUrl) out.instagramUrl = trimmed("instagramUrl") || null;
  if (trimmed("tiktokUrl") !== initial.tiktokUrl) out.tiktokUrl = trimmed("tiktokUrl") || null;
  return out;
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

  if (loadError) return <ErrorState title="We couldn't load your profile" text={loadError} onRetry={() => { setLoadError(null); setAttempt((n) => n + 1); }} />;
  if (!profile || !values || !initial) return <LoadingState rows={3} label="Loading your profile" />;

  const hasIdOnFile = Boolean(profile.member.idNumber);
  const set = (key: keyof Values) => (e: { target: { value: string } }) => {
    setValues({ ...values, [key]: e.target.value });
    setSaved(false);
    if (errors[key]) setErrors({ ...errors, [key]: undefined });
  };

  // When the member leaves a field: tidy a link, then check just that field.
  const leave = (key: keyof Values) => () => {
    if (!values) return;
    let next = values;
    if ((LINK_FIELDS as string[]).includes(key)) {
      const tidy = normalizeLink(key as LinkField, values[key]);
      if (tidy !== values[key]) next = { ...values, [key]: tidy };
      setValues(next);
    }
    setErrors((current) => ({ ...current, [key]: checkField(key, next, hasIdOnFile) }));
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!values || !initial) return;
    setSaveError(null);
    setSaved(false);
    const tidied = { ...values };
    for (const key of LINK_FIELDS) tidied[key] = normalizeLink(key, values[key]);
    setValues(tidied);
    const found = validate(tidied, hasIdOnFile);
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
      if (user) setUser({ ...user, firstName: profile.firstName, lastName: profile.lastName, phone: profile.phone });
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
            onChange={set("phone")} onBlur={leave("phone")}
            error={errors.phone}
            hint="Optional. A new number has to be confirmed again."
          />
        </Panel>

        <Panel icon="badge" title="Your business" subtitle="How customers know you">
          <TextField
            label="Trading name"
            value={values.businessName}
            onChange={set("businessName")} onBlur={leave("businessName")}
            error={errors.businessName}
            hint="Optional. Leave empty if you trade under your own name."
          />
          <SelectField
            label="Category"
            value={values.category}
            onChange={set("category")} onBlur={leave("category")}
            error={errors.category}
            placeholder="Choose a category"
            options={MEMBER_CATEGORIES.map((c) => ({ value: c, label: c }))}
            required
          />
        </Panel>

        <Panel icon="lock" title="Identity and address" subtitle="Private: only you and PSSA reviewers can see these">
          <TextField
            label={hasIdOnFile ? "New ID number" : "South African ID number"}
            inputMode="numeric"
            autoComplete="off"
            maxLength={16}
            placeholder={hasIdOnFile ? (profile.member.idNumber ?? "") : "13 digits"}
            value={values.idNumber}
            onChange={set("idNumber")} onBlur={leave("idNumber")}
            error={errors.idNumber}
            hint={hasIdOnFile ? `On file: ${profile.member.idNumber}. Leave empty to keep it.` : "It must match your ID document."}
            required={!hasIdOnFile}
          />
          <TextArea
            label="Residential or operating address"
            rows={3}
            maxLength={300}
            value={values.physicalAddress}
            onChange={set("physicalAddress")} onBlur={leave("physicalAddress")}
            error={errors.physicalAddress}
            hint="It must match your proof of address."
            required
          />
        </Panel>

        <Panel icon="people" title="Trading channels" subtitle="The social pages you sell on. We'll ask you to prove you control them.">
          <TextField label="Facebook" placeholder="Page name or link" value={values.facebookUrl} onChange={set("facebookUrl")} onBlur={leave("facebookUrl")} error={errors.facebookUrl} />
          <TextField label="Instagram" placeholder="@handle or link" value={values.instagramUrl} onChange={set("instagramUrl")} onBlur={leave("instagramUrl")} error={errors.instagramUrl} />
          <TextField label="TikTok" placeholder="@handle or link" value={values.tiktokUrl} onChange={set("tiktokUrl")} onBlur={leave("tiktokUrl")} error={errors.tiktokUrl} />
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
