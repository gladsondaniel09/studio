import AuditTimeline from '@/components/audit-timeline';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <main className="flex-grow flex">
        <AuditTimeline />
      </main>
    </div>
  );
}
