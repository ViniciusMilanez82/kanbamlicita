"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Upload,
  Download,
  Trash2,
  FileText,
  File,
  FileSpreadsheet,
  FileImage,
  Loader2,
} from "lucide-react";

type Documento = {
  id: string;
  nome: string;
  nomeOriginal: string;
  tipo: string;
  tamanho: number;
  mimeType: string;
  criadoEm: string;
  enviadoPor: { name: string | null } | null;
};

const TIPOS_DOC = [
  { value: "edital", label: "Edital" },
  { value: "tr", label: "Termo de Referência" },
  { value: "proposta", label: "Proposta" },
  { value: "ata", label: "Ata" },
  { value: "contrato", label: "Contrato" },
  { value: "outro", label: "Outro" },
];

const TIPO_CORES: Record<string, string> = {
  edital: "bg-blue-100 text-blue-700",
  tr: "bg-purple-100 text-purple-700",
  proposta: "bg-green-100 text-green-700",
  ata: "bg-amber-100 text-amber-700",
  contrato: "bg-rose-100 text-rose-700",
  outro: "bg-slate-100 text-slate-700",
};

function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return FileImage;
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel"))
    return FileSpreadsheet;
  if (mimeType.includes("pdf") || mimeType.includes("text"))
    return FileText;
  return File;
}

export function DocumentosTab({ licitacaoId }: { licitacaoId: string }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tipoSelecionado, setTipoSelecionado] = useState("outro");
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: documentos = [], isLoading } = useQuery<Documento[]>({
    queryKey: ["documentos", licitacaoId],
    queryFn: async () => {
      const r = await fetch(`/api/licitacoes/${licitacaoId}/documentos`);
      if (!r.ok) throw new Error("Erro ao carregar documentos");
      return r.json();
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("tipo", tipoSelecionado);
      const r = await fetch(`/api/licitacoes/${licitacaoId}/documentos`, {
        method: "POST",
        body: formData,
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({ error: "Erro no upload" }));
        throw new Error(err.error || "Erro no upload");
      }
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documentos", licitacaoId] });
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    onError: () => {
      setUploading(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (docId: string) => {
      setDeletingId(docId);
      const r = await fetch(
        `/api/licitacoes/${licitacaoId}/documentos?docId=${docId}`,
        { method: "DELETE" }
      );
      if (!r.ok) throw new Error("Erro ao excluir");
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documentos", licitacaoId] });
      setDeletingId(null);
    },
    onError: () => {
      setDeletingId(null);
    },
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadMutation.mutate(file);
  }

  function handleDownload(docId: string, nomeOriginal: string) {
    const link = document.createElement("a");
    link.href = `/api/documentos/${docId}`;
    link.download = nomeOriginal;
    link.click();
  }

  return (
    <div className="space-y-6">
      {/* Upload area */}
      <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-6">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-end">
          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-sm font-semibold text-slate-900">
              Enviar documento
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              PDF, Word, Excel, imagens ou outros. Tamanho máximo: 20MB.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={tipoSelecionado}
              onChange={(e) => setTipoSelecionado(e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
            >
              {TIPOS_DOC.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>

            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileChange}
            />

            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="gap-2"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {uploading ? "Enviando..." : "Selecionar arquivo"}
            </Button>
          </div>
        </div>

        {uploadMutation.isError && (
          <p className="mt-3 text-sm text-red-600">
            {uploadMutation.error?.message || "Erro no upload"}
          </p>
        )}
      </div>

      {/* Lista de documentos */}
      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      ) : documentos.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white py-12 text-center">
          <FileText className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">
            Nenhum documento anexado a esta licitação.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {documentos.map((doc) => {
            const Icon = getFileIcon(doc.mimeType);
            return (
              <div
                key={doc.id}
                className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 transition-colors hover:bg-slate-50"
              >
                <Icon className="h-8 w-8 shrink-0 text-slate-400" />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {doc.nomeOriginal}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${TIPO_CORES[doc.tipo] || TIPO_CORES.outro}`}
                    >
                      {TIPOS_DOC.find((t) => t.value === doc.tipo)?.label ||
                        doc.tipo}
                    </span>
                    <span>{formatarTamanho(doc.tamanho)}</span>
                    <span>{formatarData(doc.criadoEm)}</span>
                    {doc.enviadoPor?.name && (
                      <span>por {doc.enviadoPor.name}</span>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => handleDownload(doc.id, doc.nomeOriginal)}
                    className="rounded-md p-2 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                    title="Baixar"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Excluir este documento?")) {
                        deleteMutation.mutate(doc.id);
                      }
                    }}
                    disabled={deletingId === doc.id}
                    className="rounded-md p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    title="Excluir"
                  >
                    {deletingId === doc.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
