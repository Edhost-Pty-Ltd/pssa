import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link, type LinkProps } from "react-router-dom";
import { Icon, type IconName } from "../Icon";
import "./ui.css";

export type ButtonVariant = "dark" | "green" | "light" | "ghost" | "outline";

interface Common {
  variant?: ButtonVariant;
  full?: boolean;
  icon?: IconName;
  iconRight?: IconName;
  children: ReactNode;
}

function classes(variant: ButtonVariant, full?: boolean, extra?: string) {
  return ["btn", `btn-${variant}`, full ? "btn-full" : "", extra ?? ""].filter(Boolean).join(" ");
}

function Content({ icon, iconRight, loading, children }: Pick<Common, "icon" | "iconRight" | "children"> & { loading?: boolean }) {
  return (
    <>
      {loading ? <span className="ui-spinner" aria-hidden="true" /> : icon && <Icon name={icon} size={18} />}
      {children}
      {iconRight && !loading && <Icon name={iconRight} size={18} />}
    </>
  );
}

type ButtonProps = Common & ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean };

export function Button({ variant = "dark", full, icon, iconRight, loading, disabled, className, children, type = "button", ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={classes(variant, full, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      <Content icon={icon} iconRight={iconRight} loading={loading}>
        {children}
      </Content>
    </button>
  );
}

type ButtonLinkProps = Common & Omit<LinkProps, "children">;

export function ButtonLink({ variant = "dark", full, icon, iconRight, className, children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={classes(variant, full, className)} {...rest}>
      <Content icon={icon} iconRight={iconRight}>
        {children}
      </Content>
    </Link>
  );
}
