import { EmptyState } from "../../components/ui";

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
