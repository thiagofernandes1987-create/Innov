# ADR-002 — Separação entre Tenant, Empresa Empregadora e Estabelecimento

**Projeto:** Projeto RH  
**Estado:** proposta aceita para orientar a especificação; implementação pendente  
**Data:** 6 de agosto de 2026  
**Branch:** `feature/projeto-rh-especificacao-funcional`  

---

## 1. Contexto

A Innovar Platform utiliza `organizations` como fronteira principal de multiempresa, autorização e isolamento de dados. Na arquitetura atual, uma organização representa o tenant operacional da plataforma: o contexto em que usuários, módulos, permissões, obras e registros são segregados.

O domínio de Recursos Humanos e Departamento Pessoal precisa representar outra realidade: a entidade que contrata ou mantém determinado vínculo e os seus estabelecimentos operacionais. Essa entidade não deve ser confundida automaticamente com o tenant técnico.

Uma mesma organização da plataforma poderá, no futuro, administrar:

- uma única empresa empregadora;
- mais de uma empresa do mesmo grupo;
- matriz e filiais;
- estabelecimentos administrativos e operacionais;
- obras tratadas como locais de alocação, sem necessariamente serem estabelecimentos empregadores;
- empresas distintas atendidas por um escritório de contabilidade ou prestador de serviços.

Forçar uma relação permanente de um tenant para uma única empresa impediria esses cenários. No sentido oposto, usar cada estabelecimento como tenant fragmentaria usuários, permissões, relatórios, documentos e consolidações.

---

## 2. Decisão

O Projeto RH adotará três conceitos separados.

### 2.1 Organização da plataforma

A organização, atualmente representada por `organizations`, continuará sendo a fronteira de:

- tenancy;
- autorização;
- configuração de módulos;
- isolamento de dados;
- administração de usuários;
- auditoria e recuperação.

Ela não será considerada, por si só, prova de identidade jurídica ou condição de empregadora.

### 2.2 Empresa empregadora

A empresa empregadora representará a entidade empresarial à qual um vínculo poderá ser associado.

Ela pertencerá a uma organização da plataforma e possuirá, no mínimo:

- identificador interno estável;
- código interno;
- nome empresarial;
- nome de exibição;
- identificação cadastral aplicável;
- situação;
- datas de vigência;
- configurações trabalhistas e de folha aplicáveis;
- responsáveis;
- histórico de alterações;
- documentos e evidências.

Os campos oficiais definitivos, códigos, obrigatoriedades e validações dependerão de consulta às fontes oficiais vigentes no momento da implementação.

### 2.3 Estabelecimento

O estabelecimento representará uma unidade vinculada à empresa empregadora, utilizada para enquadramento, lotação, apuração, transmissão, relatórios ou operação, conforme a finalidade configurada.

Um estabelecimento poderá representar, entre outros casos:

- matriz;
- filial;
- unidade administrativa;
- unidade operacional;
- estabelecimento sem trabalhadores ativos;
- unidade encerrada preservada para histórico.

Obra e estabelecimento continuarão entidades diferentes. Uma obra poderá ser relacionada a um estabelecimento para fins de operação ou alocação, mas não será convertida automaticamente em estabelecimento.

---

## 3. Modelo conceitual inicial

```text
organizations                         tenant e fronteira de autorização
  └─ employer_companies               empresas administradas pelo tenant
       └─ employer_establishments      estabelecimentos da empresa
            ├─ organizational_units    departamentos, setores e demais unidades
            ├─ employment_relationships
            ├─ organizational_assignments
            └─ project_establishment_links ── projects
```

Os nomes são provisórios. Esta ADR define fronteiras funcionais, não autoriza migrations.

---

## 4. Cardinalidades e regras estruturais

1. Uma organização poderá administrar uma ou mais empresas empregadoras.
2. Uma empresa empregadora pertencerá a exatamente uma organização.
3. Uma empresa empregadora poderá possuir um ou mais estabelecimentos.
4. Um estabelecimento pertencerá a exatamente uma empresa empregadora.
5. Um vínculo pertencerá a uma empresa empregadora.
6. O estabelecimento inicial do vínculo deverá pertencer à mesma empresa empregadora.
7. Alterações de estabelecimento deverão ser versionadas por vigência.
8. Uma obra poderá ser relacionada a zero, um ou mais estabelecimentos conforme a regra futura aprovada.
9. Relacionar uma obra a um estabelecimento não alterará automaticamente vínculos existentes.
10. Encerrar empresa ou estabelecimento não excluirá históricos, folhas, eventos, documentos, protocolos ou alocações passadas.
11. A identificação oficial não será usada como chave primária técnica.
12. A unicidade cadastral será validada no escopo correto e poderá considerar períodos de vigência.
13. A organização permanecerá presente em todas as entidades para aplicação de RLS e isolamento.

---

## 5. Estados recomendados

### Empresa empregadora

