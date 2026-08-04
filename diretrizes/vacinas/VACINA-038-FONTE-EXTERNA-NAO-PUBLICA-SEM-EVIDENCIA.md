# VACINA-038 — Fonte externa não publica custo sem evidência

**Estado:** vigente  
**Detectada em:** campanha QA por personas, Rodada 02, 29 de julho de 2026

## Qual foi o problema

A automação de referências de custo poderia transformar uma mudança editorial,
uma publicação antiga ou uma extração parcial em preço aparentemente oficial.
Um parser que apenas encontra números não prova origem, data-base nem coerência.

## Como ocorreu

O SindusCon-SP publica o CUB em conteúdo editorial. Título, parágrafos e ordem
dos dados podem mudar entre publicações. Na primeira implementação, a tipagem e
a disposição em múltiplos parágrafos causaram falhas de build e de extração.

## Por que aconteceu

Fontes humanas não são APIs versionadas. Seletores e expressões regulares
acoplados à apresentação envelhecem, e o valor numérico isolado não carrega a
prova necessária para uso orçamentário.

## Como foi detectado

O deployment Vercel recusou a primeira versão por erro de tipo literal. A
revisão do parser também mostrou que dados de uma mesma referência poderiam
estar em parágrafos separados. Nenhum snapshot incorreto foi publicado: o fluxo
permaneceu fail-closed.

## Qual foi a solução

A sincronização:

- aceita somente HTTPS no domínio oficial `sindusconsp.com.br`;
- descobre a publicação pelo feed oficial;
- exige data-base comprovável no texto;
- armazena publicação, data-base, origem e hash do payload canônico;
- recusa custo não positivo;
- recusa CUB sem desoneração menor que o desonerado;
- confere a soma de material, mão de obra e administração quando os componentes
  são publicados;
- recusa regressão para data-base anterior ao snapshot existente;
- registra cada tentativa como `RUNNING`, `COMPLETED`, `UNCHANGED` ou `FAILED`;
- não substitui o último snapshot válido quando a fonte muda de forma
  incompatível.

## Varredura e ocorrências equivalentes

A vacina vale para SINAPI, SICRO, CUB, índices econômicos, câmbio, fornecedores,
tabelas tributárias e qualquer base externa usada em decisão financeira.

## Prevenção automática

`tests/sinduscon-cub.test.ts` cobre:

1. descoberta da publicação no feed;
2. extração de valores e data-base;
3. componentes e variações;
4. hashes SHA-256;
5. recusa de domínio não oficial;
6. recusa de publicação sem data-base.

O build Vercel precisa permanecer `READY`. O cron é autenticado por
`CRON_SECRET` e não aceita chamada pública anônima.

## Limitações da prevenção

O CUB é referência global por metro quadrado e não substitui composições
analíticas de serviços. SINAPI, TCPO ou outra base detalhada exige importador e
licenciamento próprios. Mudanças editoriais futuras podem bloquear a
sincronização; esse bloqueio é preferível a publicar custo incorreto.
