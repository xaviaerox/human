'use client';

import { useEffect, useState } from 'react';
import { useFamily } from '@/lib/family/FamilyProvider';
import { useAuth } from '@/lib/auth/AuthProvider';
import { getEmotionalAdapter, getRoutineAdapter, getProgressionAdapter, DATA_SOURCE } from '@/lib/adapters';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { SparkBadge } from '@/components/ui/SparkBadge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import type { Profile, EmotionalWeeklySummary, ValueDimensionId } from '@/types';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

const emotionalAdapter   = getEmotionalAdapter();
const routineAdapter     = getRoutineAdapter();
const progressionAdapter = getProgressionAdapter();

export default function DashboardPage() {
  const { family, children } = useFamily();
  const { profile } = useAuth();
  const [summaries, setSummaries]         = useState<Record<string, EmotionalWeeklySummary | null>>({});
  const [routineCounts, setRoutineCounts] = useState<Record<string, number>>({});
  const [sparkBalances, setSparkBalances] = useState<Record<string, number>>({});
  const [valueScores, setValueScores]     = useState<Record<string, Record<string, number>>>({});

  useEffect(() => {
    const channels: RealtimeChannel[] = [];

    children.forEach(async child => {
      const s = await emotionalAdapter.getWeeklySummaries(child.id, 1);
      if (s.ok) setSummaries(prev => ({ ...prev, [child.id]: s.data[s.data.length - 1] ?? null }));

      const scoresRes = await progressionAdapter.getScores(child.id);
      if (scoresRes.ok) {
        const scoreMap: Record<string, number> = {};
        scoresRes.data.forEach(item => {
          scoreMap[item.dimension_id] = item.score;
        });
        setValueScores(prev => ({ ...prev, [child.id]: scoreMap }));
      }
      
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      const c = await routineAdapter.getCompletions(
        child.id,
        weekStart.toISOString().split('T')[0]!,
        now.toISOString().split('T')[0]!
      );
      if (c.ok) setRoutineCounts(prev => ({ ...prev, [child.id]: c.data.length }));

      // Fetch spark balance
      if (DATA_SOURCE === 'supabase') {
        const fetchBalance = async () => {
          const { data, error } = await supabase
            .from('spark_ledger')
            .select('delta')
            .eq('child_id', child.id);
          if (!error && data) {
            const sum = data.reduce((acc, row) => acc + (row.delta || 0), 0);
            setSparkBalances(prev => ({ ...prev, [child.id]: sum }));
          }
        };
        
        fetchBalance();

        const channel = supabase
          .channel(`sparks_dash:${child.id}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'spark_ledger', filter: `child_id=eq.${child.id}` },
            () => {
              fetchBalance();
            }
          )
          .subscribe();

        channels.push(channel);
      } else {
        setSparkBalances(prev => ({ ...prev, [child.id]: 12 }));
      }
    });

    return () => {
      if (DATA_SOURCE === 'supabase') {
        channels.forEach(ch => supabase.removeChannel(ch));
      }
    };
  }, [children]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl text-stone-800">Hola, {profile?.display_name}</h1>
        <p className="text-stone-500 text-sm mt-1">{family?.name}</p>
      </div>
      {children.map(child => (
        <ChildSummaryCard
          key={child.id}
          child={child}
          emotionalSummary={summaries[child.id] ?? null}
          routineCount={routineCounts[child.id] ?? 0}
          sparkBalance={sparkBalances[child.id] ?? 0}
          scores={valueScores[child.id] || {}}
        />
      ))}
      {children.length === 0 && (
        <Card variant="warm" className="text-center py-10">
          <p className="text-stone-500 mb-4">Aún no hay niños en la familia.</p>
          <InviteButton />
        </Card>
      )}
      <div className="flex gap-3">
        <Link href="/dashboard/routines/new" className="flex-1">
          <Button variant="secondary" size="md" className="w-full">+ Nueva rutina</Button>
        </Link>
        <Link href="/dashboard/goals/new" className="flex-1">
          <Button variant="secondary" size="md" className="w-full">+ Nuevo objetivo</Button>
        </Link>
      </div>
    </div>
  );
}

const DIMENSION_CONFIG: { id: ValueDimensionId; name: string; emoji: string; color: 'sky' | 'moss' | 'bloom' }[] = [
  { id: 'regulation', name: 'Regulación', emoji: '☯', color: 'sky' },
  { id: 'autonomy',   name: 'Autonomía',  emoji: '↟', color: 'moss' },
  { id: 'courage',    name: 'Valentía',   emoji: '▲', color: 'bloom' },
  { id: 'connection', name: 'Constancia', emoji: '♾', color: 'moss' },
  { id: 'empathy',    name: 'Empatía',    emoji: '♡', color: 'sky' },
];

function ChildSummaryCard({ child, emotionalSummary, routineCount, sparkBalance, scores }: {
  child: Profile; emotionalSummary: EmotionalWeeklySummary | null; routineCount: number; sparkBalance: number; scores: Record<string, number>;
}) {
  const valence  = emotionalSummary?.avg_valence  ?? null;
  const energy   = emotionalSummary?.avg_energy   ?? null;
  const checkins = emotionalSummary?.checkin_count ?? 0;
  const moodLabel =
    valence === null ? 'Sin datos esta semana' :
    valence >= 4 ? 'Bien esta semana' :
    valence >= 3 ? 'Regular esta semana' : 'Ha tenido una semana difícil';
  const moodColor =
    valence === null ? 'text-stone-400' :
    valence >= 4 ? 'text-moss-600' :
    valence >= 3 ? 'text-sky-600' : 'text-bloom-600';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{child.display_name}</CardTitle>
          <SparkBadge count={sparkBalance} size="sm" />
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-xs text-stone-400 uppercase tracking-wider">Esta semana</p>
            <p className={`text-sm font-medium ${moodColor}`}>{moodLabel}</p>
            {checkins > 0 && <p className="text-xs text-stone-400">{checkins} registro{checkins !== 1 ? 's' : ''}</p>}
          </div>
          {energy !== null && (
            <div className="flex flex-col gap-1">
              <p className="text-xs text-stone-400">Energía media</p>
              <ProgressBar value={(energy / 5) * 100} color="sky" />
            </div>
          )}
          <div className="flex items-center justify-between">
            <p className="text-xs text-stone-400">Rutinas esta semana</p>
            <span className="text-sm font-medium text-stone-700">{routineCount}</span>
          </div>

          {/* Value Dimensions Progress */}
          <div className="border-t border-stone-100 pt-3 flex flex-col gap-2">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Evolución de Valores</p>
            <div className="grid grid-cols-2 gap-2">
              {DIMENSION_CONFIG.map(dim => {
                const score = scores[dim.id] || 0;
                const percent = Math.min(100, Math.round((score / 100) * 100));

                return (
                  <div key={dim.id} className="p-2 rounded-xl bg-stone-50 border border-stone-150 space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium text-stone-700">
                      <span>{dim.emoji} {dim.name}</span>
                      <span className="text-[10px] text-stone-400 font-bold">{score} pts</span>
                    </div>
                    <ProgressBar value={percent} color={dim.color} />
                  </div>
                );
              })}
            </div>
          </div>

          <Link href={`/dashboard/child?id=${child.id}`}>
            <Button variant="ghost" size="sm" className="w-full">Ver detalle →</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function InviteButton() {
  const { createInvite } = useFamily();
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    setLoading(true);
    const invite = await createInvite('child');
    if (invite) setCode(invite.invite_code);
    setLoading(false);
  }

  if (code) {
    return (
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm text-stone-600">Código de invitación:</p>
        <p className="font-mono text-2xl tracking-widest font-bold text-bloom-600">{code}</p>
        <p className="text-xs text-stone-400">Válido 7 días</p>
      </div>
    );
  }
  return <Button variant="calm" size="md" onClick={handleCreate} loading={loading}>Invitar a un niño</Button>;
}
