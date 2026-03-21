export function MaintenanceScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-xl w-full rounded-2xl border border-border bg-card p-10 text-center shadow-xl">
        <h1 className="text-3xl font-bold tracking-tight mb-3">Maintenance</h1>
        <p className="text-muted-foreground text-base">
          System is currently under maintenance
        </p>
      </div>
    </div>
  );
}
