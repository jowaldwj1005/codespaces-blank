import { useState } from 'react';
import type { RightPanel } from '../../App';

export const APP_VERSION = '0.8.0';
const VERSION_SUMMARY = 'SemanticRenderer, Artifact Browser, Case Dashboard, Playbook Progress, structured HitL approval forms.';

interface AppHeaderProps {
  rightPanel: RightPanel;
  onTogglePanel: (panel: RightPanel) => void;
}

const PANEL_BUTTONS: Array<{ panel: RightPanel; label: string; icon: string }> = [
  { panel: 'seed', label: 'Seed', icon: '🌱' },
  { panel: 'agent-config', label: 'Config', icon: '⚙️' },
  { panel: 'artifacts', label: 'Artifacts', icon: '📦' },
  { panel: 'case-detail', label: 'Cases', icon: '📋' },
];

export function AppHeader({ rightPanel, onTogglePanel }: AppHeaderProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <header className="app-header">
      <div className="app-header__left">
        <h1 className="app-header__title">Playbook Agent</h1>
        <div
          className="app-header__version"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <span className="app-header__badge">v{APP_VERSION}</span>
          {showTooltip && (
            <div className="app-header__tooltip">
              <strong>v{APP_VERSION}</strong>
              <span>{VERSION_SUMMARY}</span>
              <span className="app-header__tooltip-hint">See docs/VERSIONS.md for details & questions</span>
            </div>
          )}
        </div>
      </div>

      <div className="app-header__right">
        {PANEL_BUTTONS.map(({ panel, label, icon }) => (
          <button
            key={panel}
            className={`header-panel-btn ${rightPanel === panel ? 'header-panel-btn--active' : ''}`}
            onClick={() => onTogglePanel(panel)}
            title={label}
          >
            <span className="header-panel-btn__icon">{icon}</span>
            <span className="header-panel-btn__label">{label}</span>
          </button>
        ))}
      </div>
    </header>
  );
}
