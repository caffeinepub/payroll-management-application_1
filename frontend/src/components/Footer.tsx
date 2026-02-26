export default function Footer() {
  const year = new Date().getFullYear();
  const appId = encodeURIComponent(window.location.hostname || 'payroll-app');

  return (
    <footer className="border-t border-border bg-card mt-auto">
      <div className="container mx-auto px-4 max-w-7xl py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>© {year} Σύστημα Μισθοδοσίας</span>
        <span>
          Built with ❤️ using{' '}
          <a
            href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${appId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline font-medium"
          >
            caffeine.ai
          </a>
        </span>
      </div>
    </footer>
  );
}
