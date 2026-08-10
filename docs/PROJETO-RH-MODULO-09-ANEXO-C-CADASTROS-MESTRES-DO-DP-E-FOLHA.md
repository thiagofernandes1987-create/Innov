# Projeto RH — Módulo 09 — Anexo C — Cadastros Mestres do DP e da Folha

**Versão:** 0.1.0  
**Estado:** especificação funcional detalhada; implementação pendente  
**Data:** 7 de agosto de 2026

## 1. Regra

A folha não criará cadastros paralelos. Ela consome versões canônicas dos módulos de Pessoa, Organização e Contratos, acrescentando somente configurações específicas de processamento.

## 2. Empresa empregadora

Tela de origem: `/app/rh/estrutura/empresas/[id]`

Campos funcionais mínimos:
- organização/tenant;
- razão social/nome;
- inscrição principal;
- classificação tributária versionada;
- natureza jurídica e demais classificadores necessários;
- início/fim da responsabilidade da organização;
- configuração de folha;
- calendário de pagamento;
- responsáveis de DP/folha;
- certificado/procuração apenas por referência segura;
- status operacional.

Integrações:
- eSocial S-1000 e eventos que dependem do empregador;
- DCTFWeb por contribuinte;
- FGTS Digital;
- Financeiro/Contabilidade.

## 3. Estabelecimento

Tela: `/app/rh/estrutura/estabelecimentos/[id]`

Campos:
- empresa empregadora;
- tipo/inscrição;
- endereço;
- vigência;
- identificação externa aplicável;
- dados de SST e lotação por relacionamento, não duplicação;
- centro de custo padrão opcional;
- status.

Regras:
- estabelecimento ≠ obra ≠ unidade organizacional ≠ lotação tributária;
- histórico não é apagado;
- mudança de inscrição cria nova vigência/objeto quando necessário.

Integração eSocial: S-1005 quando aplicável.

## 4. Lotação tributária

Tela: `/app/departamento-pessoal/cadastros/lotacoes-tributarias`

Campos:
- código interno;
- empresa;
- tipo de lotação externo;
- código externo/mapeamento S-1020;
- FPAS/terceiros e demais metadados necessários quando aplicáveis;
- estabelecimento/CNO/contexto relacionado;
- vigência;
- regra de aplicabilidade por trabalhador/categoria;
- status de sincronização eSocial;
- recibo/versão externa aceita.

Fluxo:
```text
criar versão
→ validar compatibilidade com classificação tributária
→ aprovar
→ projetar S-1020
→ transmitir/aceitar
→ habilitar uso nas remunerações da vigência
```

Uma remuneração não pode escolher lotação somente por “última disponível”; a seleção deve ser determinística e auditável.

## 5. Empregado

O empregado é `Pessoa → Trabalhador → Vínculo`.

Para folha, o snapshot inclui:
- matrícula;
- categoria;
- empresa/estabelecimento;
- contrato;
- salário;
- cargo/função;
- lotação;
- jornada;
- sindicato/instrumento quando aplicável;
- dependentes relevantes;
- conta de pagamento;
- situação na competência.

A conta bancária e documentos sensíveis permanecem protegidos e não são copiados para resultados além do necessário.

## 6. Trabalhador sem vínculo — TSV

Tela: `/app/rh/trabalhadores-sem-vinculo`

Objeto separado de emprego CLT/contrato empregatício.

Campos:
- pessoa/trabalhador;
- categoria externa versionada;
- início/fim;
- empresa/estabelecimento/lotação;
- função/atividade;
- remuneração/contrato de origem quando houver;
- incidências/regras aplicáveis;
- evento eSocial originário;
- status.

Integrações eSocial baseline:
- S-2300;
- S-2306;
- S-2399;
- evento de remuneração adequado à categoria, selecionado pelo catálogo vigente.

## 7. Cargo

