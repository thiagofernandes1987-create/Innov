import "server-only";

export type EsocialOccurrence = {
  code: string | null;
  description: string | null;
  type: string | null;
  location: string | null;
};

export type EsocialIndividualResult = {
  eventId: string;
  responseCode: string | null;
  responseDescription: string | null;
  receiptNumber: string | null;
  status: "ACCEPTED" | "REJECTED" | "PROCESSING" | "UNKNOWN";
  occurrences: EsocialOccurrence[];
};

function decodeXml(value:string){
  return value
    .replaceAll("&lt;","<")
    .replaceAll("&gt;",">")
    .replaceAll("&quot;",'"')
    .replaceAll("&apos;", "'")
    .replaceAll("&amp;","&");
}

function stripCdata(value:string){
  const trimmed=value.trim();
  const match=trimmed.match(/^<!\[CDATA\[([\s\S]*)\]\]>$/);
  return match?match[1]:trimmed;
}

function tagValue(xml:string,tag:string){
  const match=xml.match(new RegExp(`<(?:[A-Za-z_][\\w.-]*:)?${tag}\\b[^>]*>([\\s\\S]*?)<\\/(?:[A-Za-z_][\\w.-]*:)?${tag}>`,`i`));
  if(!match)return null;
  return decodeXml(stripCdata(match[1]).replace(/<[^>]+>/g,"").trim())||null;
}

function eventIdFromOpeningTag(openingTag:string){
  return openingTag.match(/\bId=["']([^"']+)["']/i)?.[1]?.trim()
    ?? openingTag.match(/\bid=["']([^"']+)["']/i)?.[1]?.trim()
    ?? null;
}

function parseOccurrences(xml:string):EsocialOccurrence[]{
  const result:EsocialOccurrence[]=[];
  const occurrencePattern=/<(?:[A-Za-z_][\w.-]*:)?ocorrencia\b[^>]*>([\s\S]*?)<\/(?:[A-Za-z_][\w.-]*:)?ocorrencia>/gi;
  let match:RegExpExecArray|null;
  while((match=occurrencePattern.exec(xml))){
    const body=match[1];
    result.push({
      code:tagValue(body,"codigo"),
      description:tagValue(body,"descricao"),
      type:tagValue(body,"tipo"),
      location:tagValue(body,"localizacao")
    });
  }
  return result;
}

function normalizeEmbeddedXml(value:string){
  let current=value.trim();
  for(let i=0;i<2;i+=1){
    if(current.includes("&lt;")||current.startsWith("<![CDATA["))current=decodeXml(stripCdata(current));
  }
  return current;
}

export function parseEsocialIndividualResults(responseXml:string):EsocialIndividualResult[]{
  const xml=normalizeEmbeddedXml(responseXml);
  const results:EsocialIndividualResult[]=[];

  // O retorno oficial encapsula cada resultado em um elemento `evento` com
  // atributo Id. O parser é namespace-insensitive e tolera o XML de retorno
  // diretamente no nó ou codificado/CDATA, porque clientes SOAP podem expor
  // o payload de formas diferentes.
  const eventPattern=/(<(?:[A-Za-z_][\w.-]*:)?evento\b[^>]*\bId=["'][^"']+["'][^>]*>)([\s\S]*?)<\/(?:[A-Za-z_][\w.-]*:)?evento>/gi;
  let eventMatch:RegExpExecArray|null;
  while((eventMatch=eventPattern.exec(xml))){
    const eventId=eventIdFromOpeningTag(eventMatch[1]);
    if(!eventId)continue;
    const body=normalizeEmbeddedXml(eventMatch[2]);
    const receiptNumber=tagValue(body,"nrRecibo");
    const responseCode=tagValue(body,"cdResposta");
    const responseDescription=tagValue(body,"descResposta");
    const occurrences=parseOccurrences(body);

    let status:EsocialIndividualResult["status"];
    if(receiptNumber){
      status="ACCEPTED";
    }else if(responseCode==="101"){
      status="PROCESSING";
    }else if(responseCode||occurrences.length){
      status="REJECTED";
    }else{
      status="UNKNOWN";
    }

    results.push({eventId,responseCode,responseDescription,receiptNumber,status,occurrences});
  }

  const unique=new Map<string,EsocialIndividualResult>();
  for(const item of results)unique.set(item.eventId,item);
  return [...unique.values()];
}
