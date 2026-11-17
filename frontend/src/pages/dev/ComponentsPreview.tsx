import { useState } from "react";
import {
  APPLICATION_STATUS,
  Button,
  ButtonLink,
  Card,
  COMPLAINT_STATUS,
  DOCUMENT_STATUS,
  EmptyState,
  ErrorState,
  LoadingState,
  MEMBER_STATUS,
  Notice,
  Panel,
  SelectField,
  Status,
  TextArea,
  TextField,
} from "../../components/ui";

// Development only: every shared component in one place, at /dev/components.
// Example text only; no member data.
export default function ComponentsPreview() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <main style={{ background: "var(--soft)", minHeight: "100vh", padding: "48px 24px" }}>
      <div style={{ maxWidth: 960, margin: "0 auto", display: "grid", gap: 24 }}>
        <header>
          <p className="kicker">Development only</p>
          <h1 style={{ margin: "8px 0" }}>Shared components</h1>
          <p className="muted">Import from <code>src/components/ui</code>. Styles come from the Figma design.</p>
        </header>

        <Panel icon="badge" title="Buttons" subtitle="Button for actions, ButtonLink for moving to another page">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <Button>Dark</Button>
            <Button variant="green" iconRight="arrow">Green</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="green" loading={loading} onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 1500); }}>
              Click to see loading
            </Button>
            <Button disabled>Disabled</Button>
            <ButtonLink to="/" variant="outline" icon="home">Link to home</ButtonLink>
          </div>
        </Panel>

        <Panel icon="check" title="Status badges" subtitle="Values from docs/api-contract.md, section 4">
          {[
            ["Application", APPLICATION_STATUS],
            ["Document", DOCUMENT_STATUS],
            ["Member", MEMBER_STATUS],
            ["Complaint", COMPLAINT_STATUS],
          ].map(([name, map]) => (
            <div key={name as string} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <b style={{ width: 110, fontSize: 13 }}>{name as string}</b>
              {Object.keys(map).map((value) => (
                <Status key={value} of={map as typeof MEMBER_STATUS} value={value} />
              ))}
            </div>
          ))}
        </Panel>

        <Panel icon="file" title="Form fields" subtitle="Label, control, hint or error">
          <div style={{ display: "grid", gap: 0 }}>
            <TextField label="Email address" type="email" icon="mail" placeholder="you@example.co.za" hint="We'll send a one-time code." required />
            <TextField label="Trading name" error="Enter your trading name." />
            <SelectField
              label="Evidence route"
              placeholder="Choose a route"
              options={[
                { value: "individual", label: "Individual or sole trader" },
                { value: "business", label: "Registered business" },
                { value: "overseas", label: "Overseas applicant" },
                { value: "new_trader", label: "New trader" },
              ]}
            />
            <TextArea label="What happened?" maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} />
            <TextField label="Disabled field" disabled value="Can't be edited" readOnly />
          </div>
        </Panel>

        <Card>
          <h3 style={{ marginBottom: 14 }}>Notices</h3>
          <Notice tone="blue" title="Uploading is not the same as passing verification.">Each item is reviewed against the verification standard.</Notice>
          <Notice tone="green" title="Saved.">Your changes have been saved.</Notice>
          <Notice tone="amber" title="Action needed.">One document needs to be replaced.</Notice>
          <Notice tone="red" title="We couldn't save your changes.">Please try again.</Notice>
        </Card>

        <EmptyState icon="file" title="No documents yet" text="Upload your ID to start verification." actionLabel="Upload a document" onAction={() => {}} />
        <ErrorState onRetry={() => {}} />
        <LoadingState rows={2} />
      </div>
    </main>
  );
}
