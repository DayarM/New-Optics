/**
 * Criação de elementos sem innerHTML: todo texto vira textNode,
 * o que impede que um nome ou observação digitada "quebre" a página (XSS).
 *
 * Uso: h('button', { class: 'btn', onclick: fn }, 'Salvar')
 */
export function h(tag, attrs = {}, ...filhos) {
  const el = document.createElement(tag);
  for (const [chave, valor] of Object.entries(attrs || {})) {
    if (valor === null || valor === undefined || valor === false) continue;
    if (chave.startsWith('on') && typeof valor === 'function') {
      el.addEventListener(chave.slice(2), valor);
    } else if (chave === 'class') {
      el.className = valor;
    } else if (chave === 'dataset') {
      Object.assign(el.dataset, valor);
    } else if (chave === 'value') {
      el.value = valor;
    } else if (valor === true) {
      el.setAttribute(chave, '');
    } else {
      el.setAttribute(chave, String(valor));
    }
  }
  anexar(el, filhos);
  return el;
}

function anexar(el, filhos) {
  for (const f of filhos.flat(Infinity)) {
    if (f === null || f === undefined || f === false) continue;
    el.append(f instanceof Node ? f : document.createTextNode(String(f)));
  }
}

/** Troca todo o conteúdo de um container. */
export function montar(container, ...filhos) {
  container.replaceChildren();
  anexar(container, filhos);
}

/** Lê um formulário como objeto simples (checkbox vira boolean). */
export function lerFormulario(form) {
  const dados = {};
  for (const campo of form.elements) {
    if (!campo.name) continue;
    if (campo.type === 'checkbox') dados[campo.name] = campo.checked;
    else if (campo.type === 'radio') { if (campo.checked) dados[campo.name] = campo.value; }
    else dados[campo.name] = campo.value.trim();
  }
  return dados;
}

/** Marca campos inválidos e foca o primeiro. `erros` = { campo: 'mensagem' } */
export function mostrarErrosCampos(form, erros = {}) {
  form.querySelectorAll('.campo-erro').forEach((n) => n.remove());
  form.querySelectorAll('[aria-invalid]').forEach((n) => n.removeAttribute('aria-invalid'));
  let primeiro = null;
  for (const [nome, msg] of Object.entries(erros)) {
    let campo = form.elements[nome];
    if (!campo) continue;
    // Grupo de opções (radio): o erro vai no fieldset do grupo.
    if (!campo.closest && campo.length) campo = campo[0];
    if (!campo.closest) continue;
    campo.setAttribute('aria-invalid', 'true');
    // Se o campo está dentro de "Mais detalhes" fechado, abre para mostrar o erro.
    const detalhes = campo.closest('details');
    if (detalhes) detalhes.open = true;
    const caixa = campo.closest('fieldset') || campo.closest('.campo') || campo.parentElement;
    caixa.append(h('p', { class: 'campo-erro', role: 'alert' }, msg));
    primeiro = primeiro || campo;
  }
  primeiro?.focus();
}
