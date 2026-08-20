'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function EventIdRedirect() {
  const router = useRouter();
  const { id } = useParams();

  useEffect(() => {
    if (id) {
      router.replace(`/customer/events/${id}`);
    } else {
      router.replace('/customer/events');
    }
  }, [id, router]);

  return null;
}
