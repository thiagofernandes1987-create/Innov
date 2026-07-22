import{
 FILE_SECURITY_STATUS_LABELS,
 type FileSecurityStatus
}from"@/lib/file-security/domain";

const statusClasses:Record<FileSecurityStatus,string>={
 LEGACY:"badge badge-warning",
 PENDING:"badge badge-warning",
 SCANNING:"badge",
 CLEAN:"badge badge-success",
 BLOCKED:"badge badge-danger",
 ERROR:"badge badge-danger"
};

export function FileSecurityStatus({status}:Readonly<{status:FileSecurityStatus}>){
 return(
  <span className={statusClasses[status]} role="status" aria-live={status==="SCANNING"?"polite":"off"}>
   {FILE_SECURITY_STATUS_LABELS[status]}
  </span>
 );
}
