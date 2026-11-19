import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  ACCEPT_ATTRIBUTE,
  ACCEPTED_FILE_TYPES,
  addChannel,
  confirmChannel,
  deleteDocument,
  documentFileUrl,
  MAX_FILE_MB,
  uploadDocument,
  type DocumentType,
} from "../../api/documents";
import { getApplication, getProfile, type ApplicationOverview, type Channel, type MemberDocument, type MemberProfile } from "../../api/member";
import { Icon, type IconName } from "../../components/Icon";
import { Button, ButtonLink, DOCUMENT_STATUS, ErrorState, LoadingState, Notice, Panel, SelectField, Status, StatusBadge, TextField } from "../../components/ui";
import { ApiError, errorMessage } from "../../lib/api";
import { fieldMessage } from "../../lib/fieldMessage";

interface Slot {
  key: string;
  title: string;
  hint: string;
  icon: IconName;
  types: { type: DocumentType; label: string }[];
  optional?: boolean;
}

const SLOTS: Slot[] = [
  {
    key: "id",
    title: "ID document or passport",
    hint: "Both sides of your smart ID card, your green ID book, or the photo page of your passport. It must match your profile.",
    icon: "shield",
    types: [{ type: "id_document", label: "ID document" }],
  },
  {
    key: "address",
    title: "Proof of residence or business registration",
    hint: "A utility bill, bank statement or lease from the last three months, or your company registration record.",
    icon: "home",
    types: [
      { type: "proof_of_residence", label: "proof of residence" },
      { type: "business_registration", label: "business registration" },
    ],
  },
  {
    key: "bank",
    title: "Receiving bank account evidence",
    hint: "A bank-issued letter or statement from the last three months showing the account holder's name and account number. Never send a banking password or PIN.",
    icon: "bank",
    types: [{ type: "bank_evidence", label: "bank evidence" }],
  },
  {
    key: "channel",
    title: "Proof you control a trading channel",
    hint: "Only needed if you can't confirm a channel below, for example a screenshot of your account settings page.",
    icon: "people",
    types: [{ type: "channel_evidence", label: "channel evidence" }],
    optional: true,
  },
];

const PLATFORMS = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "tiktok", label: "TikTok" },
  { value: "whatsapp", label: "WhatsApp Business" },
  { value: "website", label: "Website" },
  { value: "other", label: "Other" },
];
const platformLabel = (kind: string) => PLATFORMS.find((p) => p.value === kind)?.label ?? kind;

const CHANNEL_STATUS = {
  code_sent: { label: "Code sent", tone: "blue" as const },
  confirmed: { label: "Confirmed", tone: "green" as const },
};

function latestFor(documents: MemberDocument[], types: DocumentType[]) {
  return documents
    .filter((d) => (types as string[]).includes(d.type))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

function checkFile(file: File) {
  if (!ACCEPTED_FILE_TYPES.includes(file.type)) return "Upload a PDF, JPG, PNG or WebP file.";
  if (file.size > MAX_FILE_MB * 1024 * 1024) return `The file is too large. The limit is ${MAX_FILE_MB} MB.`;
  return null;
}

const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });

function UploadButton({ label, icon = "upload", disabled, onFile }: { label: string; icon?: IconName; disabled?: boolean; onFile: (file: File) => void }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <button type="button" disabled={disabled} onClick={() => input.current?.click()}>
        <Icon name={icon} size={15} /> {label}
      </button>
      <input
        ref={input}
        type="file"
        accept={ACCEPT_ATTRIBUTE}
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) onFile(file);
        }}
      />
    </>
  );
}

type Load = { kind: "loading" } | { kind: "error"; message: string } | { kind: "ready"; profile: MemberProfile; application: ApplicationOverview | null };

