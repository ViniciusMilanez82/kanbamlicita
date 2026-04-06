"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { KanbanColuna } from "@/types/licitacao";

const MOTIVOS_DERROTA = [
  { value: "preco", label: "Preco" },
  { value: "tecnica", label: "Tecnica" },
  { value: "habilitacao", label: "Habilitacao" },
  { value: "prazo", label: "Prazo" },
  { value: "desistencia", label: "Desistencia" },
];

interface MoverCardModalProps {
  colunas: KanbanColuna[];
  colunaAtualId: string;
  licitacaoId: string;
  destinoInicial?: string;
  onMover: (colunaDestinoId: string, motivo?: string) => void;
  onClose: () => void;
}

function ehColunaResultado(nome: string): "ganhou" | "perdeu" | null {
  const lower = nome.toLowerCase();
  if (lower.includes("ganh")) return "ganhou";
  if (lower.includes("perd")) return "perdeu";
  return null;
}

export function MoverCardModal({
  colunas,
  colunaAtualId,
  licitacaoId,
  destinoInicial,
  onMover,
  onClose,
}: MoverCardModalProps) {
  const [destino, setDestino] = useState(destinoInicial ?? "");
  const [motivo, setMotivo] = useState("");
  const [salvando, setSalvando] = useState(false);

  // Result fields
  const [empresaVencedora, setEmpresaVencedora] = useState("");
  const [valorVencedor, setValorVencedor] = useState("");
  const [valorNossaProposta, setValorNossaProposta] = useState("");
  const [motivoDerrota, setMotivoDerrota] = useState("");

  const colDestino = colunas.find((c) => c.id === destino);
  const precisaMotivo = colDestino?.tipo === "final_negativo";
  const tipoResultado = colDestino ? ehColunaResultado(colDestino.nome) : null;

  const diferencaPercentual = useMemo(() => {
    const venc = Number(valorVencedor);
    const nosso = Number(valorNossaProposta);
    if (!venc || !nosso || isNaN(venc) || isNaN(nosso)) return null;
    return ((nosso - venc) / venc) * 100;
  }, [valorVencedor, valorNossaProposta]);

  async function handleMover() {
    if (!destino) return;

    // If it's a result column, save result first
    if (tipoResultado && licitacaoId) {
      setSalvando(true);
      try {
        const payload: Record<string, string | null> = {
          resultado: tipoResultado,
          nomeVencedorExterno: empresaVencedora.trim() || null,
          valorVencedor: valorVencedor || null,
          valorNossaProposta: valorNossaProposta || null,
          motivoDerrota:
            tipoResultado === "perdeu" && motivoDerrota ? motivoDerrota : null,
          motivoDetalhado: motivo.trim() || null,
        };

        const r = await fetch(`/api/licitacoes/${licitacaoId}/resultado`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(
            body.error || "Nao foi possivel salvar o resultado. Tente novamente."
          );
        }
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : "Erro ao salvar resultado. Tente novamente."
        );
        setSalvando(false);
        return;
      }
      setSalvando(false);
    }

    onMover(destino, motivo || undefined);
  }

  const desabilitarMover =
    !destino || (precisaMotivo && !motivo) || salvando;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold mb-4">Mover Card</h3>

        <select
          className="w-full rounded border px-3 py-2 mb-3"
          value={destino}
          onChange={(e) => setDestino(e.target.value)}
        >
          <option value="">Selecione a coluna destino</option>
          {colunas
            .filter((c) => c.id !== colunaAtualId && c.ativo)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
        </select>

        {/* Result fields when moving to Ganhamos/Perdemos */}
        {tipoResultado && (
          <div className="space-y-3 mb-3 p-3 rounded-md bg-slate-50 border">
            <p className="text-sm font-medium text-slate-700">
              {tipoResultado === "ganhou"
                ? "Dados do resultado (ganhamos)"
                : "Dados do resultado (perdemos)"}
            </p>

            <div>
              <label className="text-xs text-slate-600">
                Empresa vencedora
              </label>
              <Input
                value={empresaVencedora}
                onChange={(e) => setEmpresaVencedora(e.target.value)}
                placeholder="Nome da empresa"
                className="h-8 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-600">
                  Valor do vencedor (R$)
                </label>
                <Input
                  type="number"
                  value={valorVencedor}
                  onChange={(e) => setValorVencedor(e.target.value)}
                  placeholder="0,00"
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-600">
                  Nossa proposta (R$)
                </label>
                <Input
                  type="number"
                  value={valorNossaProposta}
                  onChange={(e) => setValorNossaProposta(e.target.value)}
                  placeholder="0,00"
                  className="h-8 text-sm"
                />
              </div>
            </div>

            {diferencaPercentual !== null && (
              <p
                className={`text-xs font-medium ${
                  diferencaPercentual <= 0
                    ? "text-green-700"
                    : "text-red-700"
                }`}
              >
                {diferencaPercentual <= 0 ? "Mais barato" : "Mais caro"}{" "}
                {Math.abs(diferencaPercentual).toFixed(1)}%
              </p>
            )}

            {tipoResultado === "perdeu" && (
              <div>
                <label className="text-xs text-slate-600">
                  Motivo da derrota
                </label>
                <Select
                  value={motivoDerrota}
                  onValueChange={(v) => setMotivoDerrota(v ?? "")}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {MOTIVOS_DERROTA.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <p className="text-xs text-slate-400">
              Voce podera complementar os detalhes na aba Resultado.
            </p>
          </div>
        )}

        {/* Motivo / detalhes (always available, required for final_negativo) */}
        {(precisaMotivo || tipoResultado) && (
          <Textarea
            placeholder={
              precisaMotivo
                ? "Motivo (obrigatorio)"
                : "Detalhes ou observacoes (opcional)"
            }
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className="mb-3"
            rows={2}
          />
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={handleMover} disabled={desabilitarMover}>
            {salvando ? "Salvando..." : "Mover"}
          </Button>
        </div>
      </div>
    </div>
  );
}
