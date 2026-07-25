# Régua objetiva de evidência

Cada dimensão é pontuada por controles verificáveis, não por impressão documental:

- 0: ausente;
- 1: narrativa;
- 2: contrato formal parseável;
- 3: implementação de referência compilável;
- 4: teste automatizado local executado;
- 5: integração executada com dependências reais e evidência reproduzível.

Percentual da dimensão = pontos obtidos / pontos possíveis dos controles listados na matriz.
Um cenário Gherkin sem step definition vale narrativa de aceitação, não teste executado.
Validação estática de template Helm não equivale a `helm template` ou instalação.
Presença de SQL não equivale a migration aplicada em PostgreSQL.
