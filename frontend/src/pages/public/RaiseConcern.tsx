import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { COMPLAINT_TYPES, MAX_EVIDENCE_FILES, realFieldErrors, submitComplaint, type ComplaintType } from "../../api/complaints";
import { ACCEPT_ATTRIBUTE, ACCEPTED_FILE_TYPES, MAX_FILE_MB } from "../../api/documents";
import { initials, searchRegister, type RegisterMember } from "../../api/register";
import { CERTIFICATE_PATTERN, normalizeCertificateNumber } from "../../api/verify";
import { Icon, type IconName } from "../../components/Icon";
import { SiteFooter } from "../../components/site/SiteFooter";
import { SiteHeader } from "../../components/site/SiteHeader";
import { ApiError, errorMessage } from "../../lib/api";

// Raise a concern: POST /api/complaints (docs/api-contract.md 6.8). Always free.
// The complainant never needs an account, a password or an ID upload.
// The member is chosen from the live register, or identified by a certificate number.

const TYPE_ICONS: Record<ComplaintType, IconName> = { misconduct: "flag", impersonation: "user", badge_misuse: "badge" };
const MAX_DESCRIPTION = 5000;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Who = { kind: "member"; member: RegisterMember } | { kind: "certificate"; number: string } | null;
type Errors = Partial<Record<"type" | "member" | "description" | "contactName" | "contactEmail" | "evidence" | "consent", string>>;

