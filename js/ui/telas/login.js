/**
 * TELA: Entrar.
 */
import { h, montar, lerFormulario } from '../../core/dom.js?v=864615d145';
import { authService } from '../../services/authService.js?v=864615d145';
import { APP_CONFIG, MODO_DEMO } from '../../config/app.config.js?v=864615d145';
import { TEXTOS } from '../../config/textos.config.js?v=864615d145';
import { campo, comCarregamento } from '../componentes/ui.js?v=864615d145';
import { mensagemAmigavel } from '../../core/erros.js?v=864615d145';

export function telaLogin(container, aoEntrar) {
  const erro = h('p', { class: 'login-erro', role: 'alert' });
  const form = h('form', { class: 'form', novalidate: true },
    campo({ nome: 'usuario', rotulo: 'Usuário', obrigatorio: true, attrs: { autocomplete: 'username', autocapitalize: 'none', spellcheck: 'false' } }),
    campo({ nome: 'senha', rotulo: 'Senha', tipo: 'password', obrigatorio: true, attrs: { autocomplete: 'current-password' } }),
    erro,
    h('button', { class: 'btn btn-principal', type: 'submit' }, 'Entrar'));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    erro.textContent = '';
    const { usuario, senha } = lerFormulario(form);
    try {
      const sessao = await comCarregamento(form.querySelector('[type=submit]'), 'Entrando…', () => authService.entrar(usuario, senha));
      aoEntrar(sessao);
    } catch (falha) {
      erro.textContent = mensagemAmigavel(falha);
      form.elements.senha.value = '';
      form.elements.senha.focus();
    }
  });

  montar(container,
    h('div', { class: 'login' },
      h('img', { class: 'login-logo', src: 'assets/logo.png', alt: APP_CONFIG.loja.nome }),
      h('p', { class: 'login-slogan' }, APP_CONFIG.loja.slogan),
      h('div', { class: 'login-caixa' },
        h('h1', {}, 'Entrar'),
        MODO_DEMO && h('p', { class: 'aviso-inline' }, `${TEXTOS.demoAviso} Use qualquer usuário e senha.`),
        form)));
}
