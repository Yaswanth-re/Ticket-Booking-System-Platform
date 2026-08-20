'use client';

import { useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';

export default function EventBookRedirect() {
  const router = useRouter();
  const { id } = useParams();
  const searchParams = useSearchParams();

  useEffect(() => {
    const query = searchParams.toString();
    const target = `/customer/events/${id}/book` + (query ? `?${query}` : '');
    router.replace(target);
  }, [id, searchParams, router]);

  return null;
}
