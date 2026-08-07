# Projeto RH — ADR-019 — Cutover, Ativação, Suporte e Gestão da Mudança

**Estado:** decisão operacional registrada; implantação não iniciada  
**Data:** 7 de agosto de 2026  
**Branch:** `feature/projeto-rh-especificacao-funcional`  
**Módulo relacionado:** `PROJETO-RH-MODULO-19-IMPLANTACAO-CUTOVER-TREINAMENTO-SUPORTE-E-MUDANCA.md`

---

## 1. Contexto

Os módulos 01 a 18 definiram domínio, arquitetura, backlog, modelo físico, contratos, experiência e estratégia de qualidade. Ainda falta disciplinar a transição entre um incremento tecnicamente homologado e a operação cotidiana do RH.

No Projeto RH, uma ativação inadequada pode produzir efeitos sobre:

- folha e pagamentos;
- jornadas, saldos e fechamentos;
- férias e afastamentos;
- benefícios e descontos;
- saúde e segurança ocupacional;
- documentos e dados sensíveis;
- obrigações governamentais;
- desligamentos;
- acesso de gestores, trabalhadores e operadores;
- continuidade operacional durante competências críticas.

A plataforma já possui uma prática explícita de não confundir branch, CI, homologação e produção. A Etapa 20 registra decisão `GO`, `NO_GO` ou `CONDITIONAL_GO`, publicação controlada, restauração ensaiada e necessidade de evidências específicas. A documentação de recuperação também demonstra que um procedimento escrito não comprova recuperabilidade quando o replay real não passa.

Portanto, a implantação do RH será tratada como uma mudança operacional governada, com responsáveis, critérios de entrada e saída, plano de comunicação, treinamento, suporte, rollback e reconciliação.

---

## 2. Decisão

A transição para operação seguirá a cadeia:

```text
Incremento homologado
  → readiness operacional
    → ensaio de cutover
      → decisão GO / NO_GO / CONDITIONAL_GO
        → deployment técnico
          → ativação por flag e coorte
            → cutover de processo e dados
              → validação pós-cutover
                → hypercare
                  → estabilização
                    → operação normal
```

As etapas são diferentes e não poderão ser declaradas implicitamente.

```text
Merge
  ≠ release
  ≠ deployment
  ≠ ativação
  ≠ cutover
  ≠ go-live
  ≠ estabilização
```

---

## 3. Separações obrigatórias

### 3.1 Deployment e ativação

Código poderá estar implantado sem que a funcionalidade esteja habilitada. Feature flag, tenant, empresa, estabelecimento, grupo de usuários e capacidade poderão limitar a exposição.

### 3.2 Cutover técnico e cutover de negócio

O cutover técnico trata de versão, migrations, jobs, filas, integrações e configuração. O cutover de negócio trata de competência, dados de origem, responsabilidades, congelamento, conferência, comunicação e mudança do processo oficial.

### 3.3 Rollback técnico e reversão de negócio

Rollback técnico devolve aplicação ou configuração a um estado anterior quando seguro. Fatos de negócio já produzidos poderão exigir compensação, retificação ou nova versão em vez de apagar histórico.

### 3.4 Treinamento e autorização

Participar de treinamento não concede permissão. Possuir permissão não prova proficiência. Para operações Q3/Q4, treinamento e aceite operacional poderão ser condições adicionais do gate.

### 3.5 Suporte e decisão de negócio

Suporte diagnostica e conduz incidentes, mas não decide sozinho sobre pagamento, desligamento, retificação legal, liberação clínica ou alteração de regra trabalhista.

---

## 4. Estratégia de ativação

O RH adotará ativação progressiva sempre que tecnicamente possível.

Ordem preferencial:

```text
ambiente integrado
  → produção restrita sem efeito oficial
    → usuários internos de teste autorizados
      → coorte piloto
        → empresa ou estabelecimento selecionado
          → expansão controlada
            → disponibilidade geral
```

A unidade de rollout poderá ser:

- organização;
- empresa empregadora;
- estabelecimento;
- bounded context;
- capacidade;
- perfil;
- população piloto;
- competência.

