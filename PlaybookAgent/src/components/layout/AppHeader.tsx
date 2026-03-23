import { useState } from 'react';

export const APP_VERSION = '0.4.0';
const VERSION_SUMMARY = 'Agentic Runtime Foundation — Chat workspace, agent loop, tool execution, HitL approval, inline visualizations.';

export function AppHeader() {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <header className="app-header">
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
    </header>
  );
}
