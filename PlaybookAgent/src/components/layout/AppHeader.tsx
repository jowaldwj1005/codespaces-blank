import { useState } from 'react';

export const APP_VERSION = '0.12.0';
const VERSION_SUMMARY = 'Chat toolbar, interactive cards, agent loop registry, bidirectional artifacts.';

export function AppHeader() {
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
              <span className="app-header__tooltip-hint">See docs/VERSIONS.md for details</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
