# Projeto RH — ADR-020 — Governança Regulatória, Parâmetros e Evolução

**Estado:** decisão de governança registrada; operação contínua não iniciada  
**Data:** 7 de agosto de 2026  
**Branch:** `feature/projeto-rh-especificacao-funcional`  
**Módulo relacionado:** `PROJETO-RH-MODULO-20-GOVERNANCA-OPERACIONAL-CALENDARIO-LEGAL-E-EVOLUCAO.md`

---

## 1. Contexto

Os módulos 01 a 19 definiram domínio, arquitetura, execução, dados, contratos, experiência, qualidade e implantação do Projeto RH. Mesmo depois do go-live, porém, o domínio continuará mudando por motivos legais, operacionais e tecnológicos.

No RH, mudanças podem surgir em:

- leiautes e regras do eSocial;
- regras e manuais do FGTS Digital;
- DCTFWeb e obrigações fiscais/previdenciárias;
- Normas Regulamentadoras e orientações de SST;
- tabelas, faixas, limites, rubricas e incidências;
- calendários e prazos;
- regras coletivas ou empresariais;
- fornecedores e APIs;
- certificados, credenciais e procurações;
- requisitos de privacidade, segurança e retenção;
- políticas internas;
- novas capacidades da plataforma.

Tratar esses elementos como constantes de código sem vigência e procedência tornaria o sistema incapaz de explicar cálculos históricos e arriscaria aplicar uma regra nova a fatos antigos ou manter regra vencida em fatos novos.

A plataforma também já possui catálogo modular, perfis configuráveis, overrides, auditoria administrativa, observabilidade, migrations append-only e disciplina de prontidão. O RH deverá evoluir sobre esses mecanismos, e não criar um núcleo administrativo paralelo.

---

## 2. Decisão

Toda regra externa, parâmetro mutável ou configuração de alto impacto será governada por uma cadeia versionada:

```text
Fonte ou necessidade
  → registro da mudança
    → classificação e triagem
      → análise de aplicabilidade
        → interpretação aprovada
          → avaliação de impacto
            → proposta versionada
              → implementação/configuração
                → testes e reconciliação
                  → aprovação
                    → publicação com vigência
                      → monitoramento
                        → substituição ou encerramento
```

A publicação de uma nova versão não apagará a anterior.

```text
Regra atual
  ≠ regra histórica
  ≠ interpretação jurídica
  ≠ parâmetro técnico
  ≠ configuração operacional
  ≠ evidência da fonte
```

---

## 3. Princípios

1. regra legal ou externa terá fonte e vigência;
2. fonte oficial terá precedência sobre resumo secundário;
3. captura automática de publicação não equivale a interpretação jurídica;
4. nenhuma alteração regulatória crítica entrará em produção apenas porque um crawler detectou mudança;
5. regras versionadas preservarão fatos históricos;
6. parâmetro futuro não alterará cálculo fechado de competência anterior sem processo explícito;
7. correção retroativa será identificada como retroativa e reconciliada;
8. configurações críticas seguirão maker-checker;
9. acesso privilegiado será revisável e temporário quando excepcional;
10. segredos não serão armazenados em tabelas de configuração comuns;
11. certificados, procurações e credenciais terão inventário de metadados, owner e expiração;
12. calendário legal será derivado de definições versionadas de obrigação;
13. prazo calculado terá regra, calendário, fuso e fonte identificáveis;
14. qualquer alteração material poderá invalidar evidências e gates anteriores;
15. evolução contínua será guiada por risco, fatos operacionais e valor, não apenas por solicitações avulsas.

---

## 4. Registro de fontes regulatórias

O RH manterá um catálogo conceitual de fontes oficiais. Cada entrada deverá possuir, quando aplicável:

- autoridade emissora;
- domínio regulatório;
- título do documento;
- versão ou identificação;
- URL canônica ou identificador oficial;
- data de publicação;
- data de captura;
- vigência declarada;
- hash do artifact capturado;
- status de validade;
- documento substituído;
- responsável pela análise;
- relação com regras, parâmetros, adapters e testes.

