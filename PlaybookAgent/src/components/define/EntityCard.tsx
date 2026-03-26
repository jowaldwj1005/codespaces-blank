/**
 * EntityCard — Reusable visual card for agents, tools, instructions, and playbooks.
 * Shows key info at a glance with inline actions.
 */

interface EntityCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  meta?: string;
  badges?: Array<{ label: string; color?: string }>;
  selected?: boolean;
  onClick?: () => void;
  actions?: Array<{ label: string; onClick: () => void; variant?: 'primary' | 'danger' | 'default' }>;
  children?: React.ReactNode;
}

export function EntityCard({ icon, title, subtitle, meta, badges, selected, onClick, actions, children }: EntityCardProps) {
  return (
    <div
      className={`entity-card ${selected ? 'entity-card--selected' : ''} ${onClick ? 'entity-card--clickable' : ''}`}
      onClick={onClick}
    >
      <div className="entity-card__header">
        <span className="entity-card__icon">{icon}</span>
        <div className="entity-card__info">
          <span className="entity-card__title">{title}</span>
          {subtitle && <span className="entity-card__subtitle">{subtitle}</span>}
        </div>
        {meta && <span className="entity-card__meta">{meta}</span>}
      </div>

      {badges && badges.length > 0 && (
        <div className="entity-card__badges">
          {badges.map((b, i) => (
            <span key={i} className="entity-card__badge" style={b.color ? { borderColor: b.color, color: b.color } : undefined}>
              {b.label}
            </span>
          ))}
        </div>
      )}

      {children && <div className="entity-card__body">{children}</div>}

      {actions && actions.length > 0 && (
        <div className="entity-card__actions">
          {actions.map((a, i) => (
            <button
              key={i}
              className={`entity-card__action entity-card__action--${a.variant ?? 'default'}`}
              onClick={e => { e.stopPropagation(); a.onClick(); }}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
