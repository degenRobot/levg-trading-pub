'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to leverage page
    router.push('/leverage');
  }, [router]);
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4"></h1>
          <p className="text-gray-600 dark:text-gray-400">Redirecting to trading interface...</p>
        </div>
      </div>
    </div>
  );
}