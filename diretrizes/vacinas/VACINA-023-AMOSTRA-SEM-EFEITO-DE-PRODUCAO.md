# VACINA-023 — Amostra sem efeito de produção

**Estado:** aplicada
**Detectada em:** S-30, inspeção visual da caixa operacional

## Qual foi o problema

A amostra pública renderizava corretamente os avisos pessimistas, mas abrir o
painel executava a Server Action que grava leitura. Sem sessão e Supabase
configurado, a página caía no overlay de erro em vez de abrir a fixture.

## Como ocorreu

O componente visual era compartilhado com a aplicação autenticada e carregou
junto o efeito de persistência. A amostra substituiu os dados, mas não declarou
que também substituía o destino das escritas.

## Por que aconteceu

Estado visual e efeito de produção estavam implicitamente acoplados no mesmo
evento de clique, sem uma capacidade explícita para desligar persistência em
superfícies de demonstração.

## Como foi detectado

No navegador, viewport de 420×900, ao abrir “Notificações” em
`/amostra-launcher?cenario=problema`. O Next exibiu erro de Supabase não
configurado antes que o painel pudesse ser inspecionado.

## Qual foi a solução

`BarraSuperior` e `CantoDireito` receberam `persistirAvisos`, verdadeiro por
padrão. Só a rota de amostra passa `false`: o painel mantém estado local e
interação completa, sem autenticar nem escrever. A aplicação real conserva a
marcação de leitura no banco.

## Varredura e ocorrências equivalentes

A rota de amostra é a única superfície pública que monta a casca autenticada
com fixtures. Os layouts reais não alteram o padrão.

## Prevenção automática

A opção é segura por padrão (`true`) e precisa ser desligada explicitamente.
A amostra pessimista faz parte da inspeção visual em mobile e desktop.

## Limitações da prevenção

A amostra valida interação e layout, não RLS. RLS e escrita continuam cobertas
pelos 14 testes PostgreSQL sob identidades distintas.
