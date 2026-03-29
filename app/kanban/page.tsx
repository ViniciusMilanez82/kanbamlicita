import { TopBar } from "@/components/layout/TopBar";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";

export default function KanbanPage() {
  return (
    <>
      <TopBar title="Kanban de Licitações" />
      <div className="flex-1 overflow-hidden p-4">
        <KanbanBoard />
      </div>
    </>
  );
}
