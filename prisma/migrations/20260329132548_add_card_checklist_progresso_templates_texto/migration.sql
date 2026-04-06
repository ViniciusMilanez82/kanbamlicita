-- AlterTable
ALTER TABLE "configuracao_sistema" ADD COLUMN     "templates_texto" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "kanban_cards" ADD COLUMN     "checklist_progresso" JSONB NOT NULL DEFAULT '{}';
