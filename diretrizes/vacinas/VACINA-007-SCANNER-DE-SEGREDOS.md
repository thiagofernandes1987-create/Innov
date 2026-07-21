# VACINA-007 — Scanner de segredos consciente de placeholders

## Sintoma

A validação documental bloqueia exemplos seguros como:

```bash
SUPABASE_SERVICE_ROLE_KEY="..."
DEMO_ADMIN_PASSWORD="..."
```

tratando reticências, valores redigidos ou referências ao cofre como se fossem credenciais reais.

## Causa raiz

O scanner anterior verificava apenas a presença de `NOME=valor`. Ele não analisava semanticamente o valor capturado e, portanto, não distinguia:

- secret real;
- placeholder explícito;
- valor redigido;
- referência `${{ secrets.NOME }}`;
- variável de ambiente reutilizada.

## Vacina

O scanner deve:

1. capturar o nome e o valor da atribuição;
2. remover aspas externas;
3. aceitar somente placeholders reconhecidos;
4. continuar bloqueando qualquer valor concreto não reconhecido;
5. manter detecção independente de JWTs e chaves com prefixos sensíveis.

Placeholders permitidos:

- vazio;
- `...`;
- `<descricao>`;
- `***`;
- `REDACTED` ou `[REDACTED]`;
- `CHANGEME`;
- `YOUR_*`;
- `example*` ou `placeholder*`;
- `${VARIAVEL}`;
- `${{ secrets.NOME }}`.

## Aplicação transversal

Aplicada ao validador de todos os documentos canônicos, vacinas e históricos. Documentos antigos não precisam ser adulterados apenas para satisfazer um scanner textual frágil.

## Teste preventivo

`pnpm validate:docs` deve:

- aceitar `SUPABASE_SERVICE_ROLE_KEY="..."`;
- aceitar referências ao GitHub Secrets;
- rejeitar valores concretos;
- rejeitar tokens JWT aparentes;
- rejeitar chaves com prefixos sensíveis.

`pnpm validate:vaccines` exige a função de classificação de placeholders no scanner documental.

## Critério de encerramento

- exemplos redigidos passam;
- credenciais concretas continuam bloqueadas;
- o erro reporta arquivo e nome da variável, sem reproduzir o valor suspeito;
- a varredura continua incluindo documentos históricos.
