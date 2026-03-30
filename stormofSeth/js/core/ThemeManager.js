/**
 * ThemeManager - Load and apply visual themes
 *
 * Themes are self-contained JSON packages that define:
 *   - Color palette (CSS variables)
 *   - Symbol definitions (type, colors, image paths, paytable)
 *   - Grid configuration
 *   - Feature settings
 *   - Payline layout
 *   - UI text and win thresholds
 *
 * To create a new theme for another game studio:
 *   1. Copy themes/egyptian.json as a template
 *   2. Set your symbol image paths in each symbol's "image" field
 *   3. Adjust colors, paylines, and feature settings
 *   4. Load your theme via ThemeManager.loadAndApply()
 *
 * Godot equivalent: A Resource (.tres) file per theme, containing
 * an exported Dictionary with all theme data, loaded via ResourceLoader.
 */

class ThemeManager {
  constructor() {
    this.themes = {};
    this.current = null;
    this.currentId = null;
    this._listeners = [];
  }

  /**
   * Register listener for theme changes
   */
  onChange(fn) {
    this._listeners.push(fn);
  }

  /**
   * Load a theme from JSON URL and register it
   */
  async load(id, url) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to load theme: ${url}`);
      const theme = await res.json();
      theme.id = id;
      this.themes[id] = theme;
      return theme;
    } catch (err) {
      console.error('ThemeManager.load error:', err);
      return null;
    }
  }

  /**
   * Register an inline theme object (no fetch needed)
   */
  register(id, themeData) {
    this.themes[id] = { ...themeData, id };
  }

  /**
   * Apply a loaded theme - updates CSS variables and notifies listeners
   */
  apply(id) {
    const theme = this.themes[id];
    if (!theme) {
      console.error(`Theme "${id}" not loaded`);
      return false;
    }

    this.current = theme;
    this.currentId = id;
    this._applyCSSVars(theme.colors, theme.fonts);
    this._listeners.forEach(fn => fn(theme));
    return true;
  }

  /**
   * Load and apply in one step
   */
  async loadAndApply(id, url) {
    const theme = await this.load(id, url);
    if (theme) this.apply(id);
    return theme;
  }

  /**
   * Get current theme
   */
  get() {
    return this.current;
  }

  /**
   * Get available theme IDs
   */
  getAvailable() {
    return Object.keys(this.themes);
  }

  _applyCSSVars(colors, fonts) {
    const root = document.documentElement;

    // Apply color variables
    for (const [key, value] of Object.entries(colors || {})) {
      const varName = `--color-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
      root.style.setProperty(varName, value);
    }

    // Apply font variables
    if (fonts) {
      if (fonts.title) root.style.setProperty('--font-title', fonts.title);
      if (fonts.ui) root.style.setProperty('--font-ui', fonts.ui);
      if (fonts.numbers) root.style.setProperty('--font-numbers', fonts.numbers);
    }
  }
}
