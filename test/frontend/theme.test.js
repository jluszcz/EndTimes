// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initTheme, MovieEndTimeCalculator } from '../../public/script.js';

function renderShell() {
  document.documentElement.removeAttribute('data-theme');
  document.body.innerHTML = `
    <button id="theme-btn" title="Toggle theme"></button>
    <input id="movie-title" />
    <input id="start-time" />
    <select id="buffer-time"><option value="15">15</option></select>
    <button id="calculate-btn"></button>
    <div id="loading" class="hidden"></div>
    <div id="error" class="hidden"></div>
    <div id="results" class="hidden">
      <div id="movie-title-result"></div>
      <div id="movie-meta"></div>
      <div id="est-start-time"></div>
      <div id="est-end-time"></div>
    </div>
  `;
}

function stubStorage(impl) {
  vi.stubGlobal('localStorage', impl);
}

beforeEach(() => {
  renderShell();
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('initTheme', () => {
  it('applies the stored theme', () => {
    stubStorage({ getItem: () => 'dark', setItem: () => {} });

    initTheme();

    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('falls back to the system preference when nothing is stored', () => {
    stubStorage({ getItem: () => null, setItem: () => {} });
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));

    initTheme();

    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('toggles and persists on click', () => {
    const written = {};
    stubStorage({
      getItem: (key) => written[key] ?? null,
      setItem: (key, value) => {
        written[key] = value;
      },
    });

    initTheme();
    document.getElementById('theme-btn').click();

    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(written.theme).toBe('dark');
  });

  it('survives storage that throws on read', () => {
    // Safari private mode raises SecurityError on any storage access.
    stubStorage({
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {},
    });

    expect(() => initTheme()).not.toThrow();
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('survives storage that throws on write', () => {
    stubStorage({
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    });

    initTheme();

    expect(() => document.getElementById('theme-btn').click()).not.toThrow();
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('gives the toggle an accessible name', () => {
    stubStorage({ getItem: () => null, setItem: () => {} });

    initTheme();

    // The button's only content is an aria-hidden SVG, so without a label a
    // screen reader announces nothing.
    expect(document.getElementById('theme-btn').getAttribute('aria-label')).toBeTruthy();
  });
});

describe('app bootstrap', () => {
  it('builds the calculator even when the theme system fails', () => {
    // A storage exception must not stop the app being constructed — that was
    // the whole page going inert in Safari private mode.
    stubStorage({
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {},
    });

    initTheme();
    expect(() => new MovieEndTimeCalculator()).not.toThrow();
  });
});
