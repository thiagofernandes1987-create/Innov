# VACINA-015 — Efeito não mora dentro do atualizador de estado do React

## Sintoma

No canto direito da barra superior, o painel de Mensagens abria e os de Notificações e Configuração não. Nenhum erro de compilação, nenhum erro de rede, nenhuma falha de permissão. O console do navegador acusava:

```text
Cannot call startTransition while rendering.
Cannot update a component (`Router`) while rendering a different component (`CantoDireito`).
```

O primeiro painel funcionava porque a condição do efeito (`naoLidas > 0`) era falsa naquele estado; os outros dois disparavam o efeito e perdiam a atualização.

## Causa raiz

```tsx
// O que existia:
setAberto(atual => {
  const proximo = atual === painel ? null : painel;
  if (proximo === "mensagens" && naoLidas > 0) iniciar(() => marcarVisto("mensagens"));
  if (proximo === "notificacoes") iniciar(() => marcarVisto("atividades"));
  return proximo;   // ← o corpo desta função roda DURANTE a renderização
});
```

A função passada a `setState` é um **atualizador**: o React a executa durante a fase de renderização, que precisa ser pura. Disparar `startTransition`, chamar server action, navegar ou escrever em outro componente dali é efeito colateral em render — o React descarta ou reordena, e o resultado é uma tela que não muda sem nenhuma exceção lançada.

A armadilha é que o padrão parece correto: quem escreve quer decidir o efeito a partir do estado anterior, e o atualizador é o único lugar onde o estado anterior está à mão.

## Vacina

Calcular o próximo estado **fora** do atualizador, usar esse valor tanto para o `setState` quanto para o efeito:

```tsx
const proximo = aberto === painel ? null : painel;
setAberto(proximo);
if (proximo === "mensagens" && naoLidas > 0) iniciar(() => marcarVisto("mensagens"));
if (proximo === "notificacoes" && pendentes > 0) iniciar(() => marcarVisto("atividades"));
```

Regras:

- o corpo de `setState(fn)` só devolve estado — nada de `startTransition`, `router.*`, server action, `fetch`, `document.*` ou `setState` de outro componente;
- quando o efeito depende do estado anterior, ler o estado da closure e calcular o próximo fora do atualizador, ou mover o efeito para `useEffect` com o novo estado na lista de dependências;
- em manipulador de evento, o valor do estado na closure é o valor atual — não há necessidade do atualizador para lê-lo.

## Por que passa despercebido

- `pnpm lint`, `pnpm typecheck` e `pnpm build` não detectam: é comportamento de tempo de execução;
- `pnpm test` não detecta enquanto o componente não for montado em teste que exercite o clique;
- a página responde 200 e não há erro de servidor;
- o sintoma é "o botão não faz nada", que costuma ser investigado como permissão, cache ou revalidação — três lugares errados.

Só aparece em quem lê o console do navegador. Foi encontrado por verificação em navegador que coleta `console` e `pageerror`, não pelo build.

## Aplicação transversal

Varredura da mesma causa no repositório: procurar `setEstado(` com corpo de função contendo `iniciar(`, `startTransition`, `router.`, `await` ou chamada de ação.

Aplicada em `components/casca/canto-direito.tsx`. Componentes com atualizador de estado a conferir sempre que crescerem: `components/pipeline/pipeline-view.tsx`, `components/pipeline/coluna-acoes.tsx`, `components/conversa/conversa.tsx`.

## Teste negativo

Verificação em navegador que abre os três painéis e falha se algum não abrir, com coleta de erro de console tratada como reprovação — não como ruído:

```text
painel mensagens: abriu · fecha com Escape: sim
painel notificacoes: abriu · fecha com Escape: sim
painel configuracao: abriu · fecha com Escape: sim
ERROS DE CONSOLE: nenhum
```
