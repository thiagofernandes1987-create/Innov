export const MIT_LAYOUT_VERSION="1.0" as const;
export const MIT_LAYOUT_DATE="2025-02-20" as const;

export type MitDebtGroup="Irpj"|"Csll"|"Irrf"|"Ipi"|"Iof"|"PisPasep"|"Cofins"|"ContribuicoesDiversas"|"Cpss"|"RetPagamentoUnificado";
export type MitDebt={IdDebito:number;CodigoDebito:string;ValorDebito:number;IdEventoDebito?:number;PaDebito?:number;AnoPostergado?:number;TrimPostergado?:number;AnoDebito?:number;CnpjEstabelecimento?:string;CnpjIncorporacao?:string;CnpjScp?:string;CodigoMunicipioOuro?:string};
export type MitDebtBlock={ListaDebitos?:MitDebt[];ListaDebitosAposEvento?:MitDebt[]};
export type MitSpecialEvent={IdEvento:number;DiaEvento:number;TipoEvento:1|2|3|4|5|6};
export type MitSuspendedDebt={IdDebitoSuspenso:number;ValorSuspenso:number};
export type MitSuspension={TipoSuspensao:1|2;MotivoSuspensao?:number;ComDeposito?:boolean;NumeroProcesso:string;ProcessoTerceiro?:boolean;DataDecisao?:number;VaraJudiciaria?:number;CodigoMunicipioSj?:string;ListaDebitosSuspensos:MitSuspendedDebt[]};
export type MitInitialData={SemMovimento:boolean;QualificacaoPj:number;TributacaoLucro?:number;VariacoesMonetarias?:number;RegimePisCofins?:number;ResponsavelApuracao:{CpfResponsavel:string;TelResponsavel?:{Ddd:string;NumTelefone:string};EmailResponsavel?:string;RegistroCrc?:{UfRegistro:string;NumRegistro:string}}};
export type MitDocument={PeriodoApuracao:{MesApuracao:number;AnoApuracao:number};ListaEventosEspeciais?:MitSpecialEvent[];DadosIniciais:MitInitialData;Debitos?:Partial<Record<MitDebtGroup,MitDebtBlock>>&{BalancoLucroReal?:boolean};ListaSuspensoes?:MitSuspension[]};

const groups:MitDebtGroup[]=["Irpj","Csll","Irrf","Ipi","Iof","PisPasep","Cofins","ContribuicoesDiversas","Cpss","RetPagamentoUnificado"];
function digits(value:string,size:number){return new RegExp(`^\\d{${size}}$`).test(value);}
function regimeRequired(q:number,t?:number){return q===9||(q===1&&[1,2,5,6].includes(t??0))||([4,8,10].includes(q)&&![3,4,5,7].includes(t??0))||(q===12&&t!==7);}