export default function Verification() {
  const [load, setLoad] = useState<Load>({ kind: "loading" });
  const [busySlot, setBusySlot] = useState<string | null>(null);
  const [slotError, setSlotError] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);

  const fetchAll = useCallback(async (signal?: AbortSignal) => {
    const [profileResult, applicationResult] = await Promise.allSettled([getProfile(signal), getApplication(signal)]);
    if (profileResult.status === "rejected") throw profileResult.reason;
    const application = applicationResult.status === "fulfilled" ? applicationResult.value : null;
    return { profile: profileResult.value.profile, application };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchAll(controller.signal)
      .then((data) => setLoad({ kind: "ready", ...data }))
      .catch((err) => {
        if (!controller.signal.aborted) setLoad({ kind: "error", message: errorMessage(err) });
      });
    return () => controller.abort();
  }, [fetchAll]);

  const reload = useCallback(async () => {
    try {
      setLoad({ kind: "ready", ...(await fetchAll()) });
    } catch (err) {
      setLoad({ kind: "error", message: errorMessage(err) });
    }
  }, [fetchAll]);

  if (load.kind === "loading") return <LoadingState rows={3} label="Loading your documents" />;
  if (load.kind === "error") {
    return (
      <ErrorState
        title="We couldn't load your documents"
        text={load.message}
        onRetry={() => {
          setLoad({ kind: "loading" });
          void reload();
        }}
      />
    );
  }

  const { profile, application } = load;
  const documentsStep = application?.progress.steps.find((s) => s.key === "documents");
  const locked = documentsStep?.state === "locked";

  async function handleFile(slot: Slot, type: DocumentType, file: File, replacing?: MemberDocument) {
    setNotice(null);
    const problem = checkFile(file);
    if (problem) {
      setSlotError((e) => ({ ...e, [slot.key]: problem }));
      return;
    }
    setSlotError((e) => ({ ...e, [slot.key]: "" }));
    setBusySlot(slot.key);
    try {
      await uploadDocument(type, file);
      if (replacing) await deleteDocument(replacing.id).catch(() => undefined);
      setNotice(`${slot.title}: ${file.name} uploaded. A reviewer will check it.`);
      await reload();
    } catch (err) {
      const message = err instanceof ApiError && err.fields.type ? fieldMessage("Document type", err.fields.type) : errorMessage(err);
      setSlotError((e) => ({ ...e, [slot.key]: message }));
    } finally {
      setBusySlot(null);
    }
  }

  return (
    <>
      <div className="workspace-title">
        <div>
          <span>Application · Step 2 of 6</span>
          <h1>Verification documents</h1>
          <p>Provide clear, current evidence for each verification check. PDF, JPG, PNG or WebP, up to {MAX_FILE_MB} MB each.</p>
        </div>
        {documentsStep && <StatusBadge tone={documentsStep.state === "complete" ? "green" : documentsStep.state === "action_needed" ? "amber" : "grey"}>{documentsStep.detail}</StatusBadge>}
      </div>

      {locked ? (
        <div style={{ display: "grid", gap: 18, maxWidth: 820 }}>
          <Notice tone="amber" title="Complete your profile first.">
            Your documents are checked against your profile details, so this step opens once your profile is complete.
          </Notice>
          <div>
            <ButtonLink to="/member/profile" variant="green" iconRight="arrow">
              Complete your profile
            </ButtonLink>
          </div>
        </div>
      ) : (
        <>
          <Notice tone="blue" title="Uploading is not the same as passing verification.">
            Each item is reviewed against the PSSA Verification Standard. We'll tell you if anything needs to be replaced. Your files are private: only you and PSSA reviewers can open them.
          </Notice>
          {notice && <Notice tone="green" title="File uploaded">{notice}</Notice>}

          <div className="document-grid">
            {SLOTS.map((slot) => {
              const latest = latestFor(profile.documents, slot.types.map((t) => t.type));
              const busy = busySlot === slot.key;
              const canReplace = latest && latest.status !== "accepted";
              const replaceType = (latest?.type as DocumentType) ?? slot.types[0].type;
              return (
                <article className="document-card" key={slot.key} aria-busy={busy}>
                  <div className="doc-card-top">
                    <span>
                      <Icon name={slot.icon} />
                    </span>
                    <div>{latest ? <Status of={DOCUMENT_STATUS} value={latest.status} /> : <StatusBadge tone="grey">Not uploaded</StatusBadge>}</div>
                  </div>
                  <h3>
                    {slot.title}
                    {slot.optional && <span className="doc-optional">Optional</span>}
                  </h3>
                  {latest ? (
                    <p className="doc-meta">
                      {latest.originalName} · uploaded {shortDate(latest.createdAt)}
                    </p>
                  ) : (
                    <p>{slot.hint}</p>
                  )}

                  <div className="doc-actions">
                    {latest && (
                      <a href={documentFileUrl(latest.id)} target="_blank" rel="noreferrer">
                        <Icon name="eye" size={15} /> View
                      </a>
                    )}
                    {busy ? (
                      <button type="button" disabled>
                        <span className="ui-spinner" aria-hidden="true" /> Uploading…
                      </button>
                    ) : latest ? (
                      canReplace && <UploadButton label="Replace" onFile={(f) => void handleFile(slot, replaceType, f, latest)} />
                    ) : (
                      slot.types.map((t) => (
                        <UploadButton
                          key={t.type}
                          label={slot.types.length > 1 ? `Upload ${t.label}` : "Upload"}
                          disabled={busySlot !== null}
                          onFile={(f) => void handleFile(slot, t.type, f)}
                        />
                      ))
                    )}
                  </div>

                  {latest?.status === "needs_resubmission" && (
                    <div className="doc-error" role="alert">
                      <Icon name="warning" size={16} />
                      <span>
                        <b>We couldn't accept this file.</b> {latest.reviewerNote ?? "Please upload a clearer, current copy."}
                      </span>
                    </div>
                  )}
                  {slotError[slot.key] && (
                    <div className="doc-error" role="alert">
                      <Icon name="warning" size={16} />
                      <span>{slotError[slot.key]}</span>
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          <Channels channels={profile.memberProfile.channels} onChanged={reload} />
        </>
      )}
    </>
  );
}

function Channels({ channels, onChanged }: { channels: Channel[]; onChanged: () => Promise<void> }) {
  const [adding, setAdding] = useState(false);
  const [platform, setPlatform] = useState("instagram");
  const [value, setValue] = useState("");
  const [addError, setAddError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [confirmError, setConfirmError] = useState<Record<string, string>>({});
  const [confirming, setConfirming] = useState<string | null>(null);

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    if (!value.trim()) {
      setAddError("Enter a handle, number or link.");
      return;
    }
    setSaving(true);
    setAddError(undefined);
    try {
      await addChannel(platform, value.trim());
      setValue("");
      setAdding(false);
      await onChanged();
    } catch (err) {
      const fields = err instanceof ApiError ? err.fields : {};
      setAddError(fields.url ? fieldMessage("That link", fields.url) : fields.handle ? fieldMessage("That handle", fields.handle) : errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function onConfirm(channel: Channel) {
    const code = codes[channel.id] ?? "";
    if (!/^\d{6}$/.test(code)) {
      setConfirmError((e) => ({ ...e, [channel.id]: "Enter the 6-digit code." }));
      return;
    }
    setConfirming(channel.id);
    setConfirmError((e) => ({ ...e, [channel.id]: "" }));
    try {
      await confirmChannel(channel.id, code);
      await onChanged();
    } catch (err) {
      const fields = err instanceof ApiError ? err.fields : {};
      setConfirmError((e) => ({ ...e, [channel.id]: fields.code ? fieldMessage("That code", fields.code) : errorMessage(err) }));
    } finally {
      setConfirming(null);
    }
  }

  return (
    <div className="channel-panel">
      <Panel
        icon="people"
        title="Channels you control"
        subtitle="Customers use these to confirm they're dealing with you. Confirm at least one."
        action={
          !adding && (
            <Button variant="outline" onClick={() => setAdding(true)}>
              Add channel
            </Button>
          )
        }
      >
        {channels.length === 0 && !adding && <p className="muted">No channels yet. Add the social pages, WhatsApp Business number or website you trade on.</p>}

        {channels.length > 0 && (
          <div className="channel-table">
            {channels.map((channel) => {
              const status = CHANNEL_STATUS[channel.status] ?? CHANNEL_STATUS.code_sent;
              return (
                <div key={channel.id}>
                  <span className="channel-icon" aria-hidden="true">
                    {platformLabel(channel.kind)[0]}
                  </span>
                  <b>{channel.value}</b>
                  <span>{platformLabel(channel.kind)}</span>
                  <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                  {channel.status === "code_sent" ? (
                    <div className="channel-confirm-cell">
                      <div className="channel-confirm">
                        <input
                          aria-label={`Confirmation code for ${channel.value}`}
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          maxLength={6}
                          placeholder="000000"
                          value={codes[channel.id] ?? ""}
                          onChange={(e) => setCodes((c) => ({ ...c, [channel.id]: e.target.value.replace(/\D/g, "").slice(0, 6) }))}
                        />
                        <Button variant="dark" loading={confirming === channel.id} onClick={() => void onConfirm(channel)}>
                          Confirm
                        </Button>
                      </div>
                      {confirmError[channel.id] && <small className="ui-error">{confirmError[channel.id]}</small>}
                    </div>
                  ) : (
                    <span />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {adding && (
          <form className="channel-add" onSubmit={onAdd} noValidate>
            <SelectField label="Platform" value={platform} onChange={(e) => setPlatform(e.target.value)} options={PLATFORMS} />
            <TextField label="Handle, number or link" placeholder="@yourpage or https://…" value={value} onChange={(e) => setValue(e.target.value)} error={addError} />
            <div style={{ display: "flex", gap: 8 }}>
              <Button type="submit" variant="green" loading={saving}>
                Add
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setAdding(false);
                  setAddError(undefined);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </Panel>
    </div>
  );
}
