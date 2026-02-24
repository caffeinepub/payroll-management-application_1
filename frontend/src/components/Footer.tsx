import { Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container py-6">
        <p className="text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
          © 2025. Δημιουργήθηκε με{' '}
          <Heart className="h-4 w-4 text-red-500 fill-red-500" /> χρησιμοποιώντας{' '}
          <a
            href="https://caffeine.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground hover:text-primary transition-colors"
          >
            caffeine.ai
          </a>
        </p>
      </div>
    </footer>
  );
}
