
import { useEffect } from 'react';
import { usePageStore } from '@/store/pageStore';

export function usePageTitle(title: string) {
  const setPageTitle = usePageStore((state) => state.setPageTitle);

  useEffect(() => {
    setPageTitle(title);
  }, [title, setPageTitle]);
}
