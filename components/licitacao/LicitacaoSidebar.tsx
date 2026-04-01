"use client";

import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";

type LicitacaoData = {
  id: string;
  numero: number;
  titulo: string;
  orgao?: string | null;
  objeto?: string | null;
  modalidade?: string | null;
  uf?: string | null;
  municipio?: string | null;
  valorEstimado?: string | number | null;
  dataPublicacao?: string | null;
  dataSessao?: string | null;
  linkOrigem?: string | null;
};

type ScoreResumo = {
  scoreFinal: number;
  classificacao: string;
} | null;

const COR_CLASSIFICACAO: Record<string, string> = {
  "A+": "bg-emerald-700 text-white",
  A: "bg-blue-600 text-white",
  B: "bg-yellow-500 text-white",
  C: "bg-orange-500 text-white",
  D: "bg-red-600 text-white",
};

function formatarData(data: string | null | undefined): string {
  if (!data) return "—";
  return new Date(data).toLocaleDateString("pt-BR");
}

function formatarValor(valor: string | number | null | undefined): string {
  if (valor == null) return "—";
  const num = Number(valor);
  if (isNaN(num)) return "—";
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function LicitacaoSidebar({
  licitacao,
  score,
}: {
  licitacao: LicitacaoData;
  score: ScoreResumo;
}) {
  return (
    <aside className="w-80 shrink-0 border-r bg-slate-50 p-6 space-y-5 overflow-auto">
      <div>
        <h1 className="text-lg font-semibold leading-tight">{licitacao.titulo}</h1>
        <p className="text-sm text-slate-500 mt-1">#{licitacao.numero}</p>
      </div>

      {score && (
        <div className="flex items-center gap-3">
          <Badge className={COR_CLASSIFICACAO[score.classificacao] ?? "bg-slate-400 text-white"}>
            {score.classificacao}
          </Badge>
          <span className="text-2xl font-bold">{score.scoreFinal}</span>
          <span className="text-sm text-slate-500">/ 100</span>
        </div>
      )}

      {!score && (
        <Badge variant="secondary" className="text-xs">Sem score</Badge>
      )}

      <dl className="space-y-3 text-sm">
        {licitacao.orgao && (
          <div>
            <dt className="text-slate-500">Órgão</dt>
            <dd className="font-medium">{licitacao.orgao}</dd>
          </div>
        )}
        {licitacao.modalidade && (
          <div>
            <dt className="text-slate-500">Modalidade</dt>
            <dd>{licitacao.modalidade}</dd>
          </div>
        )}
        <div className="flex gap-6">
          {licitacao.uf && (
            <div>
              <dt className="text-slate-500">UF</dt>
              <dd>{licitacao.uf}</dd>
            </div>
          )}
          {licitacao.municipio && (
            <div>
              <dt className="text-slate-500">Município</dt>
              <dd>{licitacao.municipio}</dd>
            </div>
          )}
        </div>
        <div>
          <dt className="text-slate-500">Valor estimado</dt>
          <dd className="font-medium">{formatarValor(licitacao.valorEstimado)}</dd>
        </div>
        <div className="flex gap-6">
          <div>
            <dt className="text-slate-500">Publicação</dt>
            <dd>{formatarData(licitacao.dataPublicacao)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Sessão</dt>
            <dd>{formatarData(licitacao.dataSessao)}</dd>
          </div>
        </div>
      </dl>

      {licitacao.objeto && (
        <div>
          <p className="text-xs text-slate-500 mb-1">Objeto</p>
          <p className="text-sm leading-relaxed max-h-40 overflow-auto">{licitacao.objeto}</p>
        </div>
      )}

      {licitacao.linkOrigem && (
        <a
          href={licitacao.linkOrigem}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
        >
          <ExternalLink className="h-3 w-3" />
          Ver no site original
        </a>
      )}
    </aside>
  );
}
