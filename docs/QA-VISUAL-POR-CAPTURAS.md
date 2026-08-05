# QA visual por capturas do preview

## Objetivo

Observar a interface publicada como o usuário a vê. A captura não substitui testes, mas revela defeitos de composição que lint, TypeScript, build e testes estruturais não detectam.

## Ciclo obrigatório

1. Registrar rota, persona, viewport, tema, dados usados e comportamento esperado.
2. Capturar o estado anterior quando o defeito for reproduzível.
3. Aplicar a correção e executar os portões técnicos.
4. Publicar o preview e aguardar `READY`.
5. Repetir a ação real com a persona correta.
6. Tirar a captura da tela atualizada.
7. Comparar antes/depois no mesmo viewport, zoom e tema.
8. Preencher o checklist visual.
9. Reabrir o microbloco quando houver qualquer achado.
10. Consultar logs de runtime e anexar evidências ao PR ou à issue.

## Matriz mínima

As imagens são full-page; a largura é o contrato obrigatório e a altura apenas define a janela inicial.

| Superfície | Tema claro | Tema escuro |
|---|---:|---:|
| Mobile 375px | obrigatório | obrigatório |
| Tablet 768px | obrigatório | obrigatório |
| Desktop 1280px | obrigatório | obrigatório |

Uma rota pode exigir viewports adicionais quando possuir tabela larga, Kanban, Gantt, modal, painel lateral ou documento incorporado.

## Checklist de leitura da imagem

### Contraste e estados

- contraste de texto, placeholder, ícone, borda e link é legível;
- item ativo, hover, foco e seleção são distinguíveis;
- estados vazio, carregando, erro, sucesso, bloqueado e somente leitura não parecem iguais;
- aviso e erro usam linguagem de domínio, nunca SQL, PGRST, constraint ou stack.

### Geometria e composição

- header, menu, busca, conteúdo, modal e painel não se sobrepõem;
- nenhum rótulo, botão, campo, card ou coluna está cortado;
- não existe overflow horizontal acidental na página;
- scroll interno é intencional, visível e não esconde ações;
- ação primária continua acessível sem cobrir formulário ou tabela;
- títulos, espaçamentos, alinhamentos e densidade formam hierarquia coerente.

### Dados e formatação

- moeda usa `pt-BR`, separador decimal e símbolo corretos;
- percentuais estão na escala correta e dentro do domínio esperado;
- datas e horas são plausíveis e formatadas;
- não aparecem `NaN`, `Infinity`, `undefined`, UUID bruto, ROI absurdo ou zeros enganosos;
- estado parcial ou falha de dependência não é apresentado como lista vazia confirmada.

### Responsividade e acessibilidade

- conteúdo permanece utilizável nas três larguras mínimas;
- teclado, foco e Escape funcionam em dropdowns e modais;
- controles têm rótulo acessível e área de toque mínima de 44px;
- zoom e tamanho de fonte não tornam ações inacessíveis.

## Registro da evidência

Cada conjunto deve registrar:

```text
Rota:
Persona/papel:
Commit ou preview:
Viewport:
Tema:
Ação executada:
Resultado esperado:
Resultado observado:
Achados:
Decisão: aprovado | corrigir e repetir
Arquivos de captura:
Logs consultados:
```

## Critério de aprovação

Uma tela não é aprovada porque “parece melhor”. Ela é aprovada quando:

- todos os portões técnicos passaram;
- o preview publicado foi exercitado;
- a matriz de captura aplicável foi produzida;
- o checklist não possui achado aberto;
- os logs das rotas exercitadas não apresentam falha inesperada;
- a vacina correspondente foi aplicada ou criada.

## Regra de economia

A captura deve ser analisada antes de uma nova rodada ampla de alterações. Primeiro identificar visualmente a causa provável, depois alterar o menor conjunto transversal possível. Isso reduz retrabalho e evita corrigir componentes que não participam do defeito.
