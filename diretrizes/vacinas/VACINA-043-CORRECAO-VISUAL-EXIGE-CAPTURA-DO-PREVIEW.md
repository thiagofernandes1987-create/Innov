# VACINA-043 — Correção visual exige captura do preview

**Estado:** vigente  
**Detectada em:** repetição do loop transversal de QA em 29 de julho de 2026

## Qual foi o problema

Correções eram consideradas concluídas após testes de código, build e leitura da implementação. Mesmo quando esses portões passavam, a tela publicada ainda podia apresentar sobreposição, contraste insuficiente, corte de conteúdo, valores sem formatação, estados vazios enganosos e comportamento diferente no viewport real do usuário.

## Como ocorreu

A análise permanecia centrada no código e em testes estruturais. A interface não era obrigatoriamente observada como uma imagem completa depois da publicação. Isso fragmentava a percepção: cada componente parecia correto isoladamente, mas a composição final da página revelava conflitos entre header, busca, menus, painéis, tabelas e conteúdo.

## Por que aconteceu

Build, lint, TypeScript e testes de contrato verificam propriedades importantes, mas não enxergam a experiência final. Também faltava um gate explícito exigindo captura do preview no mesmo viewport, tema e persona em que o defeito foi reproduzido.

## Como foi detectado

As capturas reais de 29 de julho de 2026 mostraram problemas que não eram evidentes apenas pela leitura do código: resumo financeiro cobrindo formulário, navegação sobreposta à busca, textos de baixo contraste, scroll horizontal acidental, valores estranhos e mensagens técnicas expostas.

## Qual foi a solução

Toda alteração com impacto visual passa a exigir o seguinte ciclo:

1. reproduzir e capturar o estado anterior;
2. corrigir e publicar o preview;
3. abrir a rota com a persona real;
4. capturar a tela atualizada;
5. analisar a captura como usuário;
6. comparar antes/depois no mesmo viewport e tema;
7. repetir o loop quando a imagem revelar qualquer novo achado;
8. somente então revisar logs, registrar evidências e concluir o microbloco.

A análise visual cobre contraste, sobreposição, cortes, overflow, scroll interno, valores, percentuais, datas, hierarquia, alinhamento, foco, estados vazios, mensagens de erro e ações primárias.

## Varredura e ocorrências equivalentes

O gate é transversal e se aplica à casca global, CRM, propostas, orçamentos, obras, planejamento, tarefas, equipes, relatórios, administração e portal do cliente. Viewports mínimos: 1920x1080, 1366x768 e 390x844, nos temas claro e escuro.

## Prevenção automática

`docs/QA-VISUAL-POR-CAPTURAS.md` define o protocolo e a matriz obrigatória. `tests/visual-qa-capture-protocol.test.ts` exige que o protocolo continue versionado e contenha os gates essenciais. O catálogo canônico e `validate:vaccines` confirmam que a vacina permanece registrada. Testes estruturais continuam protegendo contratos conhecidos, mas não substituem a captura do preview.

## Limitações da prevenção

O teste confirma a existência e a estrutura do protocolo; não consegue declarar sozinho que uma captura foi realmente analisada. A evidência visual precisa ser produzida no preview publicado e anexada ao PR ou à issue de QA. Uma captura também não substitui a execução interativa de teclado, foco, upload, submissão e permissões por persona.
