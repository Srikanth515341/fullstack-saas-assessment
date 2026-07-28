'use client';

import { Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocale } from './locale-provider';

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setLocale(locale === 'en' ? 'fr' : 'en')}
      aria-label="Switch language"
      title={locale === 'en' ? 'Passer au français' : 'Switch to English'}
    >
      <Languages className="h-5 w-5" />
    </Button>
  );
}
