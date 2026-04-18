import { useEffect } from 'react';

/**
 * Lightweight SEO component — updates document title per page.
 * No external dependencies needed.
 */
export function usePageTitle(title: string) {
  useEffect(() => {
    const prev = document.title;
    document.title = title ? `${title} — Chama Yetu Pamoja` : 'Chama Yetu Pamoja — Sports Intelligence Hub';
    return () => { document.title = prev; };
  }, [title]);
}
