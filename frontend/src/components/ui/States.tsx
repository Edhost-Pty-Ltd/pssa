import type { ReactNode } from "react";
import { Icon, type IconName } from "../Icon";
import { Button } from "./Button";
import "./ui.css";

interface StateProps {
  icon?: IconName;
  title: string;
  text?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon = "search", title, text, actionLabel, onAction }: StateProps) {
  return (
    <div className="empty-state">
      <span>
        <Icon name={icon} size={28} />
      </span>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {actionLabel && onAction && <Button onClick={onAction}>{actionLabel}</Button>}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  text = "We couldn't load this right now. Please try again.",
  onRetry,
}: {
  title?: string;
  text?: ReactNode;
  onRetry?: () => void;
}) {
  return (
    <div className="empty-state error-state" role="alert">
      <span>
        <Icon name="warning" size={28} />
      </span>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function LoadingState({ rows = 3, label = "Loading" }: { rows?: number; label?: string }) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">{label}…</span>
      {Array.from({ length: rows }, (_, i) => (
        <div className="ui-skeleton-row skeleton" key={i} aria-hidden="true">
          <div className="sk sk-avatar" />
          <div className="sk-lines">
            <i />
            <i />
            <i />
          </div>
        </div>
      ))}
    </div>
  );
}
