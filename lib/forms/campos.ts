/**
 * Leitura de campo de texto vindo de `FormData`, com a normalização que a
 * VACINA-048 exige.
 *
 * ## Por que este arquivo existe
 *
 * A especificação de HTML manda **normalizar a quebra de linha para CRLF na
 * hora de montar o corpo do envio** de um formulário. O valor lido no navegador
 * por `elemento.value` usa `\n`; o valor que chega ao servidor usa `\r\n`. É o
 * mesmo elemento e o mesmo atributo, com dois resultados — e a diferença é
 * invisível em qualquer inspeção casual, porque `console.log` mostra o texto
 * igual e só o tamanho muda.
 *
 * A VACINA-048 nasceu do selo "Não salvo" que continuava vermelho depois de
 * salvar com sucesso: o corpo da tela tinha 530 caracteres, o que voltou tinha
 * 553. A regra que ela escreveu é universal — *todo texto multilinha vindo de
 * `FormData` é normalizado para `\n` na entrada* — mas a correção foi aplicada
 * em **um** lugar, porque a leitura de `FormData` estava duplicada em 62
 * arquivos de `app/actions`, cada um com a sua cópia de
 * `String(dados.get(chave) ?? "").trim()`.
 *
 * Regra repetida em 62 lugares diverge em silêncio. Esta função é o lugar único.
 *
 * ## Por que `\r\n?` e não `\r\n`
 *
 * O `\r\n` é o que o formulário manda. O `\r` sozinho é o que **a colagem**
 * manda quando o texto veio de um editor antigo ou de um sistema legado, e ele
 * chega pelo mesmo campo. Normalizar os dois custa o mesmo e fecha os dois
 * caminhos; deixar o `\r` solto passar guardaria no banco um caractere que
 * nenhum `diff` mostra e que quebra a mesma comparação por igualdade.
 *
 * ## O que esta função **não** faz
 *
 * Não apara espaço. Aparar é decisão de quem chama: o nome de um cliente se
 * apara, o corpo de um contrato não necessariamente — a linha em branco do fim
 * pode ser do autor. Quem quiser as duas coisas escreve
 * `campoDeTexto(dados, chave).trim()`, que é o que a maioria das ações faz.
 */
export function campoDeTexto(dados: FormData, chave: string): string {
  return String(dados.get(chave) ?? "").replace(/\r\n?/g, "\n");
}
