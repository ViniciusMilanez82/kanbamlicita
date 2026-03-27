-- AddForeignKey
ALTER TABLE "kanban_cards" ADD CONSTRAINT "kanban_cards_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
