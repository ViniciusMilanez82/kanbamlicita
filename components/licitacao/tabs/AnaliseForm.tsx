'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import type { AnaliseDetalhe } from '@/types/licitacao-detalhe'

type Props = {
  licitacaoId: string
  analise: AnaliseDetalhe
}

type FormState = {
  aderenciaDiretaExiste: boolean
  aderenciaDiretaNivel: string
  aderenciaAplicacaoExiste: boolean
  aderenciaAplicacaoNivel: string
  contextoOcultoExiste: boolean
  contextoOcultoNivel: string
  oportunidadeOcultaExiste: boolean
  oportunidadeOcultaForca: string
  oportunidadeOcultaResumo: string
  oportunidadeNoObjeto: boolean
  oportunidadeNoTr: boolean
  oportunidadeNosLotes: boolean
  oportunidadeNosItens: boolean
  oportunidadeNaPlanilha: boolean
  oportunidadeNoMemorial: boolean
  oportunidadeEmAnexoTecnico: boolean
  portfolioAplicavel: string
  solucoesMuliteinerAplicaveis: string
}

function toFormState(analise: AnaliseDetalhe): FormState {
  return {
    aderenciaDiretaExiste: analise?.aderenciaDiretaExiste ?? false,
    aderenciaDiretaNivel: analise?.aderenciaDiretaNivel ?? 'nenhuma',
    aderenciaAplicacaoExiste: analise?.aderenciaAplicacaoExiste ?? false,
    aderenciaAplicacaoNivel: analise?.aderenciaAplicacaoNivel ?? 'nenhuma',
    contextoOcultoExiste: analise?.contextoOcultoExiste ?? false,
    contextoOcultoNivel: analise?.contextoOcultoNivel ?? 'nenhuma',
    oportunidadeOcultaExiste: analise?.oportunidadeOcultaExiste ?? false,
    oportunidadeOcultaForca: analise?.oportunidadeOcultaForca ?? 'nenhuma',
    oportunidadeOcultaResumo: analise?.oportunidadeOcultaResumo ?? '',
    oportunidadeNoObjeto: analise?.oportunidadeNoObjeto ?? false,
    oportunidadeNoTr: analise?.oportunidadeNoTr ?? false,
    oportunidadeNosLotes: analise?.oportunidadeNosLotes ?? false,
    oportunidadeNosItens: analise?.oportunidadeNosItens ?? false,
    oportunidadeNaPlanilha: analise?.oportunidadeNaPlanilha ?? false,
    oportunidadeNoMemorial: analise?.oportunidadeNoMemorial ?? false,
    oportunidadeEmAnexoTecnico: analise?.oportunidadeEmAnexoTecnico ?? false,
    portfolioAplicavel: JSON.stringify(analise?.portfolioAplicavel ?? []),
    solucoesMuliteinerAplicaveis: JSON.stringify(analise?.solucoesMuliteinerAplicaveis ?? []),
  }
}

const NIVEL_OPTIONS = ['nenhuma', 'baixa', 'média', 'alta']
const FORCA_OPTIONS = ['nenhuma', 'fraca', 'moderada', 'forte']

