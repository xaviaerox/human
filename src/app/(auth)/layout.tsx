import { type ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-stone-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Mira wordmark */}
        <div className="text-center mb-10">
          <h1 className="font-display text-4xl font-semibold text-stone-800 tracking-tight">
            mira
          </h1>
          <p className="mt-2 text-stone-500 text-sm">un espacio de calma para crecer juntos</p>
        </div>
        {children}
      </div>
    </div>
  );
}
