import type { DocumentosDetalhe } from '@/types/licitacao-detalhe'

type Props = { documentos: DocumentosDetalhe }

const DOCUMENTOS: Array<{ key: keyof NonNullable<DocumentosDetalhe>; label: string }> = [
  { key: 'possuiEdital', label: 'Edital' },
  { key: 'possuiTermoReferencia', label: 'Termo de Referência' },
  { key: 'possuiProjetoBasico', label: 'Projeto Básico' },
  { key: 'possuiMemorialDescritivo', label: 'Memorial Descritivo' },
  { key: 'possuiAnexosTecnicos', label: 'Anexos Técnicos' },
  { key: 'possuiPlanilhaOrcamentaria', label: 'Planilha Orçamentária' },
  { key: 'possuiCronograma', label: 'Cronograma' },
  { key: 'possuiMinutaContratual', label: 'Minuta Contratual' },
]

export function DocumentosTab({ documentos }: Props) {
  if (!documentos) {
    return (
      <div className="p-6 text-sm text-slate-400 italic">
        Documentos não analisados para esta licitação.
      </div>
    )
  }

  return (
    <div className="p-6">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left text-xs text-slate-500 font-medium pb-2">Documento</th>
            <th className="text-left text-xs text-slate-500 font-medium pb-2">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {DOCUMENTOS.map(({ key, label }) => {
            const presente = documentos[key] as boolean
            return (
              <tr key={key}>
                <td className="py-2 text-slate-700">{label}</td>
                <td className="py-2">
                  {presente ? (
                    <span className="text-green-700 font-medium">✅ Presente</span>
                  ) : (
                    <span className="text-slate-400">⚫ Ausente</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {documentos.lacunasDocumentais && (
        <div className="mt-4">
          <p className="text-xs text-slate-400 mb-1">Lacunas documentais</p>
          <p className="text-sm text-slate-700">{documentos.lacunasDocumentais}</p>
        </div>
      )}
    </div>
  )
}