export function AnaliseForm({ licitacaoId, analise }: Props) {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(() => toFormState(analise))
  const [saving, setSaving] = useState(false)

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      let portfolioAplicavel: unknown[] = []
      let solucoesMuliteinerAplicaveis: unknown[] = []
      try { portfolioAplicavel = JSON.parse(form.portfolioAplicavel) } catch { portfolioAplicavel = [form.portfolioAplicavel] }
      try { solucoesMuliteinerAplicaveis = JSON.parse(form.solucoesMuliteinerAplicaveis) } catch { solucoesMuliteinerAplicaveis = [form.solucoesMuliteinerAplicaveis] }

      const res = await fetch(`/api/licitacoes/${licitacaoId}/analise`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, portfolioAplicavel, solucoesMuliteinerAplicaveis }),
      })
      if (!res.ok) throw new Error('Erro ao salvar')
      toast.success('Análise salva com sucesso')
      router.refresh()
    } catch {
      toast.error('Erro ao salvar análise')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      {/* Bloco 1: Aderência */}
      <section>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Aderência
        </h3>
        <div className="space-y-3">
          {([
            ['aderenciaDiretaExiste', 'aderenciaDiretaNivel', 'Aderência Direta'],
            ['aderenciaAplicacaoExiste', 'aderenciaAplicacaoNivel', 'Aderência por Aplicação'],
            ['contextoOcultoExiste', 'contextoOcultoNivel', 'Contexto Oculto'],
          ] as const).map(([existeKey, nivelKey, label]) => (
            <div key={existeKey} className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-sm text-slate-700 w-48 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form[existeKey]}
                  onChange={(e) => set(existeKey, e.target.checked)}
                  className="rounded border-slate-300"
                />
                {label}
              </label>
              <select
                value={form[nivelKey]}
                onChange={(e) => set(nivelKey, e.target.value)}
                className="text-xs border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#1D4ED8]"
              >
                {NIVEL_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </section>

      {/* Bloco 2: Oportunidade oculta */}
      <section>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Oportunidade Oculta
        </h3>
        <div className="space-y-3">
          <label className="flex items-center gap-1.5 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={form.oportunidadeOcultaExiste}
              onChange={(e) => set('oportunidadeOcultaExiste', e.target.checked)}
              className="rounded border-slate-300"
            />
            Existe oportunidade oculta
          </label>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 w-16">Força</span>
            <select
              value={form.oportunidadeOcultaForca}
              onChange={(e) => set('oportunidadeOcultaForca', e.target.value)}
              className="text-xs border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#1D4ED8]"
            >
              {FORCA_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Resumo da oportunidade</label>
            <textarea
              value={form.oportunidadeOcultaResumo}
              onChange={(e) => set('oportunidadeOcultaResumo', e.target.value)}
              rows={3}
              className="w-full text-sm border border-slate-200 rounded p-2 focus:outline-none focus:ring-1 focus:ring-[#1D4ED8] resize-none"
              placeholder="Descreva a oportunidade oculta identificada..."
            />
          </div>
        </div>
      </section>

      {/* Bloco 3: Onde está a oportunidade */}
      <section>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Onde Está a Oportunidade
        </h3>
        <div className="flex flex-wrap gap-3">
          {([
            ['oportunidadeNoObjeto', 'No objeto'],
            ['oportunidadeNoTr', 'No TR'],
            ['oportunidadeNosLotes', 'Nos lotes'],
            ['oportunidadeNosItens', 'Nos itens'],
            ['oportunidadeNaPlanilha', 'Na planilha'],
            ['oportunidadeNoMemorial', 'No memorial'],
            ['oportunidadeEmAnexoTecnico', 'Em anexo técnico'],
          ] as const).map(([key, label]) => (
            <label key={key} className="flex items-center gap-1.5 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form[key]}
                onChange={(e) => set(key, e.target.checked)}
                className="rounded border-slate-300"
              />
              {label}
            </label>
          ))}
        </div>
      </section>

      {/* Bloco 4: Portfólio e soluções */}
      <section>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Portfólio e Soluções
        </h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-500 block mb-1">
              Portfólio aplicável (JSON array ou texto livre)
            </label>
            <textarea
              value={form.portfolioAplicavel}
              onChange={(e) => set('portfolioAplicavel', e.target.value)}
              rows={3}
              className="w-full text-xs font-mono border border-slate-200 rounded p-2 focus:outline-none focus:ring-1 focus:ring-[#1D4ED8] resize-none"
              placeholder='["containers adaptados", "módulos habitacionais"]'
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">
              Soluções Multiteiner aplicáveis (JSON array ou texto livre)
            </label>
            <textarea
              value={form.solucoesMuliteinerAplicaveis}
              onChange={(e) => set('solucoesMuliteinerAplicaveis', e.target.value)}
              rows={3}
              className="w-full text-xs font-mono border border-slate-200 rounded p-2 focus:outline-none focus:ring-1 focus:ring-[#1D4ED8] resize-none"
              placeholder='["alojamento modular", "escritório de obra"]'
            />
          </div>
        </div>
      </section>

      {/* Botão salvar */}
      <div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#1D4ED8] hover:bg-blue-700 text-white"
        >
          {saving ? 'Salvando...' : 'Salvar Análise'}
        </Button>
      </div>
    </div>
  )
}
