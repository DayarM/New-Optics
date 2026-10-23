/* Carregado no <head> (sem módulo) para aplicar o tema antes de desenhar a página e evitar "piscar". */
(function () {
  try {
    var t = localStorage.getItem('mmcrm.tema');
    if (t === 'escuro') document.documentElement.dataset.theme = 'dark';
    if (t === 'claro') document.documentElement.dataset.theme = 'light';
  } catch (e) { /* sem acesso ao armazenamento: segue o sistema */ }
})();
