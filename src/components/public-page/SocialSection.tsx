import { SocialSection as SocialSectionType } from '@/types/public-page';
import { Button } from '@/components/ui/button';
import { Phone, Mail, MessageCircle } from 'lucide-react';

interface SocialSectionProps {
  section: SocialSectionType;
}

// Validar e construir URL segura do Instagram
function getSafeInstagramUrl(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();

  // Se começa com http, validar que é realmente Instagram
  if (trimmed.startsWith('http')) {
    try {
      const url = new URL(trimmed);
      const allowedHosts = ['instagram.com', 'www.instagram.com', 'instagr.am'];
      if (!allowedHosts.includes(url.hostname)) {
        return null; // URL não é do Instagram
      }
      // Forçar HTTPS
      url.protocol = 'https:';
      return url.toString();
    } catch {
      return null;
    }
  }

  // Se é username, construir URL segura
  const username = trimmed.replace('@', '').replace(/[^a-zA-Z0-9._]/g, '');
  if (username) {
    return `https://instagram.com/${username}`;
  }
  return null;
}

// Validar e construir URL segura do Facebook
function getSafeFacebookUrl(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();

  // Se começa com http, validar que é realmente Facebook
  if (trimmed.startsWith('http')) {
    try {
      const url = new URL(trimmed);
      const allowedHosts = ['facebook.com', 'www.facebook.com', 'fb.com', 'www.fb.com', 'm.facebook.com'];
      if (!allowedHosts.includes(url.hostname)) {
        return null; // URL não é do Facebook
      }
      // Forçar HTTPS
      url.protocol = 'https:';
      return url.toString();
    } catch {
      return null;
    }
  }

  // Se é username/pagename, construir URL segura
  const pagename = trimmed.replace(/[^a-zA-Z0-9.]/g, '');
  if (pagename) {
    return `https://facebook.com/${pagename}`;
  }
  return null;
}

// Validar email básico
function isValidEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  // Regex simples para email
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function SocialSection({ section }: SocialSectionProps) {
  if (!section.enabled) return null;

  const instagramUrl = getSafeInstagramUrl(section.instagram);
  const facebookUrl = getSafeFacebookUrl(section.facebook);
  const validEmail = isValidEmail(section.email) ? section.email : null;

  const hasAnyLink =
    section.whatsapp ||
    instagramUrl ||
    facebookUrl ||
    section.phone ||
    validEmail;

  if (!hasAnyLink) return null;

  return (
    <section className="py-12 md:py-16 px-4 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-center justify-center gap-4">
          {/* WhatsApp */}
          {section.whatsapp && (
            <Button
              asChild
              size="lg"
              className="bg-[#25D366] hover:bg-[#128C7E] text-white gap-2 rounded-full px-6"
            >
              <a
                href={`https://wa.me/${section.whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="h-5 w-5" />
                WhatsApp
              </a>
            </Button>
          )}

          {/* Instagram - URL validada */}
          {instagramUrl && (
            <Button
              asChild
              size="lg"
              className="bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] hover:opacity-90 text-white gap-2 rounded-full px-6"
            >
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
                Instagram
              </a>
            </Button>
          )}

          {/* Facebook - URL validada */}
          {facebookUrl && (
            <Button
              asChild
              size="lg"
              className="bg-[#1877F2] hover:bg-[#166FE5] text-white gap-2 rounded-full px-6"
            >
              <a
                href={facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Facebook
              </a>
            </Button>
          )}

          {/* Phone */}
          {section.phone && (
            <Button
              asChild
              size="lg"
              variant="outline"
              className="gap-2 rounded-full px-6"
            >
              <a href={`tel:${section.phone.replace(/\D/g, '')}`}>
                <Phone className="h-5 w-5" />
                {section.phone}
              </a>
            </Button>
          )}

          {/* Email - validado */}
          {validEmail && (
            <Button
              asChild
              size="lg"
              variant="outline"
              className="gap-2 rounded-full px-6"
            >
              <a href={`mailto:${validEmail}`}>
                <Mail className="h-5 w-5" />
                {validEmail}
              </a>
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
