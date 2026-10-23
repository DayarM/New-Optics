/**
 * TELA: Clientes — busca por nome ou telefone + exportação CSV.
 */
import { h, montar } from '../../core/dom.js';
import { clientesService } from '../../services/clientesService.js';
import { buscarClientes, gerarCSV } from '../../services/validacoes.js';
import { formatarWhatsapp } from '../../services/mensagemService.js';
import { formatarData, hojeISO } from '../../core/datas.js';
import { ehVerdadeiro } from '../../services/recontatoService.js';
import { TEXTOS } from '../../config/textos.config.js';
import { carregando, falhaCarregar, comIcone, faixaCampanha, botaoNovo, confirmar } from '../componentes/ui.js';
import { icone } from '../componentes/icones.js';

const LIMITE = 100; // evita desenhar milhares de linhas no celular
let ultimoTermo = ''; // a busca continua ao voltar da ficha

export async function telaClientes(container) {
  montar(container, carregando());
  let clientes;
  try {
    clientes = await clientesService.todos();
  } catch (erro) {
    montar(container, falhaCarregar(erro, () => telaClientes(container)));
    return;
  }

  const resultado = h('div', { 'aria-live': 'polite' });
  const contador = h('p', { class: 'contagem' });
  const busca = h('input', {
    type: 'search', id: 'busca', value: ultimoTermo, autocomplete: 'off', enterkeyhint: 'search',
    placeholder: 'Nome ou número', 'aria-label': 'Buscar cliente por nome ou número',
  });

  const desenharLista = () => {
    ultimoTermo = busca.value;
    const achados = buscarClientes(clientes, busca.value);
    contador.textContent = busca.value.trim()
      ? `${achados.length} de ${clientes.length} clientes`
      : `${clientes.length} ${clientes.length === 1 ? 'cliente' : 'clientes'}`;
    if (!achados.length) {
      montar(resultado, h('div', { class: 'estado' },
        h('p', {}, clientes.length ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado ainda.')));
      return;
    }
    montar(resultado,
      h('ul', { class: 'lista' }, achados.slice(0, LIMITE).map(itemCliente)),
      achados.length > LIMITE && h('p', { class: 'estado' }, `Mostrando ${LIMITE} de ${achados.length}. Refine a busca.`));
  };
  busca.addEventListener('input', desenharLista);

  montar(container,
    faixaCampanha('Clientes'),
    h('div', { class: 'barra-busca' },
      h('label', { class: 'busca', for: 'busca' }, icone('search', { classe: 'busca-icone' }), busca),
      botaoNovo('Novo cliente', '#/clientes/novo')),
    contador,
    resultado,
    h('div', { class: 'rodape-tela' },
      h('button', { type: 'button', class: 'btn-texto', onclick: () => exportar(clientes) }, ...comIcone('download', 'Exportar planilha (CSV)'))));
  desenharLista();
}

function itemCliente(c) {
  return h('li', { class: 'linha' },
    h('a', { class: 'linha-link', href: `#/clientes/${encodeURIComponent(c.id)}` },
      h('span', { class: 'linha-nome' }, c.nome),
      h('span', { class: 'linha-meta' },
        h('span', { class: 'num' }, formatarWhatsapp(c.whatsapp)),
        c.ultima_compra && h('span', { class: 'num so-tela-grande' }, `Compra em ${formatarData(c.ultima_compra)}`),
        !ehVerdadeiro(c.consentimento) && h('span', { class: 'selo' }, 'Sem autorização'))));
}

async function exportar(clientes) {
  const ok = await confirmar({ titulo: 'Exportar clientes?', texto: TEXTOS.exportarAviso, botao: 'Baixar arquivo' });
  if (!ok) return;
  const csv = gerarCSV(clientes, [
    ['nome', 'Nome'], ['whatsapp', 'WhatsApp'], ['ultima_compra', 'Última compra'],
    ['data_nascimento', 'Nascimento'], ['consentimento', 'Autorizou WhatsApp'], ['observacao', 'Observação'],
  ]);
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = h('a', { href: url, download: `clientes-${hojeISO()}.csv` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
