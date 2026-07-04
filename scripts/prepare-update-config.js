/**
 * Gera configuração de autenticação para updates em repositório privado.
 * Executado no CI antes do build (release.yml).
 *
 * Crie o secret GH_UPDATE_TOKEN no GitHub:
 * Settings → Secrets → Actions → New repository secret
 * Token: fine-grained PAT com permissão Read-only em Contents/Releases.
 */
const fs = require('fs');
const path = require('path');

const outputPath = path.join(__dirname, '..', 'config', 'update-auth.json');
const token = process.env.GH_UPDATE_TOKEN || '';
const isPrivate = process.env.GITHUB_REPO_PRIVATE === 'true' || Boolean(token);

const config = {
  private: isPrivate,
  token: token || null,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(config, null, 2));

if (isPrivate && !token) {
  console.warn(
    '[update-config] AVISO: repositório privado sem GH_UPDATE_TOKEN. '
    + 'Updates no app instalado não funcionarão até configurar o secret ou tornar o repo público.',
  );
} else if (token) {
  console.log('[update-config] Token de update configurado para repositório privado.');
} else {
  console.log('[update-config] Modo público (sem token).');
}
