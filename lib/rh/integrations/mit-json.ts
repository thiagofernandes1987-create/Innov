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
const judicialMotives=new Set([1,2,4,5,8,9,10,11,12,13]);
function digits(value:string,size:number){return new RegExp(`^\\d{${size}}$`).test(value);}
function inRange(value:unknown,min:number,max:number){return Number.isInteger(value)&&Number(value)>=min&&Number(value)<=max;}
function money2(value:number){return Number.isFinite(value)&&value>=0&&Math.abs(value*100-Math.round(value*100))<1e-7;}
function regimeRequired(q:number,t?:number){return q===9||(q===1&&[1,2,5,6].includes(t??0))||([4,8,10].includes(q)&&![3,4,5,7].includes(t??0))||(q===12&&t!==7);}
function lastDay(year:number,month:number){return new Date(Date.UTC(year,month,0)).getUTCDate();}
function groupAllowed(group:MitDebtGroup,q:number,t:number|undefined,month:number,events:MitSpecialEvent[]){
 if(group==="Irpj")return q!==11;
 if(group==="Csll")return q!==11&&(t!==7||month===3||([1,2].includes(month)&&events.length>0));
 if(group==="Irrf")return ![9,11].includes(q)&&t!==7;
 if(group==="Ipi")return ![2,3,4,5,6].includes(q)&&t!==7;
 if(group==="Cpss")return[2,9,11,12].includes(q)&&t!==7;
 if(group==="RetPagamentoUnificado")return[1,7,10,12].includes(q)&&t!==7;
 return true;
}

