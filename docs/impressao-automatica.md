# Impressão automática (Fomy Desktop)

O app consulta a fila do Fomy a cada 4 segundos e imprime cupons ESC/POS na impressora configurada.

## Configuração

1. No painel web: **Meu Negócio → Delivery** → ative impressão automática e salve.
2. Abra o **Fomy Desktop** no PC da impressora.
3. No painel (dentro do Desktop): clique em **Vincular neste computador**.
4. Configure a impressora: menu **Fomy → Configurar impressora** (`Ctrl+Shift+P`).

## Desenvolvimento local

Aponte o Desktop para o WAMP:

```bash
set FOMY_APP_URL=http://localhost/fomy/
npm start
```

O `APP_URL` do Laravel (`.env`) deve ser o mesmo host usado no pareamento.

## API utilizada

- `GET /estacao-impressao/{token}/config` — validar pareamento
- `GET /estacao-impressao/{token}/dados` — poll da fila
- `POST /estacao-impressao/{token}/confirmar` — confirmar job impresso
- `GET cupom_url_escpos` — bytes ESC/POS do cupom

## Bridge no painel web

```javascript
window.fomyDesktop.printQueue.savePairing({ apiBaseUrl, token });
window.fomyDesktop.printQueue.getStatus();
```
