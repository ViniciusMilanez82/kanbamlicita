"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { AlertaBadge } from "./AlertaBadge";
import { StatusBadge } from "./StatusBadge";
import { UploadDocumentoDialog } from "./UploadDocumentoDialog";
import {
  Plus,
  Download,
  RefreshCw,
  Search,
  FileText,
  Loader2,
} from "lucide-react";

type DocEmpresa = {
  id: string;
  cnpj: string;
  categoria: string;
  tipoDocumento: string;
  nomeOriginal: string;
  tamanho: number;
  dataEmissao: string | null;
  dataValidade: string | null;
  versao: number;
  status: string;
  nivelAlerta: string | null;
  orgaoEmissor: string | null;
  criadoEm: string;
  enviadoPor: { name: string | null } | null;
};

const CATEGORIAS = [
  { value: "", label: "Todas" },
  { value: "juridica", label: "Jurídica" },
  { value: "fiscal", label: "Fiscal" },
  { value: "trabalhista", label: "Trabalhista" },
  { value: "tecnica", label: "Técnica" },
  { value: "economica", label: "Econômica" },
  { value: "complementar", label: "Complementar" },
];

const STATUS_FILTROS = [
  { value: "", label: "Todos" },
  { value: "vigente", label: "Vigente" },
  { value: "vencendo", label: "Vencendo" },
  { value: "vencido", label: "Vencido" },
  { value: "substituido", label: "Substituído" },
];

function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatarData(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

export function RepositorioDocumentos({ cnpjFiltro }: { cnpjFiltro?: string }) {
  const [categoria, setCategoria] = useState("");
  const [status, setStatus] = useState("");
  const [busca, setBusca] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [substituirDoc, setSubstituirDoc] = useState<DocEmpresa | null>(null);

  const params = new URLSearchParams();
  if (cnpjFiltro) params.set("cnpj", cnpjFiltro);
  if (categoria) params.set("categoria", categoria);
  if (status) params.set("status", status);
  if (busca) params.set("busca", busca);

  const { data: documentos = [], isLoading } = useQuery<DocEmpresa[]>({
    queryKey: ["documentos-empresa", cnpjFiltro, categoria, status, busca],
    queryFn: async () => {
      const r = await fetch(`/api/documentos-empresa?${params.toString()}`);
      if (!r.ok) throw new Error("Erro ao carregar documentos");
      return r.json();
    },
  });

  function handleDownload(docId: string, nomeOriginal: string) {
    const link = document.createElement("a");
    link.href = `/api/documentos-empresa/${docId}`;
    link.download = nomeOriginal;
    link.click();
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por tipo, nome ou órgão..."
            className="w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          {CATEGORIAS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          {STATUS_FILTROS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <Button onClick={() => setUploadOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo documento
        </Button>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      ) : documentos.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white py-16 text-center">
          <FileText className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">
            Nenhum documento encontrado.
          </p>
          <Button
            variant="outline"
            onClick={() => setUploadOpen(true)}
            className="mt-4 gap-2"
          >
            <Plus className="h-4 w-4" />
            Adicionar primeiro documento
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Documento</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3">Emissão</th>
                <th className="px-4 py-3">Validade</th>
                <th className="px-4 py-3">Versão</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Alerta</th>
                <th className="px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {documentos.map((doc) => (
                <tr
                  key={doc.id}
                  className="border-b last:border-0 hover:bg-slate-50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">
                      {doc.tipoDocumento}
                    </p>
                    <p className="text-xs text-slate-400 truncate max-w-[200px]">
                      {doc.nomeOriginal} ({formatarTamanho(doc.tamanho)})
                    </p>
                  </td>
                  <td className="px-4 py-3 text-slate-600 capitalize">
                    {doc.categoria}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatarData(doc.dataEmissao)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatarData(doc.dataValidade)}
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-center">
                    v{doc.versao}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={doc.status} />
                  </td>
                  <td className="px-4 py-3">
                    <AlertaBadge nivel={doc.nivelAlerta} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() =>
                          handleDownload(doc.id, doc.nomeOriginal)
                        }
                        className="rounded p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                        title="Baixar"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      {doc.status !== "substituido" && (
                        <button
                          onClick={() => setSubstituirDoc(doc)}
                          className="rounded p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-600"
                          title="Substituir (nova versão)"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Dialogs */}
      <UploadDocumentoDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        cnpjPadrao={cnpjFiltro}
      />

      {substituirDoc && (
        <UploadDocumentoDialog
          open={true}
          onClose={() => setSubstituirDoc(null)}
          substituirDocumentoId={substituirDoc.id}
          substituirTipo={substituirDoc.tipoDocumento}
          substituirCategoria={substituirDoc.categoria}
          substituirCnpj={substituirDoc.cnpj}
        />
      )}
    </div>
  );
}
