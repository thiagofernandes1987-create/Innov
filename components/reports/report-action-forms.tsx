"use client";

import { useActionState } from "react";
import {
  generateReportSnapshot,
  saveReportTarget,
  saveReportView
} from "@/app/actions/reports";
import { INITIAL_REPORT_ACTION_STATE } from "@/lib/forms/report-action-state";

type ProjectOption = { id: string; label: string };
type MetricOption = { key: string; label: string };
type ViewOption = { id: string; label: string };

function ErrorMessage({ message }: { message?: string }) {
  return message ? <small className="field-error">{message}</small> : null;
}

function FormStatus({ message }: { message: string | null }) {
  return message ? <div className="validation blocking" role="alert">{message}</div> : null;
}

export function SavedReportForm({ projects }: { projects: ProjectOption[] }) {
  const [state, action, pending] = useActionState(saveReportView, INITIAL_REPORT_ACTION_STATE);
  const value = (key: keyof typeof state.values, fallback = "") => state.values[key] ?? fallback;

  return <form action={action} className="card card-pad">
    <div className="section-heading"><div><span className="eyebrow">SALVAR VISÃO</span><h2>Novo relatório</h2></div></div>
    <FormStatus message={state.message}/>
    <p className="form-help">Em caso de validação ou indisponibilidade, o preenchimento será preservado.</p>
    <div className="form-grid form-grid-2">
      <label>Nome<input name="name" required defaultValue={value("name")} aria-invalid={Boolean(state.fieldErrors.name)}/><ErrorMessage message={state.fieldErrors.name}/></label>
      <label>Tipo<select name="kind" defaultValue={value("kind", "EXECUTIVE")}><option value="EXECUTIVE">Executivo</option><option value="PROJECT">Obra</option><option value="FINANCE">Financeiro</option><option value="PROCUREMENT">Compras</option><option value="QUALITY">Qualidade</option></select></label>
      <label>Obra<select name="projectId" defaultValue={value("projectId")}><option value="">Todas as obras</option>{projects.map(project=><option key={project.id} value={project.id}>{project.label}</option>)}</select></label>
      <label>Início<input type="date" name="periodStart" defaultValue={value("periodStart")}/></label>
      <label>Fim<input type="date" name="periodEnd" defaultValue={value("periodEnd")} aria-invalid={Boolean(state.fieldErrors.periodEnd)}/><ErrorMessage message={state.fieldErrors.periodEnd}/></label>
      <label>Métricas visíveis<input name="visibleMetrics" defaultValue={value("visibleMetrics")} placeholder="average_progress, nps, payable_open"/></label>
    </div>
    <label>Descrição<textarea name="description" rows={3} defaultValue={value("description")}/></label>
    <label className="checkbox-row"><input type="checkbox" name="shared" defaultChecked={value("shared") === "on"}/> Compartilhar com outros usuários autorizados</label>
    <button className="button button-primary" disabled={pending}>{pending ? "Salvando…" : "Salvar relatório"}</button>
  </form>;
}

export function ReportTargetForm({ projects, metrics }: { projects: ProjectOption[]; metrics: MetricOption[] }) {
  const [state, action, pending] = useActionState(saveReportTarget, INITIAL_REPORT_ACTION_STATE);
  const value = (key: keyof typeof state.values, fallback = "") => state.values[key] ?? fallback;

  return <form action={action} className="card card-pad report-target-form">
    <div className="section-heading"><div><span className="eyebrow">NOVA META</span><h2>Faixa de atenção</h2></div></div>
    <FormStatus message={state.message}/>
    <div className="form-grid form-grid-2">
      <label>Métrica<select name="metricKey" required defaultValue={value("metricKey")} aria-invalid={Boolean(state.fieldErrors.metricKey)}><option value="">Selecione</option>{metrics.map(metric=><option value={metric.key} key={metric.key}>{metric.label}</option>)}</select><ErrorMessage message={state.fieldErrors.metricKey}/></label>
      <label>Escopo<select name="projectId" defaultValue={value("projectId")}><option value="">Todas as obras</option>{projects.map(project=><option value={project.id} key={project.id}>{project.label}</option>)}</select></label>
      <label>Regra<select name="comparison" defaultValue={value("comparison", "MIN")}><option value="MIN">Valor mínimo desejado</option><option value="MAX">Valor máximo desejado</option></select></label>
      <label>Atenção<input name="warningValue" inputMode="decimal" defaultValue={value("warningValue")} aria-invalid={Boolean(state.fieldErrors.warningValue)}/><ErrorMessage message={state.fieldErrors.warningValue}/></label>
      <label>Crítico<input name="criticalValue" inputMode="decimal" defaultValue={value("criticalValue")} aria-invalid={Boolean(state.fieldErrors.criticalValue)}/><ErrorMessage message={state.fieldErrors.criticalValue}/></label>
    </div>
    <button className="button button-primary" disabled={pending}>{pending ? "Salvando…" : "Salvar meta"}</button>
  </form>;
}

export function ReportSnapshotForm({ projects, views, defaults }: { projects: ProjectOption[]; views: ViewOption[]; defaults: { start: string; end: string } }) {
  const [state, action, pending] = useActionState(generateReportSnapshot, INITIAL_REPORT_ACTION_STATE);
  const value = (key: keyof typeof state.values, fallback = "") => state.values[key] ?? fallback;

  return <form action={action} className="card card-pad">
    <div className="section-heading"><div><span className="eyebrow">NOVO SNAPSHOT</span><h2>Congelar indicadores</h2></div></div>
    <FormStatus message={state.message}/>
    <div className="form-grid form-grid-2">
      <label>Tipo<select name="kind" defaultValue={value("kind", "EXECUTIVE")}><option value="EXECUTIVE">Executivo</option><option value="PROJECT">Obra</option><option value="FINANCE">Financeiro</option><option value="PROCUREMENT">Compras</option><option value="QUALITY">Qualidade</option></select></label>
      <label>Obra<select name="projectId" defaultValue={value("projectId")}><option value="">Todas as obras autorizadas</option>{projects.map(project=><option value={project.id} key={project.id}>{project.label}</option>)}</select></label>
      <label>Relatório salvo<select name="savedViewId" defaultValue={value("savedViewId")}><option value="">Nenhum</option>{views.map(view=><option value={view.id} key={view.id}>{view.label}</option>)}</select></label>
      <label>Início<input type="date" name="periodStart" defaultValue={value("periodStart", defaults.start)} required/></label>
      <label>Fim<input type="date" name="periodEnd" defaultValue={value("periodEnd", defaults.end)} required aria-invalid={Boolean(state.fieldErrors.periodEnd)}/><ErrorMessage message={state.fieldErrors.periodEnd}/></label>
    </div>
    <button className="button button-primary" disabled={pending}>{pending ? "Gerando…" : "Gerar snapshot"}</button>
  </form>;
}
