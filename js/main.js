/**
 * Ponto de entrada. Liga sessão, layout, rotas e tratamento global de erros.
 */
import { APP_CONFIG, featureLigada } from './config/app.config.js';
import { TEXTOS } from './config/textos.js';
import { registrarErro } from './core/erros.js';
import { aoNavegar, iniciarRoteador, rota } from './core/router.js';
import { store } from './core/store.js';
import { dataService } from './data/dataService.js';
import { avisar } from './ui/componentes/aviso.js';
import { montarLayout } from './ui/layout.js';
import { telaClientes } from './ui/telas/clientes.js';
import { telaFicha } from './ui/telas/ficha.js';
import { telaFormCliente } from './ui/telas/formCliente.js';
import { telaHoje } from './ui/telas/hoje.js';
import { telaLogin } from './ui/telas/login.js';

const raiz = document.getElementById('app');
let layout = null;
let rotasRegistradas = false;

/* ---------- erros não tratados: nunca deixar o operador sem resposta ---------- */
window.addEventListener('error', (e) => {
  registrarErro(e.error || e.message, 'erro não tratado');
  avisar(TEXTOS.erros.generico, 'erro');
});
window.addEventListener('unhandledrejection', (e) => {
  registrarErro(e.reason, 'promessa não tratada');
  avisar(TEXTOS.erros.generico, 'erro');
});

window.addEventListener('crm:sessao-expirada', () => {
  if (!layout) return; // já está na tela de login
  avisar(TEXTOS.erros.sessao, 'info');
  mostrarLogin();
});

/* ---------- rotas ---------- */

async function registrarRotas() {
  if (rotasRegistradas) return;
  const tela = (fn) => (params) => (layout ? fn(layout.principal, params) : undefined);

  rota('/hoje', tela(telaHoje));
  rota('/clientes', tela(telaClientes));
  rota('/clientes/novo', tela((p) => telaFormCliente(p)));
  rota('/cliente/:id', tela(telaFicha));
  rota('/cliente/:id/editar', tela(telaFormCliente));

  await carregarModulosDeFase();
  rotasRegistradas = true;
}

/**
 * PONTO DE EXTENSÃO — Fases 2 e 3.
 * Cada fase é um módulo carregado só quando a flag estiver ligada
 * (import dinâmico: quem não usa, não baixa). Cada módulo exporta
 * `registrarRotas(rota, layout)`.
 */
async function carregarModulosDeFase() {
  const fases = [
    { flag: 'leads', caminho: './ui/telas/leads.js' },             // Fase 2
    { flag: 'vendas', caminho: './ui/telas/vendas.js' },           // Fase 3
    { flag: 'indicadores', caminho: './ui/telas/indicadores.js' }, // Fase 3
  ];
  for (const fase of fases) {
    if (!featureLigada(fase.flag)) continue;
    try {
      const modulo = await import(fase.caminho);
      modulo.registrarRotas(rota, layout);
    } catch (erro) {
      registrarErro(erro, `módulo da fase "${fase.flag}" não carregou`);
    }
  }
}

/* ---------- fluxo de entrada ---------- */

function mostrarLogin() {
  layout = null;
  store.limpar();
  history.replaceState(null, '', '#/login');
  telaLogin(raiz, { aoEntrar: abrirApp });
}

async function abrirApp(sessao) {
  layout = montarLayout(raiz, {
    sessao,
    modoDemonstracao: dataService.modoDemonstracao,
    aoSair: async () => { await dataService.sair(); mostrarLogin(); },
  });
  aoNavegar((caminho) => {
    layout?.marcarAtivo(caminho);
    layout?.principal.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  });
  await registrarRotas();
  iniciarRoteador('#/hoje');
}

function iniciar() {
  document.title = `${APP_CONFIG.loja.nome} · CRM`;
  const sessao = dataService.sessaoAtual();
  if (sessao) abrirApp(sessao);
  else mostrarLogin();
}

iniciar();
