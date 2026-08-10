export type GovernmentChannel =
  | "OFFICIAL_WEB_SERVICE"
  | "DIRECT_API"
  | "AUTOMATIC_GOVERNMENT_FEED"
  | "OFFICIAL_FILE_IMPORT"
  | "PORTAL_ASSISTED";

export const ESOCIAL_ENDPOINTS = {
  restricted: {
    send: "https://webservices.producaorestrita.esocial.gov.br/servicos/empregador/enviarloteeventos/WsEnviarLoteEventos.svc",
    query: "https://webservices.producaorestrita.esocial.gov.br/servicos/empregador/consultarloteeventos/WsConsultarLoteEventos.svc"
  },
  production: {
    send: "https://webservices.envio.esocial.gov.br/servicos/empregador/enviarloteeventos/WsEnviarLoteEventos.svc",
    query: "https://webservices.consulta.esocial.gov.br/servicos/empregador/consultarloteeventos/WsConsultarLoteEventos.svc"
  }
} as const;

export const GOVERNMENT_CAPABILITIES = [
  {system:"eSocial",capability:"GENERATE_TABLE_EVENTS",channel:"OFFICIAL_WEB_SERVICE" as GovernmentChannel,status:"IMPLEMENTED",reference:"eSocial S-1.3 · S-1000/S-1005/S-1010/S-1020"},
  {system:"eSocial",capability:"XMLDSIG",channel:"OFFICIAL_WEB_SERVICE" as GovernmentChannel,status:"IMPLEMENTED",reference:"XMLDSig RSA-SHA256 por evento"},
  {system:"eSocial",capability:"SEND_BATCH",channel:"OFFICIAL_WEB_SERVICE" as GovernmentChannel,status:"IMPLEMENTING",reference:"eSocial · Manual do Desenvolvedor v1.15 / S-1.3"},
  {system:"eSocial",capability:"QUERY_BATCH",channel:"OFFICIAL_WEB_SERVICE" as GovernmentChannel,status:"IMPLEMENTING",reference:"eSocial · Produção e Produção Restrita"},
  {system:"DCTFWeb",capability:"SOURCE_APURATION",channel:"AUTOMATIC_GOVERNMENT_FEED" as GovernmentChannel,status:"DESIGNED",reference:"RFB · fechamento eSocial/EFD-Reinf sensibiliza DCTFWeb"},
  {system:"DCTFWeb",capability:"INTEGRA_CONTADOR",channel:"DIRECT_API" as GovernmentChannel,status:"CONTRACT_REQUIRED",reference:"RFB/Serpro · APIs DCTFWeb via Integra Contador conforme contratação"},
  {system:"DCTFWeb",capability:"MIT_IMPORT",channel:"OFFICIAL_FILE_IMPORT" as GovernmentChannel,status:"PLANNED",reference:"RFB · MIT JSON layout 1.0"},
  {system:"FGTS Digital",capability:"REMUNERATION_SOURCE",channel:"AUTOMATIC_GOVERNMENT_FEED" as GovernmentChannel,status:"DESIGNED",reference:"MTE · remunerações declaradas no eSocial"},
  {system:"FGTS Digital",capability:"RESCISSION_IMPORT",channel:"OFFICIAL_FILE_IMPORT" as GovernmentChannel,status:"PLANNED",reference:"MTE · leiaute Remunerações para Fins Rescisórios v1.2"},
  {system:"FGTS Digital",capability:"GUIDE_MANAGEMENT",channel:"PORTAL_ASSISTED" as GovernmentChannel,status:"PLANNED",reference:"MTE · Manual FGTS Digital 1.70; não presumir API geral pública"}
] as const;

export function esocialConfigurationStatus(){
  const mtlsCertificate=Boolean(process.env.ESOCIAL_CERTIFICATE_PEM||process.env.ESOCIAL_CERTIFICATE_PFX_BASE64);
  const mtlsPrivateKey=Boolean(process.env.ESOCIAL_PRIVATE_KEY_PEM||process.env.ESOCIAL_CERTIFICATE_PFX_BASE64);
  const signingCertificate=Boolean(process.env.ESOCIAL_SIGNING_CERTIFICATE_PEM||process.env.ESOCIAL_CERTIFICATE_PEM);
  const signingPrivateKey=Boolean(process.env.ESOCIAL_SIGNING_PRIVATE_KEY_PEM||process.env.ESOCIAL_PRIVATE_KEY_PEM);
  return {
    certificateConfigured:mtlsCertificate,
    privateKeyConfigured:mtlsPrivateKey,
    signingCertificateConfigured:signingCertificate,
    signingPrivateKeyConfigured:signingPrivateKey,
    signingConfigured:signingCertificate&&signingPrivateKey,
    transmitterConfigured:Boolean(process.env.ESOCIAL_TRANSMITTER_REGISTRATION_NUMBER),
    passphraseConfigured:Boolean(process.env.ESOCIAL_CERTIFICATE_PASSPHRASE),
    productionEnabled:process.env.ESOCIAL_ENABLE_PRODUCTION==="true"
  };
}
