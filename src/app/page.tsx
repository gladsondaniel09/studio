import AuditTimeline from '@/components/audit-timeline';
import { History } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="p-4 border-b bg-card">
        <div className="container mx-auto flex items-center gap-3">
          <History className="w-8 h-8 text-primary" />
          <h1 className="text-2xl font-bold font-headline text-foreground">
            Audit Log Timeline
          </h1>
        </div>
      </header>
      <main className="flex-grow container mx-auto p-4 md:p-8">
        <AuditTimeline />
      </main>
      <footer className="p-4 border-t text-center text-sm text-muted-foreground bg-card">
        <p>Powered by Firebase Studio</p>
      </footer>
    </div>
  );
}
