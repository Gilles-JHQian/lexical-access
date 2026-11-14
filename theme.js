// Inlined before the stylesheet by site_template.py, including offline previews.
(() => {
  'use strict';
  const key = 'lexical-access:theme';
  const root = document.documentElement;
  const system = matchMedia('(prefers-color-scheme: dark)');
  const valid = value => value === 'light' || value === 'dark' ? value : 'system';
  let storage, preference = 'system';
  try { storage = window.localStorage; preference = valid(storage.getItem(key)); } catch {}

  function apply() {
    const theme = preference === 'system' ? (system.matches ? 'dark' : 'light') : preference;
    root.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#18232e' : '#ffffff';
    document.querySelectorAll('[data-theme-choice]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.themeChoice === preference));
    });
  }
  apply();
  system.addEventListener('change', () => { if (preference === 'system') apply(); });
  window.addEventListener('storage', event => {
    if (event.storageArea === storage && (event.key === key || event.key === null)) {
      preference = valid(event.newValue); apply();
    }
  });
  document.addEventListener('DOMContentLoaded', () => {
    const control = document.querySelector('.theme-switch');
    control.hidden = false;
    apply();
    control.addEventListener('click', event => {
      const button = event.target.closest('[data-theme-choice]');
      if (!button || !control.contains(button)) return;
      preference = valid(button.dataset.themeChoice);
      try {
        if (preference === 'system') storage?.removeItem(key);
        else storage?.setItem(key, preference);
      } catch {}
      apply();
    });
  });
})();