export default function RaiseConcern() {
  const [params] = useSearchParams();
  const [type, setType] = useState<ComplaintType | null>(null);
  const [who, setWho] = useState<Who>(() => {
    const cert = normalizeCertificateNumber(params.get("certificate") ?? "");
    return CERTIFICATE_PATTERN.test(cert) ? { kind: "certificate", number: cert } : null;
  });
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ reference: string | null; email: string } | null>(null);

  function validate(): Errors {
    const e: Errors = {};
    if (!type) e.type = "Choose what you'd like to report.";
    if (!who) e.member = "Find the member on the register, or enter the certificate number you were shown.";
    if (description.trim().length < 20) e.description = "Tell us what happened in a few sentences (at least 20 characters).";
    if (!contactName.trim()) e.contactName = "Enter your name.";
    if (!EMAIL.test(contactEmail.trim())) e.contactEmail = "Enter a valid email address. We'll use it to update you.";
    if (!consent) e.consent = "Please confirm you agree to PSSA using this information to handle your report.";
    return e;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length || !type || !who) {
      document.getElementById(`field-${Object.keys(found)[0]}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setSubmitting(true);
    try {
      const { referenceNumber } = await submitComplaint({
        type,
        description: description.trim(),
        contactName: contactName.trim(),
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim() || undefined,
        ...(who.kind === "member" ? { memberProfileId: who.member.id } : { certificateNumber: who.number }),
        consent,
        evidence: files,
      });
      setDone({ reference: referenceNumber, email: contactEmail.trim() });
      window.scrollTo({ top: 0 });
    } catch (err) {
      if (err instanceof ApiError) {
        const fields = realFieldErrors(err.fields);
        if (fields.member) setErrors((x) => ({ ...x, member: "We couldn't find that member. Search the register again or check the certificate number." }));
        if (fields.contactEmail) setErrors((x) => ({ ...x, contactEmail: "Enter a valid email address." }));
      }
      setSubmitError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="landing font-body">
      <SiteHeader />
      <main className="bg-soft">
        {done ? (
          <Confirmation reference={done.reference} email={done.email} />
        ) : (
          <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 sm:py-20 lg:grid-cols-[300px_1fr]">
            <aside className="self-start">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-green-dark">Complaints and concerns</p>
              <h1 className="mt-3 font-display text-4xl font-semibold text-navy">Tell us what happened.</h1>
              <p className="mt-3 text-muted">Reports are handled fairly and confidentially under the PSSA complaints process.</p>
              <div className="mt-6 flex gap-3 rounded-2xl bg-green-soft p-4">
                <span className="text-green-dark"><Icon name="check" /></span>
                <div>
                  <p className="font-semibold text-ink">There is no fee</p>
                  <p className="text-sm text-muted">Raising a concern or an appeal is always free.</p>
                </div>
              </div>
              <ul className="mt-6 space-y-2 text-sm text-muted">
                <li>We aim to acknowledge reports within 2 business days.</li>
                <li>The member gets 5 business days to respond.</li>
                <li>We aim to decide within 30 business days.</li>
              </ul>
              <Link to="/concern/track" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-green-dark">
                <Icon name="search" size={16} /> Already reported? Track your complaint
              </Link>
            </aside>

            <form onSubmit={onSubmit} noValidate className="space-y-8 rounded-2xl border border-line bg-white p-6 sm:p-8">
              {submitError && (
                <div role="alert" className="flex gap-3 rounded-xl bg-[#fdecea] p-4 text-sm">
                  <span className="text-[#b42318]"><Icon name="warning" /></span>
                  <div>
                    <p className="font-semibold text-ink">We couldn't send your report</p>
                    <p className="mt-1 text-muted">{submitError}</p>
                  </div>
                </div>
              )}

              <Section id="type" title="What would you like to report?" error={errors.type}>
                <div role="radiogroup" aria-label="Type of concern" className="grid gap-3 sm:grid-cols-3">
                  {COMPLAINT_TYPES.map((t) => {
                    const picked = type === t.value;
                    return (
                      <button
                        type="button"
                        role="radio"
                        aria-checked={picked}
                        key={t.value}
                        onClick={() => {
                          setType(t.value);
                          setErrors((x) => ({ ...x, type: undefined }));
                        }}
                        className={`rounded-xl border p-4 text-left transition ${picked ? "border-green bg-green-soft" : "border-line hover:border-green"}`}
                      >
                        <span className={picked ? "text-green-dark" : "text-muted"}><Icon name={TYPE_ICONS[t.value]} /></span>
                        <p className="mt-2 font-semibold text-ink">{t.label}</p>
                        <p className="text-sm text-muted">{t.hint}</p>
                      </button>
                    );
                  })}
                </div>
              </Section>

              <Section
                id="member"
                title={type === "impersonation" ? "Which member is being impersonated?" : "Which member is this about?"}
                error={errors.member}
              >
                <MemberPicker
                  who={who}
                  onChange={(next) => {
                    setWho(next);
                    setErrors((x) => ({ ...x, member: undefined }));
                  }}
                />
              </Section>

              <Section id="description" title="What happened?" error={errors.description}>
                <textarea
                  id="concern-description"
                  rows={6}
                  maxLength={MAX_DESCRIPTION}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Include dates, amounts, what was agreed, and any reply you received."
                  aria-invalid={errors.description ? true : undefined}
                  className="w-full rounded-xl border border-line p-4 outline-none focus:border-green"
                />
                <p className="mt-1 text-right text-xs text-muted">
                  {description.length.toLocaleString("en-ZA")} / {MAX_DESCRIPTION.toLocaleString("en-ZA")} characters
                </p>
              </Section>

              <Section id="evidence" title="Evidence (optional)" error={errors.evidence}>
                <EvidencePicker files={files} onChange={setFiles} onError={(message) => setErrors((x) => ({ ...x, evidence: message }))} />
              </Section>

              <Section title="Your contact details">
                <p className="-mt-2 mb-4 text-sm text-muted">
                  Only PSSA reviewers see these. We never share them with the member without your permission.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="contactName" label="Your full name" error={errors.contactName}>
                    <input
                      id="field-input-contactName"
                      autoComplete="name"
                      value={contactName}
                      maxLength={150}
                      onChange={(e) => setContactName(e.target.value)}
                      className="w-full rounded-xl border border-line px-4 py-3 outline-none focus:border-green"
                    />
                  </Field>
                  <Field id="contactEmail" label="Email address" error={errors.contactEmail}>
                    <input
                      id="field-input-contactEmail"
                      type="email"
                      autoComplete="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      className="w-full rounded-xl border border-line px-4 py-3 outline-none focus:border-green"
                    />
                  </Field>
                  <Field id="contactPhone" label="Phone number (optional)">
                    <input
                      id="field-input-contactPhone"
                      type="tel"
                      autoComplete="tel"
                      value={contactPhone}
                      maxLength={30}
                      onChange={(e) => setContactPhone(e.target.value)}
                      className="w-full rounded-xl border border-line px-4 py-3 outline-none focus:border-green"
                    />
                  </Field>
                </div>
              </Section>

              <div id="field-consent">
                <label className="flex items-start gap-3 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => {
                      setConsent(e.target.checked);
                      setErrors((x) => ({ ...x, consent: undefined }));
                    }}
                    className="mt-1 size-4 accent-[var(--color-green)]"
                  />
                  <span>
                    I agree to PSSA using this information to assess and manage my report. I've read the{" "}
                    <Link to="/policies/privacy" className="font-semibold text-green-dark underline">
                      Privacy policy
                    </Link>
                    .
                  </span>
                </label>
                {errors.consent && <p className="mt-2 text-sm font-semibold text-[#b42318]">{errors.consent}</p>}
              </div>

              <div className="flex flex-wrap items-center gap-4 border-t border-line pt-6">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-xl bg-navy px-6 py-3.5 font-semibold text-white hover:bg-navy-2 disabled:opacity-60"
                >
                  {submitting ? "Sending…" : "Submit report"} <Icon name="arrow" size={18} />
                </button>
                <p className="text-sm text-muted">You'll get a reference number to track it.</p>
              </div>
            </form>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

/* Pieces */

function Section({ id, title, error, children }: { id?: string; title: string; error?: string; children: ReactNode }) {
  return (
    <fieldset id={id ? `field-${id}` : undefined} className="scroll-mt-32">
      <legend className="mb-3 font-semibold text-navy">{title}</legend>
      {children}
      {error && <p className="mt-2 text-sm font-semibold text-[#b42318]">{error}</p>}
    </fieldset>
  );
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div id={`field-${id}`} className="scroll-mt-32">
      <label htmlFor={`field-input-${id}`} className="mb-1.5 block text-sm font-semibold text-ink">
        {label}
      </label>
      {children}
      {error && <p className="mt-1.5 text-sm font-semibold text-[#b42318]">{error}</p>}
    </div>
  );
}

function MemberPicker({ who, onChange }: { who: Who; onChange: (who: Who) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RegisterMember[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [useNumber, setUseNumber] = useState(false);
  const [number, setNumber] = useState("");
  const [numberError, setNumberError] = useState<string | null>(null);

  if (who) {
    return (
      <div className="flex items-center gap-4 rounded-xl border border-green bg-green-soft p-4">
        {who.kind === "member" ? (
          <>
            <span className="flex size-10 items-center justify-center rounded-full bg-white font-semibold text-green-dark">{initials(who.member.name)}</span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">{who.member.name}</p>
              <p className="truncate text-sm text-muted">{[who.member.tradingName, who.member.scope].filter(Boolean).join(" · ")}</p>
            </div>
          </>
        ) : (
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted">Certificate number</p>
            <p className="font-mono font-semibold text-ink">{who.number}</p>
          </div>
        )}
        <button type="button" onClick={() => onChange(null)} className="text-sm font-semibold text-green-dark underline">
          Change
        </button>
      </div>
    );
  }

  async function search() {
    const q = query.trim();
    if (q.length < 2) {
      setSearchError("Type at least 2 letters of their name or trading name.");
      return;
    }
    setSearching(true);
    setSearchError(null);
    try {
      const page = await searchRegister(q, { pageSize: 8 });
      setResults(page.items);
    } catch (err) {
      setSearchError(errorMessage(err));
    } finally {
      setSearching(false);
    }
  }

  function applyCertificate() {
    const value = normalizeCertificateNumber(number);
    if (!CERTIFICATE_PATTERN.test(value)) {
      setNumberError("Certificate numbers look like PSSA-2026-004821.");
      return;
    }
    onChange({ kind: "certificate", number: value });
  }

  if (useNumber) {
    return (
      <div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            aria-label="Certificate number"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), applyCertificate())}
            placeholder="PSSA-2026-004821"
            className="flex-1 rounded-xl border border-line px-4 py-3 font-mono uppercase outline-none focus:border-green"
          />
          <button type="button" onClick={applyCertificate} className="rounded-xl border border-line px-5 py-3 font-semibold text-navy hover:border-green">
            Use this number
          </button>
        </div>
        {numberError && <p className="mt-2 text-sm font-semibold text-[#b42318]">{numberError}</p>}
        <button type="button" onClick={() => setUseNumber(false)} className="mt-3 text-sm font-semibold text-green-dark underline">
          Search by name instead
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex flex-1 items-center gap-3 rounded-xl border border-line px-4 focus-within:border-green">
          <span className="text-muted"><Icon name="search" /></span>
          <input
            aria-label="Member name or trading name"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), search())}
            placeholder="Name or trading name"
            className="w-full bg-transparent py-3 outline-none"
          />
        </div>
        <button type="button" onClick={search} disabled={searching} className="rounded-xl border border-line px-5 py-3 font-semibold text-navy hover:border-green disabled:opacity-60">
          {searching ? "Searching…" : "Search the register"}
        </button>
      </div>
      {searchError && <p className="mt-2 text-sm font-semibold text-[#b42318]">{searchError}</p>}
      {results && results.length === 0 && (
        <p className="mt-3 rounded-xl bg-soft p-4 text-sm text-muted">
          No member matches "{query.trim()}". If you have a certificate number, use that instead.
        </p>
      )}
      {results && results.length > 0 && (
        <ul className="mt-3 divide-y divide-line rounded-xl border border-line">
          {results.map((m) => (
            <li key={m.id}>
              <button type="button" onClick={() => onChange({ kind: "member", member: m })} className="flex w-full items-center gap-3 p-3 text-left hover:bg-soft">
                <span className="flex size-9 items-center justify-center rounded-full bg-green-soft text-sm font-semibold text-green-dark">{initials(m.name)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-ink">{m.name}</span>
                  <span className="block truncate text-sm text-muted">{[m.tradingName, m.scope].filter(Boolean).join(" · ")}</span>
                </span>
                <span className="text-sm font-semibold text-green-dark">Select</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <button type="button" onClick={() => setUseNumber(true)} className="mt-3 text-sm font-semibold text-green-dark underline">
        I have a certificate number instead
      </button>
    </div>
  );
}

function EvidencePicker({ files, onChange, onError }: { files: File[]; onChange: (files: File[]) => void; onError: (message: string | undefined) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  function add(list: FileList | null) {
    if (!list) return;
    const picked = Array.from(list);
    for (const file of picked) {
      if (!ACCEPTED_FILE_TYPES.includes(file.type)) return onError(`"${file.name}" isn't a PDF, JPG, PNG or WebP file.`);
      if (file.size > MAX_FILE_MB * 1024 * 1024) return onError(`"${file.name}" is larger than ${MAX_FILE_MB} MB.`);
    }
    const next = [...files, ...picked].slice(0, MAX_EVIDENCE_FILES);
    onError(files.length + picked.length > MAX_EVIDENCE_FILES ? `You can attach up to ${MAX_EVIDENCE_FILES} file${MAX_EVIDENCE_FILES === 1 ? "" : "s"}.` : undefined);
    onChange(next);
  }

  return (
    <div>
      {files.length > 0 && (
        <ul className="mb-3 space-y-2">
          {files.map((file, i) => (
            <li key={`${file.name}-${i}`} className="flex items-center gap-3 rounded-xl border border-line p-3 text-sm">
              <span className="text-muted"><Icon name="file" size={18} /></span>
              <span className="min-w-0 flex-1 truncate text-ink">{file.name}</span>
              <button
                type="button"
                onClick={() => {
                  onChange(files.filter((_, j) => j !== i));
                  onError(undefined);
                }}
                className="font-semibold text-[#b42318]"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      {files.length < MAX_EVIDENCE_FILES && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center gap-1 rounded-xl border-2 border-dashed border-line p-6 text-center hover:border-green"
        >
          <span className="text-muted"><Icon name="upload" size={24} /></span>
          <span className="font-semibold text-ink">Choose a file</span>
          <span className="text-sm text-muted">Receipts, messages or screenshots · PDF, JPG, PNG or WebP · up to {MAX_FILE_MB} MB</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        hidden
        accept={ACCEPT_ATTRIBUTE}
        multiple={MAX_EVIDENCE_FILES > 1}
        onChange={(e) => {
          add(e.target.files);
          e.target.value = "";
        }}
      />
      <p className="mt-2 text-xs text-muted">Evidence is private: only PSSA reviewers can open it.</p>
    </div>
  );
}

function Confirmation({ reference, email }: { reference: string | null; email: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mx-auto max-w-2xl px-6 py-16 sm:py-24">
      <section className="rounded-2xl border border-line bg-white p-8 text-center sm:p-10">
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-green-soft text-green-dark">
          <Icon name="check" size={32} />
        </span>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.22em] text-green-dark">Report received</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-navy">Thank you. We've received your concern.</h1>
        <p className="mt-3 text-muted">
          We'll contact you at <b className="text-ink">{email}</b>. We aim to acknowledge reports within 2 business days.
        </p>
        {reference && (
          <div className="mx-auto mt-6 max-w-sm rounded-xl bg-soft p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Your reference number</p>
            <p className="mt-1 font-mono text-2xl font-semibold text-navy">{reference}</p>
            <button
              type="button"
              onClick={() =>
                navigator.clipboard
                  .writeText(reference)
                  .then(() => setCopied(true))
                  .catch(() => setCopied(false))
              }
              className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-green-dark"
            >
              <Icon name={copied ? "check" : "copy"} size={16} /> {copied ? "Copied" : "Copy"}
            </button>
          </div>
        )}
        <p className="mt-6 text-sm text-muted">Keep your reference number. You'll need it and your email address to check progress.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/concern/track" state={{ reference }} className="rounded-xl bg-navy px-6 py-3 font-semibold text-white hover:bg-navy-2">
            Track this complaint
          </Link>
          <Link to="/" className="rounded-xl border border-line px-6 py-3 font-semibold text-navy hover:border-green">
            Back to home
          </Link>
        </div>
      </section>
    </div>
  );
}
