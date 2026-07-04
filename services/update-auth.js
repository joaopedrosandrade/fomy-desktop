const fs = require('fs');
const path = require('path');

const AUTH_PATH = path.join(__dirname, '..', 'config', 'update-auth.json');
const AUTH_EXAMPLE_PATH = path.join(__dirname, '..', 'config', 'update-auth.example.json');

/** @returns {{ private: boolean, token: string | null }} */
function loadUpdateAuth() {
  const candidates = [AUTH_PATH, AUTH_EXAMPLE_PATH];

  for (const filePath of candidates) {
    try {
      if (fs.existsSync(filePath)) {
        const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        return {
          private: Boolean(parsed.private),
          token: parsed.token || null,
        };
      }
    } catch {
      // tenta próximo arquivo
    }
  }

  return { private: false, token: null };
}

module.exports = {
  loadUpdateAuth,
};
