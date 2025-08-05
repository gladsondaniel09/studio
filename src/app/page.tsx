import AuditTimeline from '@/components/audit-timeline';
import { ThemeToggle } from '@/components/theme-toggle';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="container mx-auto p-4 md:p-8 flex justify-between items-center">
        <div></div>
        <ThemeToggle />
      </header>
      <main className="flex-grow container mx-auto p-4 md:p-8 pt-0">
        <AuditTimeline />
      </main>
    </div>
  );
}
