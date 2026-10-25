/**
 * PONTO DE ENTRADA DO APP
 * Liga sessão, tema, menu e rotas. As telas ficam em js/ui/telas.
 */
import { h, montar } from './core/dom.js?v=9ece4c76cc';
import { rota, iniciarRoteador, irPara, caminhoAtual } from './core/router.js?v=9ece4c76cc';
import { APP_CONFIG, MODO_DEMO } from './config/app.config.js?v=9ece4c76cc';
import { TEXTOS } from './config/textos.config.js?v=9ece4c76cc';
import { authService } from './services/authService.js?v=9ece4c76cc';
import { aplicarTema, alternarTema, temaAtual, temaSalvo } from './core/tema.js?v=9ece4c76cc';
import { avisar, configurarExpiracao, avatar } from './ui/componentes/ui.js?v=9ece4c76cc';
import { icone } from './ui/componentes/icones.js?v=9ece4c76cc';
import { telaLogin } from './ui/telas/login.js?v=9ece4c76cc';
import { telaHoje } from './ui/telas/hoje.js?v=9ece4c76cc';
import { telaClientes } from './ui/telas/clientes.js?v=9ece4c76cc';
import { telaClienteForm } from './ui/telas/clienteForm.js?v=9ece4c76cc';
import { telaClienteDetalhe } from './ui/telas/clienteDetalhe.js?v=9ece4c76cc';
import { telaContatos } from './ui/telas/contatos.js?v=9ece4c76cc';
import { telaLeads } from './ui/telas/leads.js?v=9ece4c76cc';
import { telaLeadForm } from './ui/telas/leadForm.js?v=9ece4c76cc';
import { telaLeadDetalhe } from './ui/telas/leadDetalhe.js?v=9ece4c76cc';
import { telaPainel } from './ui/telas/painel.js?v=9ece4c76cc';

const conteudo = document.getElementById('conteudo');
const { features } = APP_CONFIG;

/* ---------------- MENU ---------------- */
const MENU = [
  { rotulo: 'Hoje', icone: 'sun', caminho: '/hoje', ativoEm: /^\/hoje/ },
  { rotulo: 'Clientes', icone: 'users', caminho: '/clientes', ativoEm: /^\/clientes/ },
  features.leads && { rotulo: 'Leads', icone: 'target', caminho: '/leads', ativoEm: /^\/leads/ },
  { rotulo: 'Contatos', icone: 'listChecks', caminho: '/contatos', ativoEm: /^\/contatos/ },
  features.indicadores && { rotulo: 'Painel', icone: 'chart', caminho: '/painel', ativoEm: /^\/painel/ },
].filter(Boolean);

/* ---------------- ROTAS ---------------- */
rota('/hoje', telaHoje);
rota('/clientes', telaClientes);
rota('/clientes/novo', (c) => telaClienteForm(c));
rota('/clientes/:id', telaClienteDetalhe);
rota('/clientes/:id/editar', telaClienteForm);
rota('/contatos', telaContatos);
if (features.leads) {
  rota('/leads', telaLeads);
  rota('/leads/novo', (c) => telaLeadForm(c));
  rota('/leads/:id', telaLeadDetalhe);
  rota('/leads/:id/editar', telaLeadForm);
}
if (features.indicadores) rota('/painel', telaPainel);
// PONTO DE EXTENSÃO: nova tela = import + rota(...) + item no MENU.

/* ---------------- CABEÇALHO E MENU ---------------- */
function botaoTema() {
  const escuro = temaAtual() === 'escuro';
  return h('button', {
    class: 'btn-cabecalho', type: 'button', id: 'btn-tema',
    'aria-label': escuro ? 'Usar tema claro' : 'Usar tema escuro',
    title: escuro ? 'Tema claro' : 'Tema escuro',
    onclick: () => { alternarTema(); document.getElementById('btn-tema').replaceWith(botaoTema()); },
  }, icone(escuro ? 'sun' : 'moon'));
}

function desenharCabecalho(sessao) {
  montar(document.getElementById('cabecalho'),
    h('a', { href: '#/hoje', class: 'marca', 'aria-label': `${APP_CONFIG.loja.nome}, ir para o início` },
      h('img', { src: 'assets/logo.png', alt: '', class: 'marca-logo' })),
    h('nav', { id: 'menu', class: 'menu', 'aria-label': 'Menu principal' },
      h('ul', {}, MENU.map((m) => h('li', {},
        h('a', { href: `#${m.caminho}`, dataset: { caminho: m.caminho } }, icone(m.icone), h('span', {}, m.rotulo)))))),
    h('div', { class: 'usuario' },
      botaoTema(),
      h('div', { class: 'usuario-cartao' },
        avatar(sessao.nome),
        h('span', { class: 'usuario-nome' }, sessao.nome),
        h('button', { class: 'btn-cabecalho btn-sair', type: 'button', onclick: sair, 'aria-label': 'Sair', title: 'Sair' }, icone('logOut')))));

  if (MODO_DEMO) document.getElementById('faixa-demo').replaceChildren(h('p', {}, icone('info'), h('span', {}, TEXTOS.demoAviso)));
}

function marcarMenu(caminho) {
  for (const m of MENU) {
    const a = document.querySelector(`#menu a[data-caminho="${m.caminho}"]`);
    if (!a) continue;
    if (m.ativoEm.test(caminho)) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
}

/* ---------------- SESSÃO ---------------- */
function entrarNoApp(sessao) {
  document.body.classList.remove('modo-login');
  desenharCabecalho(sessao);
  // replaceState não dispara 'hashchange', evitando desenhar a tela duas vezes.
  if (caminhoAtual() === '/') history.replaceState(null, '', '#/hoje');
  iniciarRoteador(async (r, params, caminho) => {
    if (!authService.sessaoAtual()) return sair();
    if (!r) return irPara('/hoje');
    marcarMenu(caminho);
    document.body.dataset.tela = caminho.split('/')[1] || 'hoje';
    window.scrollTo(0, 0);
    await r.tela(conteudo, params);
    // Leva o foco ao título da tela nova (leitores de tela e teclado).
    const titulo = conteudo.querySelector('h1');
    titulo?.setAttribute('tabindex', '-1');
    titulo?.focus({ preventScroll: true });
  });
}

function sair() {
  authService.sair();
  location.reload();
}

configurarExpiracao(() => setTimeout(sair, 1500));

// Tema escolhido no aparelho; sem escolha, acompanha o sistema em tempo real.
aplicarTema(temaSalvo());
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (!temaSalvo()) { aplicarTema(null); document.getElementById('btn-tema')?.replaceWith(botaoTema()); }
});

// Rede de segurança: nenhum erro inesperado fica "mudo" para o operador.
window.addEventListener('unhandledrejection', (e) => {
  console.error(e.reason);
  avisar('Algo deu errado. Tente de novo.', 'erro');
});

const sessao = authService.sessaoAtual();
if (sessao) {
  entrarNoApp(sessao);
} else {
  document.body.classList.add('modo-login');
  telaLogin(conteudo, (s) => entrarNoApp(s));
}