Cargo é identidade organizacional/contratual, com:
- código;
- nome;
- descrição;
- família/classificação quando aplicável;
- vigência;
- requisitos;
- nível/faixa salarial referencial opcional;
- status.

Cargo não contém automaticamente regras tributárias.

## 8. Função

Função representa atividade efetivamente exercida, podendo divergir do cargo conforme situação válida.

Campos:
- código/nome;
- descrição;
- vigência;
- cargo(s) compatíveis;
- riscos/exposições relacionados por M08;
- adicionais potencialmente relacionados apenas como referência — nunca concessão automática;
- mapeamentos externos quando necessários.

## 9. Sindicato e instrumento coletivo

Tela: `/app/departamento-pessoal/cadastros/sindicatos`

### Sindicato
- identificação;
- tipo/representação;
- abrangência territorial/categoria quando configurada;
- contatos;
- vigência do relacionamento;
- documentos.

### Instrumento coletivo
- sindicato(s)/partes;
- tipo;
- período de vigência;
- data-base;
- documento assinado;
- cláusulas estruturadas aprovadas;
- pisos;
- adicionais;
- percentuais de hora extra/noturno quando previstos;
- regras de benefício;
- calendários/compensações;
- parâmetros de folha derivados;
- responsável jurídico/DP pela interpretação.

Fluxo:
```text
documento coletivo
→ interpretação humana aprovada
→ parâmetros estruturados
→ testes/simulação
→ publicação com vigência
→ folha usa versão aplicável
```

O sistema não interpretará CCT automaticamente para alterar folha oficial sem revisão humana.

## 10. Jornada

Origem: M04/M05.

Snapshot da folha:
- jornada contratual;
- divisor/parâmetro quando aplicável;
- escala no período;
- calendário;
- fechamento do ponto;
- fatos remuneratórios consolidados.

A folha nunca calcula horas extras lendo batidas brutas.

## 11. Salários e histórico salarial

Tela: `/app/rh/contratos/[id]/remuneracao`

Cada alteração salarial é uma versão:
- valor;
- unidade (mensal/hora etc.);
- moeda;
- início de vigência;
- motivo;
- origem (admissão, promoção, reajuste, instrumento coletivo etc.);
- documento;
- aprovadores;
- impacto retroativo;
- evento eSocial relacionado quando aplicável.

Não existe `employee.salary` mutável sem histórico.

## 12. Conta de pagamento

Dados bancários são versão separada, com:
- titularidade;
- banco/agência/conta/chave quando aplicável;
- vigência;
- status de validação;
- origem;
- mascaramento;
- alteração com revalidação antes de pagamento.

## 13. Dependentes relevantes à folha

O cadastro de pessoa relacionada não cria automaticamente dependência fiscal/benefício/pensão.

Papéis separados:
- dependente cadastral;
- dependente para IR;
- dependente de benefício;
- beneficiário de pensão;
- beneficiário de seguro.

Cada finalidade tem vigência e evidência próprias.

## 14. Parametrização por empresa

O perfil de folha da empresa referencia versões de:
- calendário;
- política de adiantamento;
- regras de arredondamento;
- parâmetros patronais;
- convenções aplicáveis;
- rubricas habilitadas;
- contabilização;
- centros de custo/rateios;
- regras de aprovação;
- integração bancária;
- eSocial/ambiente;
- integrações DCTFWeb/FGTS disponíveis.

Não duplica as tabelas legais globais; referencia versões aprovadas.

## 15. Críticas cadastrais pré-folha

Bloqueios mínimos:
- empresa sem classificação/configuração vigente;
- estabelecimento ausente;
- lotação tributária necessária sem versão aceita;
- trabalhador sem categoria;
- vínculo sem contrato vigente;
- salário ausente;
- jornada necessária ausente;
- cargo/função incompatível quando houver regra;
- sindicato/instrumento obrigatório sem decisão registrada;
- conta inválida para pagamento quando o meio exigir;
- duplicidade de matrícula/vínculo no mesmo escopo.