export function validateMitDocument(doc:MitDocument){
 const errors:string[]=[];const{MesApuracao:m,AnoApuracao:y}=doc.PeriodoApuracao??{};
 if(!Number.isInteger(m)||m<1||m>12)errors.push("PeriodoApuracao.MesApuracao deve estar entre 1 e 12.");
 if(!Number.isInteger(y)||y<2000||y>9999)errors.push("PeriodoApuracao.AnoApuracao inválido.");
 const d=doc.DadosIniciais;if(!d)errors.push("DadosIniciais é obrigatório.");else{
  if(!Number.isInteger(d.QualificacaoPj)||d.QualificacaoPj<1||d.QualificacaoPj>12)errors.push("QualificacaoPj deve estar entre 1 e 12.");
  if(!digits(d.ResponsavelApuracao?.CpfResponsavel??"",11))errors.push("CpfResponsavel deve conter 11 dígitos.");
  if(d.ResponsavelApuracao?.TelResponsavel&&(!digits(d.ResponsavelApuracao.TelResponsavel.Ddd,2)||!/^\d{8,9}$/.test(d.ResponsavelApuracao.TelResponsavel.NumTelefone)))errors.push("Telefone do responsável inválido.");
  if(d.SemMovimento){if(doc.Debitos)errors.push("Apuração sem movimento não pode conter Debitos.");if(doc.ListaSuspensoes?.length)errors.push("Apuração sem movimento não pode conter ListaSuspensoes.");}
  else{
   if(d.QualificacaoPj!==11&&(!Number.isInteger(d.TributacaoLucro)||d.TributacaoLucro!<1||d.TributacaoLucro!>7))errors.push("TributacaoLucro é obrigatória para a qualificação informada.");
   if(!Number.isInteger(d.VariacoesMonetarias)||d.VariacoesMonetarias!<1||d.VariacoesMonetarias!>3)errors.push("VariacoesMonetarias deve estar entre 1 e 3.");
   if(regimeRequired(d.QualificacaoPj,d.TributacaoLucro)&&(!Number.isInteger(d.RegimePisCofins)||d.RegimePisCofins!<1||d.RegimePisCofins!>4))errors.push("RegimePisCofins é obrigatório para a combinação informada.");
   const present=groups.filter(g=>doc.Debitos?.[g]);if(!doc.Debitos||present.length===0)errors.push("Apuração com movimento deve conter ao menos um grupo de débito.");
  }
 }
 const events=doc.ListaEventosEspeciais??[];if(events.length>5)errors.push("ListaEventosEspeciais aceita no máximo 5 eventos.");
 const eventIds=new Set<number>(),eventDays=new Set<number>();for(const e of events){if(!Number.isInteger(e.IdEvento)||e.IdEvento<1||e.IdEvento>5||eventIds.has(e.IdEvento))errors.push("IdEvento deve ser único entre 1 e 5.");eventIds.add(e.IdEvento);if(!Number.isInteger(e.DiaEvento)||e.DiaEvento<1||e.DiaEvento>31||eventDays.has(e.DiaEvento))errors.push("DiaEvento deve ser válido e não repetido.");eventDays.add(e.DiaEvento);if(![1,2,3,4,5,6].includes(e.TipoEvento))errors.push("TipoEvento inválido.");}
 const allDebts:MitDebt[]=[];for(const group of groups){const block=doc.Debitos?.[group];for(const debt of[...(block?.ListaDebitos??[]),...(block?.ListaDebitosAposEvento??[])]){allDebts.push(debt);if(!Number.isInteger(debt.IdDebito)||debt.IdDebito<1)errors.push(`${group}: IdDebito inválido.`);if(!digits(debt.CodigoDebito,6))errors.push(`${group}: CodigoDebito deve conter 6 dígitos.`);if(!Number.isFinite(debt.ValorDebito)||debt.ValorDebito<0)errors.push(`${group}: ValorDebito inválido.`);if(debt.IdEventoDebito!=null&&!eventIds.has(debt.IdEventoDebito))errors.push(`${group}: IdEventoDebito não referencia evento existente.`);if(debt.CnpjEstabelecimento&&!digits(debt.CnpjEstabelecimento,6))errors.push(`${group}: CnpjEstabelecimento deve conter os 6 dígitos finais.`);if(debt.CnpjScp&&!digits(debt.CnpjScp,14))errors.push(`${group}: CnpjScp deve conter 14 dígitos.`);if(debt.CodigoMunicipioOuro&&!digits(debt.CodigoMunicipioOuro,7))errors.push(`${group}: CodigoMunicipioOuro deve conter 7 dígitos.`);}}
 const ids=allDebts.map(x=>x.IdDebito).sort((a,b)=>a-b);if(new Set(ids).size!==ids.length)errors.push("IdDebito deve ser único em toda a apuração.");for(let i=0;i<ids.length;i++)if(ids[i]!==i+1){errors.push("IdDebito deve ser sequencial a partir de 1.");break;}
 if(doc.ListaSuspensoes?.length&&events.length)errors.push("ListaSuspensoes não pode coexistir com ListaEventosEspeciais.");for(const s of doc.ListaSuspensoes??[]){if(![1,2].includes(s.TipoSuspensao))errors.push("TipoSuspensao inválido.");if(!/^\d{17}$|^\d{20}$/.test(s.NumeroProcesso))errors.push("NumeroProcesso deve conter 17 ou 20 dígitos.");if(!s.ListaDebitosSuspensos?.length)errors.push("Suspensão deve referenciar ao menos um débito.");for(const x of s.ListaDebitosSuspensos??[]){if(!ids.includes(x.IdDebitoSuspenso))errors.push("IdDebitoSuspenso não referencia débito existente.");if(!Number.isFinite(x.ValorSuspenso)||x.ValorSuspenso<0)errors.push("ValorSuspenso inválido.");}}
 return{valid:errors.length===0,errors};
}

export function renderMitJson(doc:MitDocument){const result=validateMitDocument(doc);if(!result.valid)throw new Error(`MIT JSON inválido: ${result.errors.join(" ")}`);return JSON.stringify(doc,null,2)+"\n";}
export function mitFilename(cnpjRoot:string,doc:MitDocument){if(!digits(cnpjRoot,8))throw new Error("Raiz do CNPJ deve conter 8 dígitos.");const{MesApuracao,AnoApuracao}=doc.PeriodoApuracao;return`${cnpjRoot}-MIT-${AnoApuracao}${String(MesApuracao).padStart(2,"0")}.json`;}
