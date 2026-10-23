# MM Óptica · CRM

Mini-CRM em SPA (HTML + CSS + JS puro) com dados no Google Sheets.
Telas: **Hoje** (quem contatar), **Clientes**, **Leads**, **Contatos** (histórico) e **Painel** (indicadores).
Tema claro e escuro (segue o aparelho; botão de lua/sol no topo para escolher).

## Estrutura

```
index.html              página única
css/styles.css          visual (mobile-first)
assets/logo.png         logo (troque pelo arquivo original para mais nitidez)
assets/campanha.webp    foto da campanha usada nas faixas de Clientes e Cadastrar
js/
  main.js               menu, rotas, sessão
  config/               ← tudo que muda sem programar
    app.config.js       URL da API, dados da loja, feature flags
    regras.config.js    regras de recontato, resultados, textos de WhatsApp
    textos.config.js    mensagens de erro e opções
  core/                 datas, roteador, erros, DOM seguro, sessão
  data/
    dataService.js      ÚNICA porta de leitura/gravação
    adapters/           sheetsAdapter (produção) e demoAdapter (teste local)
  services/             regras de negócio (funções puras + orquestração)
  ui/                   telas e componentes
apps-script/Code.gs     backend (colar no Apps Script da planilha)
tests/                  testes das regras e do backend simulado (npm test)
```

## Testar no computador (modo demonstração)

Com `apiUrl` vazio em `js/config/app.config.js`, o app roda com dados de exemplo
salvos só no navegador. Qualquer usuário e senha entram.

```
npx serve .          # ou: python3 -m http.server 5173
npm test             # 26 testes das regras + teste do Code.gs com planilha simulada (Node 18+)
```

> Abrir o `index.html` com duplo clique não funciona: módulos JS exigem um servidor.

## Publicar (gratuito)

### 1. Planilha e backend
1. Crie uma planilha nova no Google Drive (ex.: "CRM MM Óptica").
2. **Extensões > Apps Script**. Apague o conteúdo e cole `apps-script/Code.gs`. Salve.
3. Volte à planilha e recarregue a página. Aparece o menu **CRM Ótica**.
4. **CRM Ótica > 1. Preparar planilha** (o Google pede autorização na primeira vez:
   Avançado > Acessar projeto).
5. **CRM Ótica > 2. Cadastrar usuário** — repita para cada operadora.
   Senha mínima de 8 caracteres. A planilha guarda só um código (hash), nunca a senha.
6. No Apps Script: **Implantar > Nova implantação > Tipo: App da Web**
   - Executar como: **Eu**
   - Quem pode acessar: **Qualquer pessoa**
   - Copie a URL que termina em `/exec`.

### 2. Site no GitHub Pages
1. Cole a URL em `apiUrl` no arquivo `js/config/app.config.js`.
2. Crie um repositório no GitHub (ex.: `crm-mm-optica`) e envie todos os arquivos
   (pode ser pelo botão "Add file > Upload files").
3. **Settings > Pages > Source: Deploy from a branch > main / (root) > Save**.
4. Em ~1 minuto o site fica em `https://SEU-USUARIO.github.io/crm-mm-optica/`.
5. No tablet/celular, abra o link e use "Adicionar à tela de início".

> No plano gratuito, o GitHub Pages exige repositório público. Não há segredo no
> código: dados e senhas ficam na planilha. Se preferir repositório privado,
> Cloudflare Pages ou Netlify também são gratuitos (mesmos arquivos, sem mudança).

### Atualizar o backend depois
Se mudar o `Code.gs`: **Implantar > Gerenciar implantações > editar (lápis) >
Versão: Nova versão > Implantar**. Assim a URL continua a mesma.

## Segurança e LGPD
- Não compartilhe a planilha: ela contém receitas (dado de saúde = dado sensível).
- Cliente sem autorização de mensagens nunca aparece em "Contatar hoje".
- "Excluir cliente" apaga cliente, contatos, compras e receitas; a aba Auditoria
  guarda só data, operador e o código do registro (sem dados pessoais).
- Login bloqueia por 5 minutos após 5 senhas erradas; sessão dura 12 horas.
- Para tirar o acesso de alguém: **CRM Ótica > Desativar usuário**.

## Mudar regras e textos
Tudo em `js/config/regras.config.js`: prazos (`dias`), validade, prioridade,
ligar/desligar (`ativa`), resultados do "Contatei" e textos do WhatsApp.
Rode `npm test` depois de mudar.

## Atualizando uma planilha que já existia (versão 2)
1. Substitua o código no Apps Script pelo novo `Code.gs` e salve.
2. Na planilha: **CRM Ótica > 1. Preparar planilha** — cria a aba **Leads** e acrescenta a
   coluna `lead_id` no final da aba **Contatos**. Nada que já existe é apagado.
3. **Implantar > Gerenciar implantações > editar > Nova versão > Implantar** (a URL não muda).
4. Suba os arquivos novos do site no GitHub (substituindo os antigos).

## Foto da campanha
`assets/campanha.webp` foi recortada da peça da campanha (uso autorizado pelos responsáveis).
Para trocar, salve outra imagem com o mesmo nome (WebP ou JPG renomeado, até ~150 KB).
Ela aparece só no topo das telas Clientes, Novo cliente e Novo lead, desbotando para a esquerda.

## Fases ligadas
Leads (Fase 2) e Painel (Fase 3) já estão ativos. Para desligar algum, troque para `false`
em `features` (`js/config/app.config.js`); o menu e as rotas somem sozinhos.

## Próximos passos possíveis
- Vendedor/canal por venda: acrescentar colunas no FINAL da aba Compras e rodar "Preparar planilha".
- Muitos milhares de registros: mover o cálculo do Painel para uma ação `indicadores` no
  `Code.gs` (ponto marcado em `indicadoresService.js`).
