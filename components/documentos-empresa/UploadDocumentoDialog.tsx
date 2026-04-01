"use client";

import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, X } from "lucide-react";

const CATEGORIAS = [
  { value: "juridica", label: "Jurídica" },
  { value: "fiscal", label: "Fiscal" },
  { value: "trabalhista", label: "Trabalhista" },
  { value: "tecnica", label: "Técnica" },
  { value: "economica", label: "Econômica" },
  { value: "complementar", label: "Complementar" },
];

const TIPOS_SUGERIDOS = [
  "CND Federal + PGFN + INSS",
  "CRF do FGTS",
  "CND Estadual (SEFAZ)",
  "CND Municipal",
  "CNDT Trabalhista",
  "Contrato Social / Ata",
  "Cartão CNPJ",
  "Balanço Patrimonial",
  "Certidão Neg. Falência",
  "Atestado de Capacidade Técnica",
  "Registro CREA/CAU",
  "Alvará de Funcionamento",
  "Declaração",
  "Outro",
];

type Props = {
  open: boolean;
  onClose: () => void;
  cnpjPadrao?: string;
  /** Se informado, é uma substituição (nova versão) */
  substituirDocumentoId?: string;
  substituirTipo?: string;
  substituirCategoria?: string;
  substituirCnpj?: string;
};

export function UploadDocumentoDialog({
  open,
  onClose,
  cnpjPadrao = "",
  substituirDocumentoId,
  substituirTipo,
  substituirCategoria,
  substituirCnpj,
}: Props) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSubstituicao = !!substituirDocumentoId;

  const [cnpj, setCnpj] = useState(substituirCnpj || cnpjPadrao);
  const [categoria, setCategoria] = useState(substituirCategoria || "fiscal");
  const [tipoDocumento, setTipoDocumento] = useState(substituirTipo || "");
  const [dataEmissao, setDataEmissao] = useState("");
  const [dataValidade, setDataValidade] = useState("");
  const [orgaoEmissor, setOrgaoEmissor] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Selecione um arquivo");

      const formData = new FormData();
      formData.append("file", file);
      if (dataEmissao) formData.append("dataEmissao", dataEmissao);
      if (dataValidade) formData.append("dataValidade", dataValidade);
      if (orgaoEmissor) formData.append("orgaoEmissor", orgaoEmissor);
      if (observacoes) formData.append("observacoes", observacoes);

      let url: string;
      if (isSubstituicao) {
        url = `/api/documentos-empresa/${substituirDocumentoId}/substituir`;
      } else {
        formData.append("cnpj", cnpj);
        formData.append("categoria", categoria);
        formData.append("tipoDocumento", tipoDocumento);
        url = "/api/documentos-empresa";
      }

      const r = await fetch(url, { method: "POST", body: formData });
      if (!r.ok) {
        const err = await r.json().catch(() => ({ error: "Erro no upload" }));
        throw new Error(err.error || "Erro no upload");
      }
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documentos-empresa"] });
      queryClient.invalidateQueries({ queryKey: ["documentos-empresa-dashboard"] });
      resetForm();
      onClose();
    },
  });

  function resetForm() {
    setFile(null);
    setCnpj(cnpjPadrao);
    setCategoria("fiscal");
    setTipoDocumento("");
    setDataEmissao("");
    setDataValidade("");
    setOrgaoEmissor("");
    setObservacoes("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">
            {isSubstituicao ? "Substituir documento" : "Novo documento"}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          {/* Arquivo */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Arquivo *
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1 file:text-xs file:font-medium file:text-blue-700"
            />
            <p className="mt-1 text-xs text-slate-400">PDF, JPG, PNG. Máx. 10MB.</p>
          </div>

          {!isSubstituicao && (
            <>
              {/* CNPJ */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  CNPJ *
                </label>
                <input
                  type="text"
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                  placeholder="00.000.000/0000-00"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Categoria + Tipo */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Categoria *
                  </label>
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    {CATEGORIAS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Tipo de documento *
                  </label>
                  <input
                    type="text"
                    list="tipos-doc-sugeridos"
                    value={tipoDocumento}
                    onChange={(e) => setTipoDocumento(e.target.value)}
                    placeholder="Ex: CND Federal"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                  <datalist id="tipos-doc-sugeridos">
                    {TIPOS_SUGERIDOS.map((t) => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                </div>
              </div>
            </>
          )}

          {/* Datas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Data de emissão
              </label>
              <input
                type="date"
                value={dataEmissao}
                onChange={(e) => setDataEmissao(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Data de validade
              </label>
              <input
                type="date"
                value={dataValidade}
                onChange={(e) => setDataValidade(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Órgão emissor */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Órgão emissor
            </label>
            <input
              type="text"
              value={orgaoEmissor}
              onChange={(e) => setOrgaoEmissor(e.target.value)}
              placeholder="Ex: Receita Federal"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Observações */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Observações
            </label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none resize-none"
            />
          </div>

          {mutation.isError && (
            <p className="text-sm text-red-600">{mutation.error?.message}</p>
          )}

          {/* Ações */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
              Cancelar
            </Button>
            <Button
              onClick={() => mutation.mutate()}
              disabled={
                mutation.isPending ||
                !file ||
                (!isSubstituicao && (!cnpj || !tipoDocumento))
              }
              className="gap-2"
            >
              {mutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {mutation.isPending
                ? "Enviando..."
                : isSubstituicao
                  ? "Substituir"
                  : "Enviar"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
