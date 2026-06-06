import { Suspense } from 'react';
import ChildDetailClient from './ChildDetailClient';

export default function ChildDetailPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-stone-200 border-t-bloom-400 rounded-full animate-spin" /></div>}>
      <ChildDetailClient />
    </Suspense>
  );
}
