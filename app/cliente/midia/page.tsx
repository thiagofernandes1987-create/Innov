import { requireClientContext } from "@/lib/auth";
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

  const paths = (data ?? []).map((media) => media.storage_path);
  const { data: signed } = paths.length ? await supabase.storage.from("daily-log-media").createSignedUrls(paths, 900) : { data: [] };
  const signedByPath = new Map((signed ?? []).map((item) => [item.path, item.signedUrl]));

  return (
    <main className="content">
      <div className="page-head"><div><span className="badge">REGISTROS DE CAMPO</span><h1>Fotos e vídeos</h1><p className="muted">Evidências aprovadas e liberadas pela Innovar.</p></div></div>
      {error ? <div className="validation blocking">{error.message}</div> : null}
      <section className="media-grid">
        {(data ?? []).map((media) => {
          const project = singleRelation(media.projects);
          const log = singleRelation(media.daily_logs);
          const url = signedByPath.get(media.storage_path);
          const image = media.mime_type.startsWith("image/");
          return <article className="media-card" key={media.id}><a href={url ?? "#"} target="_blank" rel="noreferrer"><div className="media-preview">{image && url ? <img src={url} alt={media.caption || media.file_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <strong>{media.mime_type.startsWith("video/") ? "Reproduzir vídeo" : "Abrir arquivo"}</strong>}</div></a><div className="card-pad"><span className="badge">{project?.code || "OBRA"}</span><h3>{media.caption || media.file_name}</h3><p className="muted">{project?.name || ""}</p><p className="muted">{formatDate(log?.log_date || media.captured_at?.slice(0, 10) || media.created_at.slice(0, 10))}</p></div></article>;
        })}
        {!data?.length ? <article className="card card-pad"><strong>Nenhuma mídia foi liberada.</strong></article> : null}
      </section>
    </main>
  );
}
