# MM Óptica · CRM (Fase 1)

Mini-CRM comercial em SPA web (HTML + CSS + JavaScript, sem framework).
Tela inicial: **Quem contatar hoje**. Dados em **Google Sheets + Apps Script**; site no **GitHub Pages**.

## Como experimentar agora (modo demonstração)

Com `api.url` vazio em `js/config/app.config.js`, o sistema roda sozinho no navegador, com clientes de exemplo.
É preciso abrir por um servidor local (módulos ES não funcionam em `file://`):

```bash
python3 -m http.server 8080   # depois abra http://localhost:8080
```

Qualquer usuário e senha entram no modo demonstração.

## Estrutura

```
index.html
css/app.css                  identidade visual (roxo e amarelo da campanha)
assets/                      logo.png, logo-compacto.png, campanha-crianca.jpg, favicon.svg
js/
  main.js                    inicialização, rotas, erros globais, módulos das fases 2/3
  config/
    app.config.js            loja, URL da API, limite diário, FEATURE FLAGS, menu
    recontato.config.js      regras de recontato, mensagens, resultados do "Contatei"
    textos.js                textos da interface e mensagens de erro
  core/                      dom (sem innerHTML para dados), roteador, store, erros
  data/
    dataService.js           ÚNICA porta de leitura e gravação
    adapters/                appsScript.adapter.js, demo.adapter.js
  services/                  regras de negócio PURAS (recontato, telefone, datas, clientes)
  ui/                        layout, componentes e telas
backend/Code.gs              Apps Script (colar na planilha)
tests/                       testes das regras (node --test)
```

Rodar os testes (Node 18+): `npm test`

## Publicação passo a passo

### 1. Planilha e backend
1. Crie uma planilha nova no Google Sheets com a conta da loja (ex.: "MM Óptica CRM").
2. Menu **Extensões → Apps Script**. Apague o conteúdo e cole todo o `backend/Code.gs`. Salve.
3. Volte à planilha e recarregue a página. Aparece o menu **CRM**.
4. **CRM → 1. Preparar planilha** (o Google pede autorização na primeira vez: aceite com a conta da loja).
5. **CRM → 2. Criar usuário ou trocar senha**: crie `maria` (Maria Marinho) e `yasmin` (Yasmin Marinho), com senhas de pelo menos 8 caracteres.
   Para bloquear alguém depois, mude `ativo` para `NAO` na aba Usuarios (oculta: menu Exibir → Páginas ocultas).

### 2. Implantar a API
1. No Apps Script: **Implantar → Nova implantação → tipo App da Web**.
2. Executar como: **Eu**. Quem pode acessar: **Qualquer pessoa**.
   (O acesso aos dados é protegido pelo login do CRM. "Somente contas do domínio" não funciona com o site hospedado fora do Google.)
3. Copie a URL que termina em `/exec`. Teste no navegador: deve aparecer `{"ok":true,...}`.
4. Cole a URL em `js/config/app.config.js` → `api.url`.

> Ao alterar o `Code.gs` depois: **Implantar → Gerenciar implantações → editar (lápis) → Versão: nova**. Assim a URL continua a mesma.

### 3. Publicar o site no GitHub Pages
1. Crie uma conta em github.com (se não tiver) e um repositório, por exemplo `mm-otica-crm`.
2. **Add file → Upload files**: envie todo o conteúdo desta pasta (menos `backend/` e `tests/`, que são opcionais).
3. **Settings → Pages → Source: Deploy from a branch → main / root → Save**.
4. Em 1 a 2 minutos o endereço aparece (ex.: `https://SEU-USUARIO.github.io/mm-otica-crm/`).
5. Nos tablets e celulares da loja, abra o endereço e use **Adicionar à tela inicial**.

> O código do site fica visível em repositório público, mas ele não contém senhas nem dados: os dados ficam na planilha e só saem com login válido. Se preferir, use repositório privado (GitHub Pages em repositório privado exige plano pago).

