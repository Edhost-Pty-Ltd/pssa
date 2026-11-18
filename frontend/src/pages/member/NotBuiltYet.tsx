import { EmptyState } from "../../components/ui";

// Placeholder for member sections planned in later tasks or phases.
export default function NotBuiltYet({ title, when }: { title: string; when: string }) {
  return (
    <>
      <div className="workspace-title">
        <div>
          <span>Member portal</span>
          <h1>{title}</h1>
        </div>
      </div>
      <EmptyState icon="clock" title="Coming soon" text={`This section is part of ${when}.`} />
    </>
  );
}
