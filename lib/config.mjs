/**
 * Configuration loader — reads from .env file or environment variables
 */
import fs from 'fs';
import path from 'path';

let _config = null;

export function loadConfig(configPath) {
  if (_config) return _config;

  // Try to load .env file
  const envPath = configPath || path.resolve(process.cwd(), '.env');
  const env = {};

  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      env[key] = value;
    }
  }

  // Merge with process.env (process.env takes precedence)
  const get = (key, fallback = '') => process.env[key] || env[key] || fallback;

  _config = {
    atlassian: {
      domain: get('ATLASSIAN_DOMAIN'),
      email: get('ATLASSIAN_EMAIL'),
      token: get('ATLASSIAN_API_TOKEN'),
      get auth() {
        return Buffer.from(`${this.email}:${this.token}`).toString('base64');
      },
    },
    screenshot: {
      baseUrl: get('APP_BASE_URL'),
      dir: get('SCREENSHOT_DIR', './screenshots'),
      width: parseInt(get('SCREENSHOT_WIDTH', '1440'), 10),
      height: parseInt(get('SCREENSHOT_HEIGHT', '900'), 10),
      scale: parseInt(get('SCREENSHOT_SCALE', '2'), 10),
    },
    auth: {
      email: get('AUTH_EMAIL'),
      password: get('AUTH_PASSWORD'),
      provider: get('AUTH_PROVIDER', 'clerk'),
    },
  };

  return _config;
}

export function resetConfig() {
  _config = null;
}
