/**
 * Controle de permissões para o módulo de gestão documental.
 * Roles válidas: admin, juridico, administrativo, comercial, leitura, user (legado → comercial)
 */

const ROLES_ESCRITA = ["admin", "juridico", "administrativo"];
const ROLES_ADMIN = ["admin"];
const ROLES_AUDITORIA = ["admin", "juridico"];

/** Pode fazer upload, editar metadados, substituir versão */
export function temPermissaoEscrita(role: string): boolean {
  return ROLES_ESCRITA.includes(role);
}

/** Pode excluir documentos, configurar alertas, gerenciar tipos */
export function temPermissaoAdmin(role: string): boolean {
  return ROLES_ADMIN.includes(role);
}

/** Pode ver logs de auditoria */
export function temPermissaoAuditoria(role: string): boolean {
  return ROLES_AUDITORIA.includes(role);
}

/** Lista de roles válidas para validação */
export const ROLES_VALIDAS = [
  "admin",
  "juridico",
  "administrativo",
  "comercial",
  "leitura",
  "user",
] as const;