Artifact capturado será evidência da fonte, não prova automática de interpretação correta.

---

## 5. Hierarquia de confiança

Para regras externas, a ordem padrão será:

```text
Lei, decreto, portaria, instrução normativa ou ato oficial aplicável
  → documentação técnica oficial
    → manual oficial
      → nota técnica/orientativa oficial
        → FAQ ou comunicado oficial
          → material secundário apenas como apoio
```

Conflitos aparentes deverão ser escalados para análise humana qualificada.

---

## 6. Change record regulatório

Toda mudança material terá um registro próprio, separado do commit de software.

Estados sugeridos:

```text
DETECTED
  → TRIAGED
    → UNDER_ANALYSIS
      → INTERPRETATION_APPROVED
        → IMPACTED
          → PLANNED
            → IMPLEMENTED
              → VERIFIED
                → APPROVED
                  → SCHEDULED
                    → EFFECTIVE
                      → SUPERSEDED
```

Estados alternativos:

```text
NOT_APPLICABLE
REJECTED
BLOCKED
WITHDRAWN
EMERGENCY_APPLIED
```

`EMERGENCY_APPLIED` exigirá revisão posterior e não dispensará evidências.

---

## 7. Vigência e temporalidade

Toda regra mutável deverá distinguir:

- publicação;
- início de vigência jurídica;
- disponibilidade técnica da integração;
- data de implantação do software;
- data de ativação por tenant;
- competência ou fato gerador alcançado;
- encerramento ou substituição.

A escolha da versão aplicável será determinística e reproduzível.

---

## 8. Parâmetros e fórmulas

Parâmetros poderão incluir:

- faixas e limites;
- percentuais;
- valores mínimos e máximos;
- incidências;
- códigos externos;
- regras de arredondamento;
- calendários;
- critérios de elegibilidade;
- matrizes de evento;
- versões de fórmulas.

Nenhuma fórmula crítica será editada destrutivamente. Uma nova vigência criará nova versão.

Parâmetros aprovados deverão registrar:

- fonte;
- vigência;
- unidade;
- precisão;
- valor anterior e novo;
- justificativa;
- autor;
- aprovador;
- testes afetados;
- data de publicação.

---

## 9. Calendário legal e operacional

O calendário não será uma coleção de datas digitadas manualmente. Ele será derivado de definições de obrigações e regras de prazo.

```text
Obrigação versionada
  + população aplicável
  + competência/fato
  + regra de vencimento
  + calendário aplicável
  + exceções oficiais
  → deadline calculado
  → janela operacional
  → alertas
  → evidência de cumprimento
```

Feriados, dias úteis, fusos e regras especiais serão explicitamente governados.

---

## 10. Administração crítica

Operações administrativas serão classificadas em:

- configuração comum;
- configuração sensível;
- configuração crítica;
- emergência/break-glass.

Configurações críticas incluirão, conforme o caso:

- publicação de regra de folha;
- mudança de incidência;
- alteração de adapter governamental;
- alteração de certificado ativo;
- mudança de segregação de funções;
- mudança de política de retenção;
- alteração de calendário oficial;
- habilitação de produção externa.

Essas operações exigirão justificativa e trilha antes/depois. As de maior risco exigirão aprovador independente.

---

## 11. Acessos e recertificação

O RH reutilizará o núcleo modular da plataforma (`app_modules`, perfis, capabilities, overrides e `permission_change_events`).

A governança acrescentará processo para:

- revisão periódica baseada em risco;
- revisão acionada por mudança de função;
- retirada imediata por desligamento ou incidente;
- revisão de overrides individuais;
- revisão de acessos clínicos, judiciais, folha e obrigações;
- expiração de acessos temporários;
- break-glass com motivo, duração e auditoria;
- confirmação do owner do acesso.

