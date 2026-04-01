import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { temPermissaoEscrita } from "@/lib/documentos-empresa/permissoes";
import { registrarAuditoriaDoc } from "@/lib/documentos-empresa/auditoria";
import { calcularNivelAlerta, statusPorAlerta } from "@/lib/documentos-empresa/alertas";

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "empresa");
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// POST — substituir documento por nova versão
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();
  if (!temPermissaoEscrita(auth.role)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { id } = await params;

  const docAntigo = await db.documentoEmpresa.findUnique({ where: { id } });
  if (!docAntigo) {
    return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
  }
  if (docAntigo.status === "substituido") {
    return NextResponse.json(
      { error: "Documento já foi substituído" },
      { status: 400 }
    );
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const dataEmissao = formData.get("dataEmissao") as string | null;
  const dataValidade = formData.get("dataValidade") as string | null;
  const orgaoEmissor = formData.get("orgaoEmissor") as string | null;
  const observacoes = formData.get("observacoes") as string | null;

  if (!file) {
    return NextResponse.json({ error: "Arquivo obrigatório" }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Arquivo muito grande (máx. 10MB)" }, { status: 400 });
  }

  // Salvar arquivo
  const cnpjDir = path.join(UPLOAD_DIR, docAntigo.cnpj.replace(/\D/g, ""));
  await mkdir(cnpjDir, { recursive: true });

  const ext = path.extname(file.name) || "";
  const nomeUnico = `${randomUUID()}${ext}`;
  const caminho = path.join(cnpjDir, nomeUnico);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(caminho, buffer);

  const caminhoRelativo = `uploads/empresa/${docAntigo.cnpj.replace(/\D/g, "")}/${nomeUnico}`;

  // Calcular alerta
  const dataValidadeDate = dataValidade ? new Date(dataValidade) : null;
  const config = await db.configuracaoAlertaDoc.findUnique({
    where: { tipoDocumento: docAntigo.tipoDocumento },
  });
  const nivelAlerta = calcularNivelAlerta(dataValidadeDate, config);
  const statusDoc = statusPorAlerta(nivelAlerta);

  // Transação: marcar antigo como substituído + criar novo
  const [, novoDoc] = await db.$transaction([
    db.documentoEmpresa.update({
      where: { id },
      data: { status: "substituido" },
    }),
    db.documentoEmpresa.create({
      data: {
        cnpj: docAntigo.cnpj,
        categoria: docAntigo.categoria,
        tipoDocumento: docAntigo.tipoDocumento,
        nome: nomeUnico,
        nomeOriginal: file.name,
        tamanho: file.size,
        mimeType: file.type || "application/octet-stream",
        caminho: caminhoRelativo,
        versao: docAntigo.versao + 1,
        versaoAnteriorId: id,
        dataEmissao: dataEmissao ? new Date(dataEmissao) : null,
        dataValidade: dataValidadeDate,
        orgaoEmissor: orgaoEmissor || docAntigo.orgaoEmissor,
        observacoes: observacoes || null,
        status: statusDoc,
        nivelAlerta,
        enviadoPorId: auth.userId,
      },
      include: { enviadoPor: { select: { name: true } } },
    }),
  ]);

  // Auditorias
  await Promise.all([
    registrarAuditoriaDoc({
      documentoId: id,
      acao: "substituicao",
      detalhes: `Substituído pela versão ${novoDoc.versao}`,
      realizadoPorId: auth.userId,
    }),
    registrarAuditoriaDoc({
      documentoId: novoDoc.id,
      acao: "upload",
      detalhes: `Nova versão (v${novoDoc.versao}) substituindo ${docAntigo.nomeOriginal}`,
      realizadoPorId: auth.userId,
    }),
  ]);

  return NextResponse.json(novoDoc, { status: 201 });
}
