"use client";

import { FormEvent, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export type SmartFilter = {
  name: string;
  label: string;
  type?: "text" | "select";
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
};

export function SmartSearchBar({
  initialQuery = "",
  initialFilters = {},
  placeholder = "Buscar por nome, código, cliente, contato...",
  filters = []
}: {
  initialQuery?: string;
  initialFilters?: Record<string, string | undefined>;
  placeholder?: string;
  filters?: SmartFilter[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(initialQuery);
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(filters.map((filter) => [filter.name, initialFilters[filter.name] ?? ""]))
  );

  const activeFilters = useMemo(
    () => filters.filter((filter) => Boolean(values[filter.name])),
    [filters, values]
  );

  function navigate(nextQuery = query, nextValues = values) {
    const params = new URLSearchParams();
    if (nextQuery.trim()) params.set("q", nextQuery.trim());
    for (const filter of filters) {
      const value = nextValues[filter.name]?.trim();
      if (value) params.set(filter.name, value);
    }
    const suffix = params.toString();
    router.push(suffix ? `${pathname}?${suffix}` : pathname);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate();
  }

  function clearAll() {
    const empty = Object.fromEntries(filters.map((filter) => [filter.name, ""]));
    setQuery("");
    setValues(empty);
    router.push(pathname);
  }

  function removeFilter(name: string) {
    const next = { ...values, [name]: "" };
    setValues(next);
    navigate(query, next);
  }

  return (
    <div className="smart-search">
      <form className="smart-search-form" role="search" onSubmit={submit}>
        <span className="smart-search-icon" aria-hidden="true">⌕</span>
        <input
          type="search"
          name="q"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          aria-label="Pesquisar"
          autoComplete="off"
        />
        <button
          className="smart-search-button"
          type="button"
          aria-expanded={open}
          aria-controls="smart-search-filters"
          onClick={() => setOpen((current) => !current)}
        >
          <span>Filtros</span>
          {activeFilters.length ? <span className="smart-search-count">{activeFilters.length}</span> : null}
        </button>
        <button className="smart-search-submit" type="submit"><span>Buscar</span> ↵</button>
      </form>

      {open ? (
        <div id="smart-search-filters" className="smart-search-panel">
          <div className="smart-search-filter-grid">
            {filters.map((filter) => (
              <label key={filter.name}>{filter.label}
                {filter.type === "select" ? (
                  <select
                    value={values[filter.name] ?? ""}
                    onChange={(event) => setValues((current) => ({ ...current, [filter.name]: event.target.value }))}
                  >
                    <option value="">Todos</option>
                    {(filter.options ?? []).map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={values[filter.name] ?? ""}
                    placeholder={filter.placeholder}
                    onChange={(event) => setValues((current) => ({ ...current, [filter.name]: event.target.value }))}
                  />
                )}
              </label>
            ))}
          </div>
          <div className="smart-search-actions">
            <button className="button button-secondary button-compact" type="button" onClick={clearAll}>Limpar</button>
            <button className="button button-primary button-compact" type="button" onClick={() => navigate()}>Aplicar filtros</button>
          </div>
        </div>
      ) : null}

      {activeFilters.length ? (
        <div className="smart-search-chips" aria-label="Filtros ativos">
          {activeFilters.map((filter) => {
            const raw = values[filter.name];
            const label = filter.options?.find((option) => option.value === raw)?.label ?? raw;
            return (
              <button key={filter.name} className="smart-search-chip" type="button" onClick={() => removeFilter(filter.name)}>
                {filter.label}: <strong>{label}</strong> ×
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
