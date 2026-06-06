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

  const load = useCallback(async () => {
    if (!session?.family.id) {
      setFamily(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const result = await adapter.getFamily(session.family.id);
    if (result.ok) setFamily(result.data);
    setLoading(false);
  }, [adapter, session?.family.id]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime subscription
  useEffect(() => {
    if (!session?.family.id) return;
    const unsubscribe = adapter.subscribeToFamily(session.family.id, members => {
      setFamily(prev => prev ? { ...prev, members } : null);
    });
    return unsubscribe;
  }, [adapter, session?.family.id]);

  const familyChildren = useMemo(
    () => family?.members.filter(m => m.role === 'child') ?? [],
    [family]
  );

  const createInvite = useCallback(async (role: 'parent' | 'child') => {
    if (!session?.family.id || !session.profile.id) return null;
    const result = await adapter.createInvite(session.family.id, session.profile.id, role);
    return result.ok ? result.data : null;
  }, [adapter, session]);

  const getActiveInvites = useCallback(async () => {
    if (!session?.family.id) return [];
    const result = await adapter.getActiveInvites(session.family.id);
    return result.ok ? result.data : [];
  }, [adapter, session?.family.id]);

  const updateSettings = useCallback(async (settings: Partial<Family['settings']>) => {
    if (!session?.family.id) return;
    const result = await adapter.updateFamilySettings(session.family.id, settings);
    if (result.ok) setFamily(prev => prev ? { ...prev, settings: result.data.settings } : null);
  }, [adapter, session?.family.id]);

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
