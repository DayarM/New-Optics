import { APP_CONFIG } from '../../config/app.config.js';
import { el, limpar } from '../../core/dom.js';
import { mensagemParaOperador, registrarErro } from '../../core/erros.js';
import { dataService } from '../../data/dataService.js';

/**
 * Tela de entrada. Chama `aoEntrar(sessao)` quando o login dá certo.
 */
export function telaLogin(raiz, { aoEntrar }) {
  limpar(raiz);
  const { loja } = APP_CONFIG;

  const erro = el('p', { class: 'erro-form', role: 'alert' });
  const usuario = el('input', {
    id: 'login-usuario', name: 'usuario', autocomplete: 'username', autocapitalize: 'none', required: true,
  });
  const senha = el('input', {
    id: 'login-senha', name: 'senha', type: 'password', autocomplete: 'current-password', required: true,
  });
  const botao = el('button', { type: 'submit', class: 'btn btn-primario btn-largo' }, 'Entrar');

  const form = el('form', { class: 'login-form', novalidate: true },
    el('div', { class: 'campo' }, el('label', { for: 'login-usuario' }, 'Usuário'), usuario),
    el('div', { class: 'campo' }, el('label', { for: 'login-senha' }, 'Senha'), senha),
    erro,
    botao,
    dataService.modoDemonstracao
      ? el('p', { class: 'dica' }, 'Modo de demonstração: digite qualquer usuário e senha.')
      : null,
  );

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    erro.textContent = '';
    if (!usuario.value.trim() || !senha.value) {
      erro.textContent = 'Preencha usuário e senha.';
      return;
    }
    botao.disabled = true;
    botao.textContent = 'Entrando…';
    try {
      const sessao = await dataService.entrar(usuario.value.trim().toLowerCase(), senha.value);
      aoEntrar(sessao);
    } catch (falha) {
      registrarErro(falha, 'login');
      erro.textContent = mensagemParaOperador(falha, 'entrar');
      senha.value = '';
      senha.focus();
    } finally {
      botao.disabled = false;
      botao.textContent = 'Entrar';
    }
  });

  // Foto da campanha: só ilustração (fundo decorativo, ignorado por leitores de tela).
  const foto = el('div', { class: 'login-foto', 'aria-hidden': 'true' });
  foto.style.backgroundImage = `url("${loja.fotoCampanha}")`;

  raiz.append(
    el('main', { class: 'login' },
      loja.fotoCampanha ? foto : null,
      el('div', { class: 'login-painel' },
        el('img', { src: loja.logo, alt: `${loja.nome}: ${loja.slogan}`, class: 'login-logo', width: 393, height: 273 }),
        el('div', { class: 'login-caixa' },
          el('h1', { class: 'login-titulo' }, 'Entrar no CRM'),
          form))),
  );
  usuario.focus();
}