Não haverá ativação global apenas porque o deployment ocorreu com sucesso.

---

## 5. Cutover

Todo cutover material terá runbook versionado contendo:

- objetivo;
- escopo;
- versão e commit;
- ambientes;
- responsáveis e substitutos;
- janela operacional;
- pré-condições;
- backups e evidências de restore;
- migrations e backfills;
- freeze de dados quando necessário;
- integrações a pausar ou drenar;
- filas a observar;
- consultas de validação;
- reconciliações;
- critérios de abortar;
- rollback técnico;
- compensação de negócio;
- comunicação;
- validação pós-cutover;
- encerramento e assinatura.

O runbook será ensaiado com dados artificiais ou cópia sanitizada quando aplicável.

---

## 6. Estratégia de dados legados

A migração não será tratada como simples importação.

```text
inventário de origem
  → mapeamento
    → limpeza e classificação
      → dry-run
        → exceções e quarentena
          → carga
            → reconciliação
              → aceite
                → congelamento da origem
                  → transição do sistema oficial
```

Registros ambíguos serão encaminhados para decisão humana. Não serão inventados vínculos, documentos, dependentes, rubricas, saldos ou fatos ausentes.

Para períodos históricos, o projeto poderá optar por:

- migração integral;
- migração resumida com evidência de origem;
- coexistência somente para consulta;
- retenção no sistema legado durante prazo aprovado.

A opção será explícita por domínio.

---

## 7. Freeze e competência

Mudanças Q3/Q4 terão janelas compatíveis com a operação de RH.

Exemplos de períodos em que mudanças poderão ser restringidas:

- fechamento de ponto;
- cálculo e fechamento de folha;
- geração de pagamentos;
- transmissão governamental;
- processamento de férias coletivas;
- campanhas de admissão em lote;
- desligamentos coletivos.

O calendário de freeze será operacional e poderá ser mais restritivo que o calendário técnico.

---

## 8. GO, NO_GO e CONDITIONAL_GO

A decisão será registrada por release ou onda.

### GO

Todos os bloqueios obrigatórios foram resolvidos e as evidências necessárias foram aceitas.

### NO_GO

Existe bloqueio material de segurança, integridade, operação, conformidade, recuperação ou adoção.

### CONDITIONAL_GO

Permitido somente quando:

- a condição não compromete direito, segurança, integridade ou obrigação legal;
- existe contenção clara;
- há owner e prazo de tratamento;
- monitoramento reforçado está ativo;
- a condição é formalmente aceita pelos responsáveis competentes.

`CONDITIONAL_GO` não será usado para contornar falha Q4.

---

## 9. Treinamento e gestão da mudança

Treinamento será organizado por persona e tarefa, não por menu.

Perfis mínimos:

- administração da plataforma;
- RH operacional;
- folha;
- benefícios;
- SST/saúde ocupacional;
- gestores aprovadores;
- líderes de obra;
- Financeiro/Contabilidade integrados;
- suporte técnico;
- suporte funcional;
- auditoria/compliance;
- trabalhador self-service.

Cada trilha poderá incluir:

- objetivo;
- pré-requisitos;
- cenários práticos;
- erros comuns;
- restrições de autorização;
- dados sensíveis;
- procedimento de incidente;
- avaliação;
- evidência de conclusão;
- material de referência versionado.

Treinamento de cálculo ou operação crítica usará casos controlados e não dados pessoais reais desnecessários.

---

## 10. Comunicação

Mudanças relevantes terão plano de comunicação com:

- público;
- mensagem;
- mudança observável;
- ação necessária;
- data ou janela;
- canal;
- material de apoio;
- contato de suporte;
- riscos conhecidos;
- comportamento em contingência.

Comunicação de manutenção ou indisponibilidade não revelará arquitetura sensível, vulnerabilidade explorável ou dados pessoais.

---

## 11. Modelo de suporte

O suporte será organizado por níveis funcionais, não apenas técnicos.

