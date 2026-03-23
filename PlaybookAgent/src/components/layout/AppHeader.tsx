const APP_VERSION = '0.4.0';

export function AppHeader() {
  return (
    <header className="app-header">
      <h1 className="app-header__title">Playbook Agent</h1>
      <span className="app-header__badge">v{APP_VERSION}</span>
    </header>
  );
}
