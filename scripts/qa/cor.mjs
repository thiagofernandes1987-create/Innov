// A aritmética de cor do medidor de contraste, isolada para poder ser testada.
//
// Ela vivia dentro da função que roda no navegador, e por isso nunca teve
// teste: função serializada para o Chromium não é importável. O resultado está
// no histórico do próprio instrumento — **quatro versões erradas**, três
// aprovando o que devia reprovar e uma acusando o que estava correto, todas
// descobertas por acaso durante outra investigação.
//
// Aqui as funções são puras e exportadas. `contraste.mjs` injeta o texto delas
// no prelúdio da função que vai ao navegador, e `tests/qa-contraste.test.ts`
// importa as mesmas funções. Uma implementação só, conferida por teste.

/** Luminância relativa WCAG, de componentes 0–255. */
export function lum(c) {
  const [r, g, b] = c.map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Componentes 0–255, a partir de `rgb()`, `rgba()` ou `color(<espaço> …)`.
 *
 * `color(srgb 0.95 0.97 0.99)` — que o Chromium devolve quando a cor veio de
 * `color-mix()` ou de espaço declarado — era lido pelo regex de números como
 * [0.95, 0.97, 0.99] em escala 0–255, ou seja, preto. Texto escuro sobre fundo
 * claro aparecia como 1,3:1 e entrava no relatório como reprovação.
 *
 * O nome do espaço é descartado antes de ler os números: `display-p3` contém um
 * `3` que o regex capturaria como componente.
 */
export function num(s) {
  const texto = String(s);
  const espaco = /^\s*color\(\s*([a-z0-9-]+)/i.exec(texto);
  const corpo = espaco ? texto.slice(texto.indexOf(espaco[1]) + espaco[1].length) : texto;
  const partes = (corpo.split("/")[0].match(/-?[\d.]+/g) || [0, 0, 0]).slice(0, 3).map(Number);
  while (partes.length < 3) partes.push(0);
  return espaco ? partes.map(v => Math.max(0, Math.min(1, v)) * 255) : partes;
}

/** Opacidade declarada, em qualquer das três notações. */
export function alfa(s) {
  const texto = String(s);
  if (/^\s*color\(/i.test(texto)) {
    const depoisDaBarra = texto.split("/")[1];
    return depoisDaBarra ? Number((depoisDaBarra.match(/[\d.]+/) || [1])[0]) : 1;
  }
  return /rgba/.test(texto) ? Number((texto.match(/[\d.]+/g) || [])[3] ?? 1) : 1;
}

/** Razão de contraste entre duas cores, na notação que vier. */
export function contraste(corA, corB) {
  const a = lum(num(corA));
  const b = lum(num(corB));
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/**
 * O mínimo exigido pela WCAG AA para aquele texto.
 *
 * 3:1 só para texto grande — 24px, ou 18,66px em negrito. Aplicar 3:1 a texto
 * corrido seria aprovar o que ninguém lê.
 */
export function minimoExigido(tamanhoPx, peso) {
  return tamanhoPx >= 24 || (tamanhoPx >= 18.66 && Number(peso) >= 700) ? 3 : 4.5;
}

/** O texto das funções, para injetar no navegador. */
export const FONTE = [lum, num, alfa, minimoExigido].map(f => String(f)).join("\n");
