import type { ReactNode } from "react";
import { Icon, type IconName } from "../Icon";
import { Button } from "./Button";
import "./ui.css";

// Empty, error and loading states. Every list or page that loads data should use one of these
// instead of showing nothing (see docs/api-contract.md and the phase "done when" lines).

interface StateProps {
  icon?: IconName;
  title: string;
  text?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

/** Nothing to show yet, e.g. no documents uploaded or no search results. */
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

/** Something went wrong loading data. Pass `onRetry` to offer "Try again". */
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

/** Grey placeholder rows while a list loads. */
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