export function validateMitDocument(doc:MitDocument){
 const errors:string[]=[];const{MesApuracao:m,AnoApuracao:y}=doc.PeriodoApuracao??{};
 if(!inRange(m,1,12))errors.push("PeriodoApuracao.MesApuracao deve estar entre 1 e 12.");
 if(!inRange(y,2000,9999))errors.push("PeriodoApuracao.AnoApuracao inválido.");
 const events=doc.ListaEventosEspeciais??[];if(events.length>5)errors.push("ListaEventosEspeciais aceita no máximo 5 eventos.");
 const eventIds=new Set<number>(),eventDays=new Set<number>();let previousDay=0;
 for(let index=0;index<events.length;index++){const e=events[index];if(e.IdEvento!==index+1||eventIds.has(e.IdEvento))errors.push("IdEvento deve ser único e sequencial a partir de 1.");eventIds.add(e.IdEvento);if(!inRange(e.DiaEvento,1,31)||eventDays.has(e.DiaEvento)||e.DiaEvento<=previousDay)errors.push("Eventos especiais devem ter dias válidos, únicos e em ordem cronológica.");eventDays.add(e.DiaEvento);previousDay=e.DiaEvento;if(![1,2,3,4,5,6].includes(e.TipoEvento))errors.push("TipoEvento inválido.");}
 const d=doc.DadosIniciais;if(!d)errors.push("DadosIniciais é obrigatório.");else{
  if(!inRange(d.QualificacaoPj,1,12))errors.push("QualificacaoPj deve estar entre 1 e 12.");
  if(!digits(d.ResponsavelApuracao?.CpfResponsavel??"",11))errors.push("CpfResponsavel deve conter 11 dígitos.");
  if(d.ResponsavelApuracao?.TelResponsavel&&(!digits(d.ResponsavelApuracao.TelResponsavel.Ddd,2)||!/^\d{8,9}$/.test(d.ResponsavelApuracao.TelResponsavel.NumTelefone)))errors.push("Telefone do responsável inválido.");
  if((d.ResponsavelApuracao?.EmailResponsavel?.length??0)>60)errors.push("EmailResponsavel excede 60 caracteres.");
  if(d.ResponsavelApuracao?.RegistroCrc){const crc=d.ResponsavelApuracao.RegistroCrc;if(!/^[A-Z]{2}$/.test(crc.UfRegistro))errors.push("RegistroCrc.UfRegistro deve conter UF em maiúsculas.");if(!/^[A-Z0-9]{6,11}$/.test(crc.NumRegistro))errors.push("RegistroCrc.NumRegistro deve conter 6 a 11 caracteres alfanuméricos.");}
  if(d.SemMovimento){if(doc.Debitos)errors.push("Apuração sem movimento não pode conter Debitos.");if(doc.ListaSuspensoes?.length)errors.push("Apuração sem movimento não pode conter ListaSuspensoes.");}
  else{
   if(d.QualificacaoPj!==11&&!inRange(d.TributacaoLucro,1,7))errors.push("TributacaoLucro é obrigatória para a qualificação informada.");
   if(!inRange(d.VariacoesMonetarias,1,3))errors.push("VariacoesMonetarias deve estar entre 1 e 3.");
   if(regimeRequired(d.QualificacaoPj,d.TributacaoLucro)&&!inRange(d.RegimePisCofins,1,4))errors.push("RegimePisCofins é obrigatório para a combinação informada.");
   const present=groups.filter(g=>doc.Debitos?.[g]);if(!doc.Debitos||present.length===0)errors.push("Apuração com movimento deve conter ao menos um grupo de débito.");
   for(const group of present)if(!groupAllowed(group,d.QualificacaoPj,d.TributacaoLucro,m,events))errors.push(`${group}: grupo não permitido para a qualificação/tributação/período informados.`);
   const ld=inRange(y,2000,9999)&&inRange(m,1,12)?lastDay(y,m):31;const disqualifiesBalance=events.some(e=>[1,2,3,5].includes(e.TipoEvento)||([4,6].includes(e.TipoEvento)&&e.DiaEvento===ld));
   if(d.TributacaoLucro===1&&!disqualifiesBalance&&typeof doc.Debitos?.BalancoLucroReal!=="boolean")errors.push("BalancoLucroReal é obrigatório para Lucro Real Anual nesta situação.");
  }
 }
 const afterEventAllowed=inRange(y,2000,9999)&&inRange(m,1,12)&&events.some(e=>[4,6].includes(e.TipoEvento)&&e.DiaEvento!==lastDay(y,m));
 const allDebts:MitDebt[]=[];
 for(const group of groups){const block=doc.Debitos?.[group];if(!block)continue;const regular=block.ListaDebitos??[],after=block.ListaDebitosAposEvento??[];if(!regular.length&&!after.length)errors.push(`${group}: informe ListaDebitos ou ListaDebitosAposEvento.`);if(after.length&&!afterEventAllowed)errors.push(`${group}: ListaDebitosAposEvento exige cisão parcial/incorporação incorporadora antes do último dia do mês.`);
  for(const debt of[...regular,...after]){allDebts.push(debt);if(!Number.isInteger(debt.IdDebito)||debt.IdDebito<1)errors.push(`${group}: IdDebito inválido.`);if(!digits(debt.CodigoDebito,6))errors.push(`${group}: CodigoDebito deve conter 6 dígitos.`);if(!money2(debt.ValorDebito))errors.push(`${group}: ValorDebito deve ser não negativo e ter no máximo 2 casas decimais.`);if(debt.IdEventoDebito!=null&&!eventIds.has(debt.IdEventoDebito))errors.push(`${group}: IdEventoDebito não referencia evento existente.`);if(debt.CnpjEstabelecimento&&!digits(debt.CnpjEstabelecimento,6))errors.push(`${group}: CnpjEstabelecimento deve conter os 6 dígitos finais.`);if(debt.CnpjIncorporacao&&!(/^\d{6}$/.test(debt.CnpjIncorporacao)||/^\d{14}$/.test(debt.CnpjIncorporacao)))errors.push(`${group}: CnpjIncorporacao deve conter 6 ou 14 dígitos.`);if(debt.CnpjScp&&!digits(debt.CnpjScp,14))errors.push(`${group}: CnpjScp deve conter 14 dígitos.`);if(debt.CodigoMunicipioOuro&&!digits(debt.CodigoMunicipioOuro,7))errors.push(`${group}: CodigoMunicipioOuro deve conter 7 dígitos.`);}
  for(const debt of after)if(debt.IdEventoDebito==null)errors.push(`${group}: débito após evento exige IdEventoDebito.`);
 }
 const ids=allDebts.map(x=>x.IdDebito).sort((a,b)=>a-b);if(new Set(ids).size!==ids.length)errors.push("IdDebito deve ser único em toda a apuração.");for(let i=0;i<ids.length;i++)if(ids[i]!==i+1){errors.push("IdDebito deve ser sequencial a partir de 1.");break;}
 if(doc.ListaSuspensoes?.length&&events.length)errors.push("ListaSuspensoes não pode coexistir com ListaEventosEspeciais.");
 for(const s of doc.ListaSuspensoes??[]){if(![1,2].includes(s.TipoSuspensao))errors.push("TipoSuspensao inválido.");if(!/^\d{17}$|^\d{20}$/.test(s.NumeroProcesso))errors.push("NumeroProcesso deve conter 17 ou 20 dígitos.");if(!s.ListaDebitosSuspensos?.length)errors.push("Suspensão deve referenciar ao menos um débito.");if(s.TipoSuspensao===2){if(!judicialMotives.has(s.MotivoSuspensao??0))errors.push("Suspensão judicial exige MotivoSuspensao oficial válido.");if(s.MotivoSuspensao!==2&&typeof s.ComDeposito!=="boolean")errors.push("Suspensão judicial exige ComDeposito quando o motivo for diferente de 2.");if(typeof s.ProcessoTerceiro!=="boolean")errors.push("Suspensão judicial exige ProcessoTerceiro.");if(!Number.isInteger(s.DataDecisao)||String(s.DataDecisao).length!==8)errors.push("Suspensão judicial exige DataDecisao no formato AAAAMMDD.");if(!inRange(s.VaraJudiciaria,1,9999))errors.push("Suspensão judicial exige VaraJudiciaria entre 1 e 9999.");if(!digits(s.CodigoMunicipioSj??"",7))errors.push("Suspensão judicial exige CodigoMunicipioSj com 7 dígitos.");}
  for(const x of s.ListaDebitosSuspensos??[]){if(!ids.includes(x.IdDebitoSuspenso))errors.push("IdDebitoSuspenso não referencia débito existente.");if(!money2(x.ValorSuspenso))errors.push("ValorSuspenso deve ser não negativo e ter no máximo 2 casas decimais.");}}
 return{valid:errors.length===0,errors};
}

export function renderMitJson(doc:MitDocument){const result=validateMitDocument(doc);if(!result.valid)throw new Error(`MIT JSON inválido: ${result.errors.join(" ")}`);return JSON.stringify(doc,null,2)+"\n";}
export function mitFilename(cnpjRoot:string,doc:MitDocument){if(!digits(cnpjRoot,8))throw new Error("Raiz do CNPJ deve conter 8 dígitos.");const{MesApuracao,AnoApuracao}=doc.PeriodoApuracao;return`${cnpjRoot}-MIT-${AnoApuracao}${String(MesApuracao).padStart(2,"0")}.json`;}
