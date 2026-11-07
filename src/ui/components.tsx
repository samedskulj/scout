import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useHealth } from "./api.ts";
import { BrandMark } from "./BrandMark.tsx";
import { ThemeToggle } from "./theme.tsx";

export { BrandMark };

export type Tone = "neutral" | "good" | "warn" | "bad" | "info" | "accent";

export function Badge({ tone = "neutral", title, children }: { tone?: Tone; title?: string; children: ReactNode }) {
  return (
    <span className={`badge badge-${tone}`} title={title}>
      {children}
    </span>
  );
}

export function Button({
  variant = "primary",
  loading = false,
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost"; loading?: boolean }) {
  return (
    <button className={`btn btn-${variant}`} disabled={disabled || loading} {...rest}>
      {loading && <span className="spinner" aria-hidden />}
      {children}
    </button>
  );
}

export function Card({ title, actions, children }: { title?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="card">
      {(title || actions) && (
        <header className="card-head">
          {title && <h2>{title}</h2>}
          {actions && <div className="row">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function ErrorNote({ message }: { message?: string }) {
  return message ? (
    <p className="error-note" role="alert">
      {message}
    </p>
  ) : null;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}

export interface Option<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
  hint?: string;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={o.value === value}
          className={o.value === value ? "active" : ""}
          disabled={o.disabled}
          title={o.hint}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Shown only when the server has no AI key; nothing is shown in normal operation. */
function ModeBadge() {
  const health = useHealth();
  if (!health || health.live) return null;
  return (
    <span className="engine">
      <Badge tone="warn" title="Add ANTHROPIC_API_KEY to the server's .env">
        <span className="dot" aria-hidden /> AI not configured
      </Badge>
    </span>
  );
}

export function AppShell<T extends string>({
  title,
  tagline,
  tabs,
  activeTab,
  onTabChange,
  account,
  children,
}: {
  title: string;
  tagline: string;
  tabs?: Option<T>[];
  activeTab?: T;
  onTabChange?: (tab: T) => void;
  account?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="shell">
      <header className="masthead">
        <div className="brand">
          <Link href="/" className="brand-home" aria-label="Scout Copilot home"><BrandMark /></Link>
          <div>
            <h1>{title}</h1>
            <p>{tagline}</p>
          </div>
        </div>
        <nav className="tabs" aria-label="Views">
          {tabs?.map((t) => (
            <button
              key={t.value}
              className={t.value === activeTab ? "active" : ""}
              aria-current={t.value === activeTab ? "page" : undefined}
              onClick={() => onTabChange?.(t.value)}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <ModeBadge />
        <ThemeToggle className="masthead-theme" />
        {account}
      </header>
      <main>{children}</main>
    </div>
  );
}
