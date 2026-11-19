import type { ReactNode } from "react";
import { Icon, type IconName } from "../Icon";
import "./ui.css";

export type NoticeTone = "blue" | "green" | "amber" | "red";

const ICONS: Record<NoticeTone, IconName> = { blue: "shield", green: "check", amber: "warning", red: "warning" };

export function Notice({ tone = "blue", title, icon, children }: { tone?: NoticeTone; title: string; icon?: IconName; children?: ReactNode }) {
  return (
    <div className={`notice ${tone}`} role={tone === "red" ? "alert" : "status"}>
      <Icon name={icon ?? ICONS[tone]} />
      <div>
        <b>{title}</b>
        {children && <p>{children}</p>}
      </div>
    </div>
  );
}
