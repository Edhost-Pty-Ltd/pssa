import type { ReactNode } from "react";
import type { StatusMap } from "./statuses";

export type StatusTone = "green" | "amber" | "red" | "grey" | "blue";

export function StatusBadge({ tone = "green", children }: { tone?: StatusTone; children: ReactNode }) {
  return (
    <span className={`status status-${tone}`}>
      <span className="status-dot" aria-hidden="true" />
      {children}
    </span>
  );
}

export function Status({ of, value }: { of: StatusMap; value: string }) {
  const match = of[value] ?? { label: value, tone: "grey" as const };
  return <StatusBadge tone={match.tone}>{match.label}</StatusBadge>;
}
