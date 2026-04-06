import { TopBar } from "@/components/layout/TopBar";
import { ConcorrentesClient } from "@/components/concorrentes/ConcorrentesClient";

export default function ConcorrentesPage() {
  return (
    <>
      <TopBar title="Concorrentes" />
      <div className="flex-1 overflow-auto p-6">
        <ConcorrentesClient />
      </div>
    </>
  );
}
