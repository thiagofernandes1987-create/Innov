import Link from "next/link";
import { createQualityTemplate } from "@/app/actions/quality";
import { QualityFormBuilder } from "@/components/quality/quality-form-builder";
import { requireCapability } from "@/lib/authorization";

export default async function NewQualityForm({searchParams}:{searchParams:Promise<{error?:string;kind?:string}>}){
  const query=await searchParams;await requireCapability("qualidade","create");
  const kind=["FVS","FVM","INTERNAL_FORM","CLIENT_FORM","SURVEY"].includes(query.kind??"")?query.kind as "FVS"|"FVM"|"INTERNAL_FORM"|"CLIENT_FORM"|"SURVEY":"INTERNAL_FORM";
  return <main className="content quality-app"><Link className="back-link" href="/app/qualidade/formularios">← Modelos</Link><section className="page-heading"><div><span className="badge">CONSTRUTOR INTERNO</span><h1>Novo formulário</h1><p>Monte campos sem programação. O modelo será salvo como JSON versionado e poderá receber novas versões depois.</p></div></section>{query.error&&<div className="validation blocking">{query.error}</div>}<QualityFormBuilder action={createQualityTemplate} initialKind={kind}/></main>;
}
