# VACINA-029 — Runner Python deve ser portável

**Estado:** vigente
**Detectada em:** portão completo de QA no Windows, em 28 de julho de 2026

## Qual foi o problema

`pnpm test:python` falhava antes de executar qualquer teste no Windows com a
mensagem de que `PYTHONPATH` não era um comando reconhecido.

## Como ocorreu

O script do `package.json` usava atribuição POSIX inline:
`PYTHONPATH=python python3 ...`. O `cmd.exe` interpreta o primeiro token como
nome de executável e encerra antes de chamar Python.

## Por que aconteceu

Configuração de ambiente e execução foram expressas na sintaxe de um shell
específico, embora o repositório seja utilizado e homologado em Windows e Linux.

## Como foi detectado

O portão completo rodou no Windows. Os cinco testes passaram quando
`PYTHONPATH` foi configurado pela API do PowerShell, provando que a suíte estava
saudável e o defeito era somente do runner.

## Qual foi a solução

`scripts/run-python-tests.mjs` define `PYTHONPATH` pelo objeto `env`, usa o
separador de caminhos da plataforma e escolhe `python` no Windows e `python3`
nos demais sistemas. O script propaga o código de saída real.

## Varredura e ocorrências equivalentes

Os scripts do `package.json` foram revisados. Esta era a única atribuição inline
de variável de ambiente em um comando usado como portão obrigatório.

## Prevenção automática

O próprio `pnpm test:python` agora é o teste negativo: se o interpretador não
iniciar ou a suíte não executar, o wrapper sai com código diferente de zero.

## Limitações da prevenção

O runner não instala Python nem dependências. A imagem de CI e a estação de
trabalho continuam responsáveis por fornecer um interpretador compatível.
