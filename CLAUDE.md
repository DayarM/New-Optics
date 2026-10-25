# MM Ótica · CRM — instruções para o Claude Code

## O que é
Mini-CRM comercial da MM Ótica (Fortaleza). Usuárias: operadoras de balcão, pouca familiaridade técnica. Princípio: **simples primeiro**. Toda a interface em português do Brasil, sem jargão técnico.

- Site: GitHub Pages, repositório `DayarM/New-Optics`, branch `main`, raiz do repositório. Endereço: https://dayarm.github.io/New-Optics/
- Dados: Google Sheets + Apps Script (`apps-script/Code.gs`), chamado por POST `text/plain`.
- Sem framework e sem build: HTML + CSS + JS com módulos ES nativos.

## Arquitetura (não quebrar)
- `js/config/` → regras de recontato, textos, opções, feature flags. Prazos, textos e regras ficam aqui, nunca fixos no código.
- `js/core/` → datas (sempre texto `AAAA-MM-DD`), roteador por hash, erros, DOM seguro, sessão, tema.
- `js/data/dataService.js` → única porta de leitura/gravação. Adaptadores: `sheetsAdapter` (produção) e `demoAdapter` (localStorage, usado quando `apiUrl` está vazio). Toda ação nova existe nos DOIS adaptadores e no `Code.gs`, com o mesmo contrato.
- `js/services/` → regras de negócio. Cálculos são funções puras com teste em `tests/`.
- `js/ui/` → telas e componentes. Criar elementos com `h()` de `core/dom.js`; nunca `innerHTML` com dados digitados. Ícones: `ui/componentes/icones.js` (SVG inline).
- Erros: lançar `AppError(codigo)`; o texto para a operadora fica em `config/textos.config.js` (`MENSAGENS_ERRO`), em linguagem simples.

## Restrições
- CSP no `index.html`: scripts só do próprio site; nada de CDN de JS; estilo via classes (atributo `style` é bloqueado; use `el.style.x = ...` em JS se precisar).
- `js/config/app.config.js` → não apagar a `apiUrl` já preenchida.
- Nenhuma senha, token ou dado de cliente no repositório (ele é público).
- LGPD: cliente/lead sem consentimento nunca entra em "Quem contatar hoje"; exclusão apaga o histórico e registra só o id na aba Auditoria. Receitas são dado de saúde.
- Visual: tokens de cor em `:root` com versão clara e escura (`prefers-color-scheme` + `data-theme`). Fontes: Bricolage Grotesque (títulos) e DM Sans (texto). Cores da marca: violeta noite `#241046`, ouro `#F5B82E`, violeta vivo `#6D3FD0`, verde-água `#0E8F7A`. Barra lateral no computador (≥900px), abas embaixo no celular. Mobile-first; testar em 390px e 1280px.
- Planilha: colunas novas só no FINAL das abas (definidas em `ABAS` no `Code.gs`).

## Comandos
- Testes: `npm test` (Node 18+). Rodar antes de todo commit; não publicar com teste falhando.
- Proteção contra cache: todo import relativo e os `<script>`/`<link>` do `index.html` levam `?v=<etiqueta>`. O `npm test` atualiza a etiqueta sozinho (`scripts/versao.mjs`); import novo pode ser escrito sem ela.
- Servidor local: `npx serve .` ou `python -m http.server 5173` (módulos ES não abrem com duplo clique).

## Fluxo de trabalho
1. Explicar em 2–3 linhas o que vai mudar antes de editar.
2. Editar, adicionar/ajustar testes, rodar `npm test`.
3. Commit em português e objetivo (ex.: `Leads: filtro por origem`) e `git push origin main`.
4. Se mudou o `Code.gs`, avisar no final, passo a passo: colar o arquivo no Apps Script, rodar "CRM Ótica > Preparar planilha" se houver coluna/aba nova, e "Implantar > Gerenciar implantações > editar > Nova versão".
5. Responder em português simples, dizendo o que mudou e onde conferir no site.
