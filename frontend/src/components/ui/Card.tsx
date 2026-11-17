import type { ReactNode } from "react";
import { Icon, type IconName } from "../Icon";
import "./ui.css";

/** A white card with a border. Set `pad` for the standard inner spacing. */
export function Card({ pad = true, className = "", children }: { pad?: boolean; className?: string; children: ReactNode }) {
  return <section className={`ui-card ${pad ? "pad" : ""} ${className}`.trim()}>{children}</section>;
}

/** A card with a heading row (icon, title, subtitle, and an optional action on the right), as in the design's panels. */
export function Panel({
  icon,
  title,
  subtitle,
  action,
  children,
}: {
  icon?: IconName;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card>
      <div className="panel-head">
        <div>
          {icon && (
            <span className="panel-icon">
              <Icon name={icon} size={18} />
            </span>
          )}
          <div>
            <h3>{title}</h3>
            {subtitle && <p>{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      <div className="ui-card-body">{children}</div>
    </Card>
  );
}
