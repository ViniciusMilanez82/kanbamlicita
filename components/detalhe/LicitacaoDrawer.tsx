"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface LicitacaoDrawerProps {
  licitacaoId: string;
  onClose: () => void;
}

type LicitacaoForm = {
  titulo: string;
  orgao: string;
  objeto: string;
  modalidade: string;
  uf: string;
  municipio: string;
  valorEstimado: string;
  observacoes: string;
};

const FORM_VAZIO: LicitacaoForm = {
  titulo: "",
  orgao: "",
  objeto: "",
  modalidade: "",
  uf: "",
  municipio: "",
  valorEstimado: "",
  observacoes: "",
};

type Movimentacao = {
  id: string;
  colunaOrigem: string | null;
  colunaDestino: string;
  motivo: string | null;
  criadoEm: string;
};

type Licitacao = {
  id: string;
  titulo: string;
  orgao: string | null;
  objeto: string | null;
  modalidade: string | null;
  uf: string | null;
  municipio: string | null;
  valorEstimado: number | string | null;
  observacoes: string | null;
  linkOrigem: string | null;
  card: { coluna?: { nome: string; cor: string | null }; urgente?: boolean } | null;
  movimentacoes: Movimentacao[];
};

function resolverLink(linkOrigem: string | null): string | null {
  if (!linkOrigem) return null;
  if (linkOrigem.startsWith("pncp-contrato:")) {
    const id = linkOrigem.replace("pncp-contrato:", "");
    return `https://pncp.gov.br/app/editais/${id}`;
  }
  if (linkOrigem.startsWith("petronect:")) return null;
  return linkOrigem.startsWith("http") ? linkOrigem : null;
}

function formDeLicitacao(l: Licitacao): LicitacaoForm {
  return {
    titulo: l.titulo ?? "",
    orgao: l.orgao ?? "",
    objeto: l.objeto ?? "",
    modalidade: l.modalidade ?? "",
    uf: l.uf ?? "",
    municipio: l.municipio ?? "",
    valorEstimado: l.valorEstimado != null ? String(l.valorEstimado) : "",
    observacoes: l.observacoes ?? "",
  };
}

export function LicitacaoDrawer({ licitacaoId, onClose }: LicitacaoDrawerProps) {
  const isNova = licitacaoId === "nova";

  const { data: licitacao } = useQuery<Licitacao>({
    queryKey: ["licitacao", licitacaoId],
    queryFn: async () => {
      const r = await fetch(`/api/licitacoes/${licitacaoId}`);
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Erro ao carregar");
      return data;
    },
    enabled: !isNova,
  });

  if (isNova) {
    return <Conteudo licitacaoId={licitacaoId} initial={FORM_VAZIO} onClose={onClose} />;
  }
  if (!licitacao) {
    return (
      <Shell title="Carregando..." onClose={onClose}>
        <p className="text-sm text-slate-400">Carregando...</p>
      </Shell>
    );
  }
  return (
    <Conteudo
      licitacaoId={licitacaoId}
      initial={formDeLicitacao(licitacao)}
      licitacao={licitacao}
      onClose={onClose}
    />
  );
}

