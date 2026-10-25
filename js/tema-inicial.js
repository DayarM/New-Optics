/* Carregado no <head> (sem módulo) para aplicar o tema antes de desenhar a página e evitar "piscar". */
(function () {
  // Proteção contra "clickjacking": o sistema nunca abre dentro de outro site (iframe).
  // O GitHub Pages não permite o cabeçalho X-Frame-Options, então a defesa fica aqui.
  if (window.top !== window.self) {
    document.documentElement.style.display = 'none';
    try { window.top.location = window.self.location.href; } catch (e) { /* o site de fora bloqueou: segue escondido */ }
    return;
  }
  try {
    var t = localStorage.getItem('mmcrm.tema');
    if (t === 'escuro') document.documentElement.dataset.theme = 'dark';
    if (t === 'claro') document.documentElement.dataset.theme = 'light';
  } catch (e) { /* sem acesso ao armazenamento: segue o sistema */ }
})();
