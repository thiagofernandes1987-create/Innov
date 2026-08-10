import Image from "next/image";
import { requireClientContext } from "@/lib/auth";
import { reportDataAccessError } from "@/lib/errors/data-access";
import { formatDate } from "@/lib/stage12";
import { singleRelation } from "@/lib/supabase/relations";

export default async function ClientMediaPage() {
  const { supabase } = await requireClientContext();
  const { data, error } = await supabase
    .from("daily_log_media")
    .select("id,project_id,storage_path,file_name,mime_type,caption,captured_at,created_at,projects(code,name),daily_logs(log_date,summary)")
    .eq("client_visible", true)
    .order("created_at", { ascending: false })
    .limit(120);

  if (error) reportDataAccessError("client-media.page.load", error);

  const paths = (data ?? []).map((media) => media.storage_path);
  const signedResult = paths.length
    ? await supabase.storage.from("daily-log-media").createSignedUrls(paths, 900)
    : { data: [], error: null };
  if (signedResult.error) reportDataAccessError("client-media.page.sign-urls", signedResult.error);

  const signedByPath = new Map((signedResult.data ?? []).map((item) => [item.path, item.signedUrl]));

  return (
    <main className="content">
      <div className="page-head"><div><span className="badge">REGISTROS DE CAMPO</span><h1>Fotos e vídeos</h1><p className="muted">Evidências aprovadas e liberadas pela Innovar.</p></div></div>
      {error ? <div className="validation blocking">Não foi possível carregar as mídias liberadas.</div> : null}
      {signedResult.error ? <div className="validation blocking">Alguns arquivos não puderam ser preparados para visualização.</div> : null}
      <section className="media-grid">
        {(data ?? []).map((media) => {
          const project = singleRelation(media.projects);
          const log = singleRelation(media.daily_logs);
          const url = signedByPath.get(media.storage_path);
          const image = media.mime_type.startsWith("image/");
          return <article className="media-card" key={media.id}><a href={url ?? "#"} target="_blank" rel="noreferrer"><div className="media-preview" style={{ position: "relative" }}>{image && url ? <Image src={url} alt={media.caption || media.file_name} fill sizes="(max-width: 700px) 100vw, 33vw" unoptimized style={{ objectFit: "cover" }} /> : <strong>{media.mime_type.startsWith("video/") ? "Reproduzir vídeo" : "Abrir arquivo"}</strong>}</div></a><div className="card-pad"><span className="badge">{project?.code || "OBRA"}</span><h3>{media.caption || media.file_name}</h3><p className="muted">{project?.name || ""}</p><p className="muted">{formatDate(log?.log_date || media.captured_at?.slice(0, 10) || media.created_at.slice(0, 10))}</p></div></article>;
        })}
        {!data?.length ? <article className="card card-pad"><strong>Nenhuma mídia foi liberada.</strong></article> : null}
      </section>
    </main>
  );
}
