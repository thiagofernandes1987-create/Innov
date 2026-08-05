# Ciclo de ajuste e validação de módulos

**Documento operacional:** obrigatório  
**Branch da campanha:** `fix/qa-personas-visual-runtime-loop`  
**Rastreamento:** issue #32

## Objetivo

Para cada módulo da aplicação, executar ciclos de correção e validação visual e funcional até que todos os critérios de aceitação sejam comprovados no preview publicado. Build verde, rota HTTP 200 ou teste isolado não aprovam um módulo.

## Estados permitidos

```text
pendente
em_correcao
aguardando_preview
aguardando_captura
reprovado
aprovado
```

Somente `aprovado` encerra o módulo. Qualquer novo erro de runtime, captura, console, servidor, responsividade, permissão ou fluxo reabre o módulo como `reprovado` ou `em_correcao`.

## Loop obrigatório

Repita até o status do módulo ser `aprovado`:

1. **CORRIGIR** — aplicar somente alterações relacionadas ao módulo atual ou a uma causa transversal comprovada.
2. **TESTAR LOCALMENTE** — executar testes unitários, contratos, validações, lint, typecheck, build e o fluxo funcional mínimo.
3. **PUBLICAR PREVIEW** — obter URL imutável do deployment e aguardar `READY`.
4. **SIMULAR PERSONA REAL** — autenticar com o papel definido, navegar pelo caminho real e executar a tarefa, não apenas abrir a rota.
5. **CAPTURAR** — registrar a tela completa e estados intermediários necessários nos viewports e temas definidos.
6. **ANALISAR COMO USUÁRIO** — comparar com a referência e registrar cada achado no formato:

```text
[Problema] — [Localização] — [Severidade: baixa | média | alta | bloqueante]
```

7. **DECIDIR** — sem problemas abertos e com todos os critérios verdadeiros, avançar; caso contrário, priorizar bloqueantes/altos e voltar ao passo 1.
8. **REVISAR LOGS** — verificar console do navegador, rede, funções da Vercel, logs do servidor e erros do provedor. Erro inesperado reabre o ciclo.
9. **REGISTRAR VACINA** — documentar causa, solução, prevenção, teste negativo, módulos equivalentes e limitações.
10. **ATUALIZAR INVENTÁRIO** — atualizar `diretrizes/qa/VALIDACAO-MODULOS.json` com iterações, problemas, capturas, logs, vacina e decisão.

## Matriz visual mínima

| Viewport | Tema claro | Tema escuro |
|---|---:|---:|
| 1920×1080 | obrigatório | obrigatório |
| 1366×768 | obrigatório | obrigatório |
| 390×844 | obrigatório | obrigatório |

Kanban, Gantt, tabelas, painéis laterais, formulários extensos e documentos podem exigir capturas adicionais.

## Critérios genéricos

- layout coerente com as referências aprovadas;
- contraste legível para texto, placeholder, ícone, borda e estado;
- controles clicáveis/tocáveis com feedback de foco, hover, seleção e carregamento;
- menu, busca, header, modal, drawer e conteúdo sem sobreposição;
- textos, cards, campos e tabelas sem corte ou transbordamento;
- ausência de overflow horizontal acidental na página;
- valores, moeda, percentuais, datas e horas formatados e plausíveis;
- nenhum `NaN`, `Infinity`, UUID bruto, SQL, PGRST, constraint ou stack trace na interface;
- estados vazio, erro, carregando, sucesso, bloqueado e somente leitura distinguíveis;
- zero erro inesperado no console durante o fluxo principal;
- zero erro inesperado nos logs do servidor para as rotas exercitadas;
- dados efetivamente salvos, enviados, alterados ou consultados conforme a tarefa;
- persona conclui o fluxo sem depender de documento predecessor artificial;
- permissões negativas também testadas.

## Saída obrigatória

Cada módulo mantém um registro equivalente a:

```json
{
  "modulo": "crm",
  "status": "aprovado",
  "iteracoes": 3,
  "problemas_resolvidos": [
    {
      "descricao": "Menu sobrepunha a busca em notebook",
      "localizacao": "header do CRM",
      "severidade": "alta",
      "solucao": "separação de faixas e menu controlado por clique",
      "vacina_registrada": "VACINA-043"
    }
  ],
  "capturas_aprovadas": [
    {
      "viewport": "1366x768",
      "tema": "escuro",
      "url": "https://..."
    }
  ],
  "logs": {
    "console_navegador": "limpo",
    "servidor": "limpo",
    "consultado_em": "2026-07-30T00:00:00Z"
  }
}
```

## Regra de aprovação

Um módulo não pode ser marcado como `aprovado` quando qualquer condição abaixo ocorrer:

- `iteracoes` menor que 1;
- captura ausente em um viewport ou tema obrigatório;
- problema aberto;
- critério de aceitação falso;
- logs não revisados ou diferentes de `limpo`;
- persona ou fluxo principal não registrados;
- vacina ausente para causa recorrente;
- preview sem URL e commit imutáveis.

## Economia de retrabalho

A captura deve ser analisada antes da próxima rodada ampla. Primeiro identificar a causa provável olhando a composição inteira; depois alterar o menor conjunto transversal possível. A fotografia da tela é tratada como a visão do usuário e como um detector de defeitos que o código isolado não revela.