```text
L0 — autosserviço e documentação
L1 — triagem e orientação operacional
L2 — especialista funcional ou técnico do domínio
L3 — engenharia / banco / integração / segurança
L4 — fornecedor, jurídico ou órgão externo quando necessário
```

Todo chamado relevante deverá registrar:

- tenant e escopo;
- usuário e papel quando permitido;
- capacidade afetada;
- instante;
- correlation ID;
- impacto;
- severidade;
- evidência sanitizada;
- workaround;
- responsável;
- estado;
- resolução e causa quando conhecida.

O suporte reutilizará a infraestrutura de SAC, auditoria e observabilidade onde fizer sentido, sem misturar chamados de cliente com conteúdo clínico ou judicial restrito.

---

## 12. Severidade operacional

Categorias iniciais:

- **SEV-0:** risco imediato à segurança, confidencialidade grave ou integridade sistêmica ampla;
- **SEV-1:** operação oficial crítica indisponível ou cálculo/transmissão com risco material;
- **SEV-2:** degradação relevante com alternativa controlada;
- **SEV-3:** defeito localizado sem impacto crítico imediato;
- **SEV-4:** dúvida, melhoria ou problema cosmético.

Metas de resposta não serão inventadas nesta ADR. Serão aprovadas antes do piloto conforme horário de operação, equipe disponível e criticidade da capacidade.

---

## 13. Hypercare

Cada onda produtiva terá período de operação assistida proporcional ao risco.

Durante hypercare serão acompanhados:

- volume de erros;
- falhas de autorização;
- latência de operações críticas;
- jobs e filas;
- divergências de cálculo;
- reconciliações;
- tickets por categoria;
- incidentes;
- abandono de fluxo;
- dúvidas recorrentes;
- ações manuais de contingência.

A saída do hypercare exige estabilidade observada, backlog residual classificado e transferência explícita para operação normal.

---

## 14. Rollback, roll-forward e compensação

A resposta a falha será escolhida conforme o tipo de estado.

### Rollback

Preferível para código, configuração ou feature flag quando o estado persistido continuar compatível.

### Roll-forward

Preferível quando uma migration já foi aplicada, dados foram transformados ou o retorno de versão criaria incompatibilidade.

### Compensação

Obrigatória quando fatos de negócio já produziram efeitos que não podem ser apagados de forma auditável.

Exemplos:

- estorno em vez de apagar pagamento;
- nova execução em vez de sobrescrever folha;
- retificação em vez de apagar transmissão aceita;
- reversão de movimento em vez de editar razão imutável.

---

## 15. Critérios de abortar cutover

O runbook poderá abortar quando ocorrer, entre outros:

- backup ou restore não verificável;
- migration divergente do plano;
- erro de RLS ou tenant;
- contagem ou reconciliação fora da tolerância;
- fila crítica não drenada;
- integração externa em estado incerto não controlado;
- incapacidade de observar o sistema;
- indisponibilidade de responsável obrigatório;
- dado legado ambíguo acima do limite aprovado;
- falha de segurança;
- treinamento obrigatório incompleto para a coorte.

---

## 16. Estado honesto

Esta ADR não executa:

- release;
- deployment;
- feature flag;
- migration;
- backfill;
- cutover;
- comunicação a usuários;
- treinamento;
- suporte dedicado;
- hypercare;
- rollback;
- decisão de go-live.

Ela define o contrato operacional que deverá ser implementado e ensaiado nas ondas futuras.

---

## 17. Consequências

### Positivas

- menor risco de ativação em massa;
- distinção clara entre deploy e processo oficial;
- melhor recuperabilidade;
- suporte com contexto e evidência;
- treinamento orientado à tarefa;
- rastreabilidade da decisão de go-live;
- tratamento explícito de coexistência e legado.

### Custos

- preparação de runbooks e ensaios;
- necessidade de ambientes e dados de teste;
- operação assistida;
- coordenação entre áreas;
- manutenção de materiais de treinamento;
- maior disciplina de release.

Esses custos são aceitos porque implantação de RH é mudança operacional e não apenas publicação de software.