Treinamento concluído não concederá acesso automaticamente.

---

## 12. Segredos, certificados e procurações

Segredo permanecerá em cofre externo ou mecanismo próprio de secret management.

O banco poderá armazenar somente metadados não secretos necessários à governança, por exemplo:

- alias;
- provider;
- finalidade;
- ambiente;
- owner;
- data de emissão;
- data de expiração;
- fingerprint público quando apropriado;
- estado operacional;
- referência ao segredo no cofre.

Rotação e renovação terão janela, teste prévio, possibilidade de coexistência e confirmação pós-troca.

---

## 13. Fornecedores e integrações

Cada integração terá owner, criticidade, contrato, versão, ambiente, autenticação, limites, health check, plano de indisponibilidade, política de retry, reconciliação e processo de atualização.

Mudança de API externa será tratada como change record, não como correção invisível.

---

## 14. Retenção, privacidade e legal hold

Políticas de retenção terão:

- categoria de dado;
- base e finalidade;
- evento de início da contagem;
- prazo ou condição;
- método de descarte;
- exceções;
- legal hold;
- owner;
- revisão.

Legal hold impedirá descarte programado sem alterar o conteúdo histórico.

---

## 15. Operação e melhoria contínua

A evolução receberá entradas de:

- incidentes;
- post-incident reviews;
- problemas recorrentes;
- alertas e SLOs;
- chamados de suporte;
- findings de segurança;
- mudanças regulatórias;
- novas necessidades de negócio;
- dados de adoção;
- performance;
- revisão de usabilidade e acessibilidade;
- auditorias internas e externas.

Cada entrada deverá ser classificada como defeito, problema, risco, melhoria, mudança regulatória, dívida técnica ou evolução de produto.

---

## 16. Revisão independente

Mudanças Q3 e Q4 relacionadas a regra legal, folha, pagamento, SST sensível, autorização, retenção ou transmissão externa exigirão revisão independente compatível com o risco.

O mesmo usuário não deverá, por padrão, interpretar, publicar e aprovar sozinho uma mudança crítica.

---

## 17. Consequências positivas

- preservação de explicabilidade histórica;
- menor risco de regra vencida;
- rastreabilidade entre fonte oficial e comportamento do sistema;
- atualização regulatória sem reescrever o passado;
- melhor controle de certificados e integrações;
- redução de permissões órfãs;
- calendário de obrigações reproduzível;
- melhoria contínua baseada em evidência.

---

## 18. Custos e riscos assumidos

- manutenção de catálogo regulatório;
- necessidade de owners e aprovadores;
- operação de revisões periódicas;
- manutenção de datasets por versão;
- maior esforço para mudanças urgentes;
- armazenamento de artifacts de fonte e evidências.

Esses custos são aceitos porque o custo de aplicar uma regra errada ou vencida pode ser superior ao custo de governá-la.

---

## 19. Alternativas rejeitadas

### 19.1 Hardcode permanente de parâmetros

Rejeitado porque inviabiliza vigência, revisão e explicação histórica.

### 19.2 Atualização automática de regra jurídica a partir de scraping

Rejeitada porque detecção de texto não substitui interpretação, aplicabilidade e aprovação.

### 19.3 Edição direta de parâmetros em produção

Rejeitada para configurações críticas por ausência de maker-checker, testes e evidência.

### 19.4 Calendário inteiramente manual

Rejeitado por favorecer inconsistência, atraso e perda de procedência.

### 19.5 Acesso privilegiado permanente por conveniência

Rejeitado por aumentar exposição e reduzir rastreabilidade.

---

## 20. Estado honesto

Esta ADR não cria:

- monitor regulatório;
- crawler;
- calendário legal executável;
- tabelas de parâmetros;
- workflows de aprovação;
- recertificação automática;
- cofre de segredos;
- inventário de certificados;
- alertas de expiração;
- legal hold;
- jobs de retenção;
- automação de melhoria contínua.

Todos permanecem em especificação.