```text
RASCUNHO → EM_CONFERENCIA → ATIVA → SUSPENSA → ENCERRADA
                         ↘ CANCELADA
```

### Estabelecimento

```text
RASCUNHO → EM_CONFERENCIA → ATIVO → SUSPENSO → ENCERRADO
                         ↘ CANCELADO
```

Reativação, correção cadastral e retificação histórica deverão possuir fluxos próprios, permissão específica e justificativa. Estado encerrado não será revertido silenciosamente.

---

## 6. Consequências positivas

- suporte a grupos empresariais;
- suporte futuro a escritórios contábeis e BPO de Departamento Pessoal;
- relatórios consolidados ou separados por empresa;
- estabelecimentos com histórico próprio;
- separação clara entre obra e estabelecimento;
- evolução de folha e obrigações sem acoplar identidade jurídica ao tenant;
- preservação do modelo atual de autorização;
- menor risco de duplicar organizações apenas para representar filiais.

---

## 7. Custos e impactos

- novas entidades e relações;
- necessidade de escolher a empresa ativa nos fluxos de DP e folha;
- migração futura de configurações que hoje vivem apenas na organização;
- revisão dos relatórios que assumem uma entidade empresarial por organização;
- necessidade de filtros e permissões por empresa e estabelecimento;
- definição de responsabilidade sobre configurações compartilhadas e específicas;
- validação de como empresas do mesmo tenant compartilham pessoas, documentos e cadastros auxiliares.

---

## 8. Alternativas rejeitadas

### 8.1 Tratar `organizations` como empresa empregadora definitiva

Rejeitada porque limita grupos empresariais, prestadores de serviço e múltiplos estabelecimentos, além de acoplar tenancy a uma interpretação jurídica específica.

### 8.2 Criar uma organização por estabelecimento

Rejeitada porque fragmenta usuários, permissões, relatórios, documentos e operações que precisam ser consolidadas.

### 8.3 Tratar obra como estabelecimento

Rejeitada porque obra é uma entidade operacional e temporal. A relação entre obra e estabelecimento pode existir, mas as duas entidades possuem finalidades, ciclos de vida e históricos distintos.

### 8.4 Guardar empresa e estabelecimento como texto no vínculo

Rejeitada porque impede integridade referencial, versionamento, consolidação, encerramento controlado e integrações confiáveis.

---

## 9. Segurança e autorização

A autorização deverá combinar:

1. organização ativa;
2. módulo habilitado;
3. empresa empregadora autorizada;
4. estabelecimento autorizado, quando houver restrição;
5. capacidade da operação;
6. finalidade e sensibilidade do dado;
7. RLS;
8. autorização interna em RPC privilegiada.

Acesso a uma organização não significará acesso automático a todas as empresas empregadoras administradas por ela.

Capacidades iniciais sugeridas:

- `view_employer_company`;
- `manage_employer_company`;
- `approve_employer_company`;
- `view_establishment`;
- `manage_establishment`;
- `approve_establishment`;
- `view_sensitive_registration_data`;
- `close_establishment`.

Os nomes técnicos definitivos serão compatibilizados com o modelo de permissões existente antes da implementação.

---

## 10. Critérios de aceite da futura implementação

- um tenant administra duas empresas sem duplicar usuários;
- cada empresa possui seus estabelecimentos;
- um vínculo referencia empresa e estabelecimento válidos;
- o sistema bloqueia estabelecimento de empresa diferente;
- empresa ou estabelecimento encerrado não aceita novo vínculo com vigência posterior ao encerramento;
- consulta histórica encontra o estabelecimento vigente na data solicitada;
- obra pode ser relacionada a estabelecimento sem virar cadastro empresarial;
- gestor de obra não recebe acesso a dados cadastrais sensíveis por causa dessa relação;
- relatórios podem consolidar por tenant e separar por empresa e estabelecimento;
- auditoria identifica criação, aprovação, suspensão e encerramento.

---

## 11. Decisões pendentes

- nomenclatura técnica definitiva das entidades;
- suporte a empresa compartilhada entre tenants, atualmente não recomendado;
- regras de compartilhamento de pessoas entre empresas do mesmo tenant;
- estrutura de permissões por empresa e estabelecimento;
- quais configurações pertencem ao tenant, à empresa ou ao estabelecimento;
- tratamento de sucessão, incorporação ou reorganização empresarial;
- integrações oficiais e identificadores aplicáveis;
- regras de encerramento com competências abertas.

---

## 12. Relações com outros documentos

- `docs/PROJETO-RH-ESPECIFICACAO-FUNCIONAL.md`;
- `docs/PROJETO-RH-ADR-001-PESSOA-TRABALHADOR-VINCULO.md`;
- `docs/PROJETO-RH-MODULO-01-CADASTRO-MESTRE.md`;
- `docs/PROJETO-RH-MODULO-02-ESTRUTURA-ORGANIZACIONAL.md`;
- `diretrizes/ARQUITETURA.md`;
- `diretrizes/SPEC.md`.