## Ajustes do dia a dia (sem programar)

| O que mudar | Onde |
|---|---|
| Limite de contatos por dia | `app.config.js` → `lista.limiteDiario` |
| Ligar o motivo Aniversário | `recontato.config.js` → regra `aniversario` → `ativa: true` |
| Prazos, prioridades e textos das mensagens | `recontato.config.js` → `regras` |
| Validade da receita (adulto/criança) | `recontato.config.js` → `validadeReceita` |
| Intervalo de "Não respondeu" e nº de tentativas | `recontato.config.js` → `resultados` |
| Endereço, nome, foto da campanha | `app.config.js` → `loja` |
| Textos de erro | `textos.js` |

Variáveis nas mensagens: `{nome}` (primeiro nome do cliente), `{loja}`, `{endereco}`.

### Trocar a foto da campanha
Substitua `assets/campanha-crianca.jpg` (foto em pé, rosto no terço de cima, de preferência sem textos por cima) ou aponte `loja.fotoCampanha` para outro arquivo. Deixe vazio para não usar foto.
**Importante (LGPD, art. 14):** a foto é de uma criança. Use apenas com a autorização dos responsáveis já registrada para a campanha.

## Regras de recontato (valores iniciais)

| Motivo | Quando aparece | Prioridade |
|---|---|---|
| Adaptação | 7 dias após a compra (vale por 21 dias) | 1 |
| Receita vencida | no vencimento e depois | 2 |
| Receita vencendo | 30 dias antes do vencimento | 3 |
| Aniversário | no dia (desligado) | 4 |
| Cliente sumido | 18 meses sem compra | 5 |

Validade da receita: 12 meses; 6 meses para menores de 7 anos. Sem data de receita, usa a data da última compra.
Um cliente aparece uma vez por dia, com o motivo de maior prioridade; empate → mais atrasado primeiro.
Nunca aparecem: sem consentimento, ou marcados "Não quer contato".

Resultado do "Contatei": **Respondeu** encerra o motivo e pausa o cliente por 15 dias; **Não respondeu** volta em 3 dias, até 2 tentativas por motivo; **Não quer contato** tira o cliente da lista para sempre.

## Ativar as Fases 2 e 3

1. **Flags**: `app.config.js` → `features.leads`, `features.vendas`, `features.indicadores` → `true`. O menu já tem os itens previstos.
2. **Telas**: criar `js/ui/telas/leads.js`, `vendas.js`, `indicadores.js`, cada um exportando `registrarRotas(rota, layout)`. São carregados só com a flag ligada (`main.js → carregarModulosDeFase`).
3. **Dados**: implementar no `dataService` os métodos já marcados (listarLeads, salvarLead, converterLeadEmCliente, registrarVenda, carregarIndicadores) e as ações correspondentes no `Code.gs`. Os esquemas das abas Leads e Vendas estão comentados em `CRM.ABAS`.
4. **Regras novas** (ex.: dias após venda): `registrarTipoDeCondicao` em `services/recontato.js`, sem mexer no motor.
5. **Indicadores**: a aba Contatos já registra cliente, dia, motivo, resultado e operador. "Voltou depois do contato" = venda com `contatoOrigemId` em até N dias.
6. **Histórico de compras na ficha**: entra com a aba Vendas (Fase 3); a Fase 1 guarda só a última compra e a receita atual.

## Ideias futuras (fora do escopo)
- Envio automático de mensagens ou API oficial do WhatsApp (custo, aprovação e risco de bloqueio do número).
- Leitura de receita por foto/IA, campos técnicos de grau, estoque e fiscal (papel do ERP).

## Limites conhecidos
- Sessão guardada no cache do Apps Script (até 6 h de inatividade). Se o Google limpar o cache antes, basta entrar de novo.
- A planilha atende bem alguns milhares de clientes. Acima de ~20 mil linhas de contatos, vale arquivar contatos antigos ou migrar o adaptador para outro backend.
