// ============================================================
// MIRA — FamilyProvider
// ============================================================

'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
  type ReactNode,
} from 'react';
import type { IFamilyAdapter } from './adapters/IFamilyAdapter';
import type { Family, Profile, FamilyInvite, FamilyWithMembers } from '@/types';
import { useAuth } from '@/lib/auth/AuthProvider';

interface FamilyContextValue {
  family: FamilyWithMembers | null;
  children: Profile[];
  loading: boolean;
  createInvite: (role: 'parent' | 'child') => Promise<FamilyInvite | null>;
  getActiveInvites: () => Promise<FamilyInvite[]>;
  updateSettings: (settings: Partial<Family['settings']>) => Promise<void>;
  refresh: () => Promise<void>;
}

const FamilyContext = createContext<FamilyContextValue | null>(null);

interface FamilyProviderProps {
  adapter: IFamilyAdapter;
  children: ReactNode;
}

export function FamilyProvider({ adapter, children }: FamilyProviderProps) {
  const { session } = useAuth();
  const [family, setFamily] = useState<FamilyWithMembers | null>(null);
  const [loading, setLoading] = useState(true);

  const familyId = session?.family.id;
  const profileId = session?.profile.id;

  const load = useCallback(async () => {
    if (!familyId) {
      setFamily(null);
      setLoading(false);
      return;
    }
    const result = await adapter.getFamily(familyId);
    if (result.ok) setFamily(result.data);
    setLoading(false);
  }, [adapter, familyId]);

  useEffect(() => {
    let isMounted = true;
    if (!familyId) {
      queueMicrotask(() => {
        if (isMounted) {
          setFamily(null);
          setLoading(false);
        }
      });
      return () => {
        isMounted = false;
      };
    }

    adapter.getFamily(familyId).then(result => {
      if (isMounted) {
        if (result.ok) setFamily(result.data);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [adapter, familyId]);

  // Realtime subscription
  useEffect(() => {
    if (!familyId) return;
    const unsubscribe = adapter.subscribeToFamily(familyId, members => {
      setFamily(prev => prev ? { ...prev, members } : null);
    });
    return unsubscribe;
  }, [adapter, familyId]);

  const familyChildren = useMemo(
    () => family?.members.filter(m => m.role === 'child') ?? [],
    [family]
  );

  const createInvite = useCallback(async (role: 'parent' | 'child') => {
    if (!familyId || !profileId) return null;
    const result = await adapter.createInvite(familyId, profileId, role);
    return result.ok ? result.data : null;
  }, [adapter, familyId, profileId]);

  const getActiveInvites = useCallback(async () => {
    if (!familyId) return [];
    const result = await adapter.getActiveInvites(familyId);
    return result.ok ? result.data : [];
  }, [adapter, familyId]);

  const updateSettings = useCallback(async (settings: Partial<Family['settings']>) => {
    if (!familyId) return;
    const result = await adapter.updateFamilySettings(familyId, settings);
    if (result.ok) setFamily(prev => prev ? { ...prev, settings: result.data.settings } : null);
  }, [adapter, familyId]);

  const value = useMemo<FamilyContextValue>(() => ({
    family,
    children: familyChildren,
    loading,
    createInvite,
    getActiveInvites,
    updateSettings,
    refresh: load,
  }), [family, familyChildren, loading, createInvite, getActiveInvites, updateSettings, load]);

  return (
    <FamilyContext.Provider value={value}>
      {children}
    </FamilyContext.Provider>
  );
}

export function useFamily(): FamilyContextValue {
  const ctx = useContext(FamilyContext);
  if (!ctx) throw new Error('[Mira] useFamily must be used within <FamilyProvider>');
  return ctx;
}
