import Link from"next/link";

export default async function AdmissionCaseLayout({children,params}:{children:React.ReactNode;params:Promise<{id:string}>}){const{id}=await params;return <><div className="content" style={{paddingBottom:0}}><nav className="page-actions" aria-label="Navegação do caso de admissão"><Link className="button button-secondary" href={`/app/rh/admissoes/${id}`}>Resumo da admissão</Link><Link className="button button-secondary" href={`/app/rh/admissoes/${id}/esocial-especial`}>Casos especiais eSocial</Link></nav></div>{children}</>}
