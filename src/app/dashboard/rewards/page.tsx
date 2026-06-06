'use client';

import { useEffect, useState } from 'react';
import { useFamily } from '@/lib/family/FamilyProvider';
import { getRewardsAdapter } from '@/lib/adapters';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SparkBadge } from '@/components/ui/SparkBadge';
import Link from 'next/link';
import type { Reward, RewardRequest } from '@/types';

const rewardsAdapter = getRewardsAdapter();

const SUGGESTED_REWARDS = [
  { title: 'Elegir la cena', cost: 5, emoji: '🍕' },
  { title: '30 min de pantalla extra', cost: 10, emoji: '🎮' },
  { title: 'Tarde de parque', cost: 15, emoji: '🛝' },
  { title: 'Elegir película familiar', cost: 20, emoji: '🍿' },
];

export default function RewardsDashboardPage() {
  const { family } = useFamily();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [requests, setRequests] = useState<RewardRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    if (!family?.id) return;
    setLoading(true);

    const loadData = async () => {
      const rewardsRes = await rewardsAdapter.getRewards(family.id);
      if (rewardsRes.ok) setRewards(rewardsRes.data);

      const requestsRes = await rewardsAdapter.getRewardRequests(family.id);
      if (requestsRes.ok) {
        setRequests(requestsRes.data.filter(r => r.status === 'pending'));
      }
      setLoading(false);
    };

    loadData();
  }, [family?.id]);

  async function handleRejectRequest(id: string) {
    if (!confirm('¿Seguro que quieres rechazar esta petición?')) return;
    const res = await rewardsAdapter.deleteRewardRequest(id);
    if (res.ok) {
      setRequests(prev => prev.filter(r => r.id !== id));
    } else {
      alert('Error al rechazar: ' + res.error.message);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Seguro que quieres eliminar esta recompensa?')) return;
    const res = await rewardsAdapter.deleteReward(id);
    if (res.ok) {
      setRewards(prev => prev.filter(r => r.id !== id));
    } else {
      alert('Error al eliminar: ' + res.error.message);
    }
  }

  async function handleLoadSuggestions() {
    if (!family?.id || seeding) return;
    setSeeding(true);
    try {
      const created: Reward[] = [];
      for (const item of SUGGESTED_REWARDS) {
        const res = await rewardsAdapter.createReward(family.id, item);
        if (res.ok) created.push(res.data);
      }
      setRewards(prev => [...prev, ...created]);
    } catch (err) {
      console.error(err);
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-stone-800 font-semibold">Premios</h1>
          <p className="text-xs text-stone-400 mt-1">Configura el catálogo de recompensas que canjea tu hijo</p>
        </div>
        <Link href="/dashboard/rewards/new">
          <Button variant="primary" size="sm">+ Nuevo</Button>
        </Link>
      </div>

      {/* PENDING CHILD REQUESTS */}
      {!loading && requests.length > 0 && (
        <div className="flex flex-col gap-3 bg-amber-50/40 border border-amber-100 rounded-3xl p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold text-amber-800 flex items-center gap-1.5">
              <span>💡</span> Propuestas de los niños ({requests.length})
            </h3>
            <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              Nuevas
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {requests.map(req => (
              <Card key={req.id} variant="bordered" className="p-3.5 flex items-center justify-between bg-white/80 backdrop-blur-sm border-amber-100 hover:shadow-soft transition-all duration-300">
                <div className="flex items-center gap-3">
                  <span className="text-3xl" role="img" aria-label={req.title}>{req.emoji}</span>
                  <div className="flex flex-col">
                    <span className="font-semibold text-stone-700 text-sm">{req.title}</span>
                    <span className="text-stone-400 text-xs mt-0.5">Pedido por {req.child?.display_name || 'Hijo'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link href={`/dashboard/rewards/new?title=${encodeURIComponent(req.title)}&emoji=${encodeURIComponent(req.emoji)}&request_id=${req.id}`}>
                    <Button variant="primary" size="sm">
                      Aprobar
                    </Button>
                  </Link>
                  <button
                    onClick={() => handleRejectRequest(req.id)}
                    className="p-1.5 text-stone-400 hover:text-red-500 transition-colors cursor-pointer text-base leading-none"
                    aria-label="Rechazar petición"
                  >
                    ×
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-stone-200 border-t-bloom-400 rounded-full animate-spin" />
        </div>
      )}

      {!loading && rewards.length === 0 && (
        <Card variant="warm" className="text-center py-10 flex flex-col items-center gap-4">
          <p className="text-stone-500 max-w-sm text-sm">
            Aún no hay recompensas en el catálogo de tu familia.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/dashboard/rewards/new">
              <Button variant="primary" size="md">Crear recompensa</Button>
            </Link>
            <Button
              variant="calm"
              size="md"
              onClick={handleLoadSuggestions}
              loading={seeding}
            >
              Cargar sugerencias 🎁
            </Button>
          </div>
        </Card>
      )}

      {!loading && rewards.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {rewards.map(reward => (
            <Card key={reward.id} variant="bordered" className="p-4 flex items-center justify-between hover:shadow-soft transition-all duration-300">
              <div className="flex items-center gap-3">
                <span className="text-3xl" role="img" aria-label={reward.title}>{reward.emoji}</span>
                <div className="flex flex-col">
                  <span className="font-semibold text-stone-700 text-sm">{reward.title}</span>
                  <span className="text-stone-400 text-xs mt-0.5">{reward.cost} Sparks ✦</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link href={`/dashboard/rewards/edit?id=${reward.id}`}>
                  <button
                    className="p-1 text-stone-400 hover:text-bloom-600 transition-colors cursor-pointer text-sm"
                    aria-label={`Editar ${reward.title}`}
                  >
                    ✏️
                  </button>
                </Link>
                <button
                  onClick={() => handleDelete(reward.id)}
                  className="p-1 text-stone-400 hover:text-red-500 transition-colors cursor-pointer text-sm"
                  aria-label={`Eliminar ${reward.title}`}
                >
                  ×
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