function Conteudo({
  licitacaoId,
  initial,
  licitacao,
  onClose,
}: {
  licitacaoId: string;
  initial: LicitacaoForm;
  licitacao?: Licitacao;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const isNova = licitacaoId === "nova";
  const [form, setForm] = useState<LicitacaoForm>(initial);

  function payloadDoForm() {
    return {
      titulo: form.titulo.trim(),
      orgao: form.orgao.trim() || null,
      objeto: form.objeto.trim() || null,
      modalidade: form.modalidade.trim() || null,
      uf: form.uf.trim().toUpperCase() || null,
      municipio: form.municipio.trim() || null,
      valorEstimado: form.valorEstimado ? Number(form.valorEstimado) : null,
      observacoes: form.observacoes.trim() || null,
    };
  }

  const criarMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/licitacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadDoForm()),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Não foi possível salvar");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["licitacoes"] });
      toast.success("Licitação criada");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const atualizarMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/licitacoes/${licitacaoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadDoForm()),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Não foi possível salvar");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["licitacao", licitacaoId] });
      queryClient.invalidateQueries({ queryKey: ["licitacoes"] });
      toast.success("Alterações salvas");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const link = resolverLink(licitacao?.linkOrigem ?? null);
  const titulo = isNova ? "Nova licitação" : licitacao?.titulo ?? "";

  return (
    <Shell
      title={titulo}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          {isNova ? (
            <Button
              onClick={() => criarMutation.mutate()}
              disabled={!form.titulo || criarMutation.isPending}
            >
              {criarMutation.isPending ? "Salvando..." : "Criar"}
            </Button>
          ) : (
            <Button
              onClick={() => atualizarMutation.mutate()}
              disabled={!form.titulo || atualizarMutation.isPending}
            >
              {atualizarMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          )}
        </>
      }
    >
      {!isNova && licitacao && (
        <div className="flex flex-wrap items-center gap-2">
          {licitacao.card?.coluna && (
            <span
              className="rounded-md px-2 py-0.5 text-xs font-medium text-white"
              style={{ backgroundColor: licitacao.card.coluna.cor ?? "#3B82F6" }}
            >
              {licitacao.card.coluna.nome}
            </span>
          )}
          {licitacao.card?.urgente && <Badge variant="destructive">Urgente</Badge>}
          {link && (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline ml-auto"
            >
              <ExternalLink className="h-3 w-3" /> Abrir no portal
            </a>
          )}
        </div>
      )}

      <div className="space-y-3">
        <Campo
          label="Título"
          valor={form.titulo}
          onChange={(v) => setForm({ ...form, titulo: v })}
          obrigatorio
        />
        <Campo
          label="Órgão"
          valor={form.orgao}
          onChange={(v) => setForm({ ...form, orgao: v })}
        />
        <CampoTexto
          label="Objeto"
          valor={form.objeto}
          onChange={(v) => setForm({ ...form, objeto: v })}
          rows={4}
        />
        <div className="grid grid-cols-2 gap-3">
          <Campo
            label="Modalidade"
            valor={form.modalidade}
            onChange={(v) => setForm({ ...form, modalidade: v })}
          />
          <Campo
            label="UF"
            valor={form.uf}
            onChange={(v) => setForm({ ...form, uf: v })}
            maxLength={2}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Campo
            label="Município"
            valor={form.municipio}
            onChange={(v) => setForm({ ...form, municipio: v })}
          />
          <Campo
            label="Valor estimado (R$)"
            valor={form.valorEstimado}
            onChange={(v) => setForm({ ...form, valorEstimado: v })}
            type="number"
          />
        </div>
        <CampoTexto
          label="Observações"
          valor={form.observacoes}
          onChange={(v) => setForm({ ...form, observacoes: v })}
          rows={3}
        />
      </div>

      {!isNova && licitacao?.movimentacoes && licitacao.movimentacoes.length > 0 && (
        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold mb-2">Histórico</h3>
          <ul className="space-y-1 text-xs text-slate-600">
            {licitacao.movimentacoes.slice(0, 10).map((m) => (
              <li key={m.id}>
                <span className="text-slate-400">
                  {new Date(m.criadoEm).toLocaleDateString("pt-BR")}{" "}
                </span>
                {m.colunaOrigem ? `${m.colunaOrigem} → ` : ""}
                <strong>{m.colunaDestino}</strong>
                {m.motivo && <span className="text-slate-500"> — {m.motivo}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Shell>
  );
}

function Shell({
  title,
  onClose,
  footer,
  children,
}: {
  title: string;
  onClose: () => void;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-10 flex h-full w-full max-w-lg flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">{children}</div>
        {footer && <div className="border-t px-4 py-3 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

function Campo({
  label,
  valor,
  onChange,
  obrigatorio,
  type,
  maxLength,
}: {
  label: string;
  valor: string;
  onChange: (v: string) => void;
  obrigatorio?: boolean;
  type?: string;
  maxLength?: number;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-500">
        {label}
        {obrigatorio && " *"}
      </label>
      <Input
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        maxLength={maxLength}
      />
    </div>
  );
}

function CampoTexto({
  label,
  valor,
  onChange,
  rows,
}: {
  label: string;
  valor: string;
  onChange: (v: string) => void;
  rows: number;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-500">{label}</label>
      <textarea
        className="w-full rounded border px-3 py-2 text-sm"
        rows={rows}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
