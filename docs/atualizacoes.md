# Atualizações automáticas — Fomy Desktop

O Fomy Desktop usa **electron-updater** + **GitHub Releases** para notificar e instalar novas versões.

## Como funciona para o usuário

1. Ao abrir o app, após ~8 segundos, verifica silenciosamente se há atualização.
2. Se houver versão nova → diálogo **"Atualização disponível"** com opção de baixar e instalar.
3. Menu **Sistema → Verificar Atualização** faz a checagem manual a qualquer momento.
4. Após o download → diálogo **"Reiniciar agora"** para aplicar a atualização.

## Publicar uma nova versão

### Opção A — Automática (recomendada)

1. Atualize a versão em `package.json`:
   ```json
   "version": "1.0.1"
   ```

2. Commit e crie a tag:
   ```bash
   git add package.json
   git commit -m "chore: versão 1.0.1"
   git tag v1.0.1
   git push origin master
   git push origin v1.0.1
   ```

3. O GitHub Actions (`.github/workflows/release.yml`) vai:
   - Gerar o instalador Windows
   - Publicar no **GitHub Releases** com `latest.yml` (necessário para o auto-update)

### Opção B — Manual no seu PC

1. Atualize `"version"` em `package.json`.

2. Defina um token do GitHub com permissão `repo`:
   - Crie em: https://github.com/settings/tokens
   - Escopo: `repo` (ou fine-grained com acesso ao repositório)

3. No PowerShell:
   ```powershell
   $env:GH_TOKEN = "seu_token_aqui"
   npm run release
   ```

   Isso gera o `.exe` e publica automaticamente no GitHub Releases.

### Opção C — Upload manual no GitHub

1. Gere o build local:
   ```bash
   npm run build
   ```

2. No GitHub → **Releases** → **Draft a new release**:
   - **Tag:** `v1.0.1` (sempre com `v` na frente)
   - **Title:** `Fomy Desktop 1.0.1`
   - Anexe os arquivos da pasta `dist/` ou `build-output/`:
     - `Fomy-Setup-1.0.1.exe`
     - `Fomy-Setup-1.0.1.exe.blockmap` (opcional, para delta updates)
     - `latest.yml` (**obrigatório** para auto-update funcionar)

## Versionamento

Use [Semantic Versioning](https://semver.org/lang/pt-BR/):

| Tipo | Exemplo | Quando usar |
|------|---------|-------------|
| PATCH | 1.0.0 → 1.0.1 | Correções de bugs |
| MINOR | 1.0.0 → 1.1.0 | Novas funcionalidades |
| MAJOR | 1.0.0 → 2.0.0 | Mudanças que quebram compatibilidade |

A tag no GitHub **deve** corresponder à versão: `v1.0.1` para `"version": "1.0.1"`.

## Primeira publicação (v1.0.0)

Se ainda não existe nenhum Release no repositório:

1. Confirme que `package.json` tem `"version": "1.0.0"`.
2. Execute `npm run release` com `GH_TOKEN` configurado, **ou** crie a tag `v1.0.0` e faça push.
3. Usuários com o instalador v1.0.0 passarão a receber avisos quando você publicar v1.0.1+.

## Repositório configurado

```
owner: joaopedrosandrade
repo:  fomy-desktop
feed:  https://github.com/joaopedrosandrade/fomy-desktop/releases/latest/download/latest.yml
```

## Testar localmente

Em desenvolvimento (`npm start`), **Verificar Atualização** informa que só funciona na versão instalada.

Para testar o fluxo completo, instale o `.exe` gerado pelo build e publique uma versão superior no GitHub Releases.

## Solução de problemas

| Problema | Causa provável | Solução |
|----------|----------------|---------|
| "Não foi possível verificar" | Sem Release publicado | Publique `v1.0.0` no GitHub |
| "Já está na versão mais recente" | Não há versão maior | Publique versão superior |
| Atualização não aparece | `latest.yml` ausente no Release | Inclua `latest.yml` nos assets |
| Tag errada | Tag sem `v` | Use `v1.0.1`, não `1.0.1` |
