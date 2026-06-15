'use client';

import { type ReactNode } from 'react';
import { AuthProvider } from '@/lib/auth/AuthProvider';
import { FamilyProvider } from '@/lib/family/FamilyProvider';
import { CompanionProvider } from '@/lib/companion/CompanionProvider';
import { EmotionalProvider } from '@/lib/emotional/EmotionalProvider';
import { ProgressionProvider } from '@/lib/progression/ProgressionProvider';
import { SparkProvider } from '@/lib/sparks/SparkProvider';
import {
  getAuthAdapter,
  getFamilyAdapter,
  getCompanionAdapter,
  getEmotionalAdapter,
} from '@/lib/adapters';

const authAdapter      = getAuthAdapter();
const familyAdapter    = getFamilyAdapter();
const companionAdapter = getCompanionAdapter();
const emotionalAdapter = getEmotionalAdapter();

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider adapter={authAdapter}>
      <FamilyProvider adapter={familyAdapter}>
        <CompanionProvider adapter={companionAdapter}>
          <EmotionalProvider adapter={emotionalAdapter}>
            <ProgressionProvider>
              <SparkProvider>
                {children}
              </SparkProvider>
            </ProgressionProvider>
          </EmotionalProvider>
        </CompanionProvider>
      </FamilyProvider>
    </AuthProvider>
  );
}

