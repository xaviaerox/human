'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFamily } from '@/lib/family/FamilyProvider';
import { getRewardsAdapter } from '@/lib/adapters';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const rewardsAdapter = getRewardsAdapter();

const SUGGESTED_EMOJIS = ['🍕', '🎮', '🛝', '🍿', '🧸', '📖', '🍦', '🚴', '🎈', '🎁', '🍩', '🏊', '⚽'];

function EditRewardForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id') ?? '';
  const { family } = useFamily();

  const [title, setTitle] = useState('');
  const [cost, setCost] = useState(5);
  const [emoji, setEmoji] = useState('🎁');
  const [cooldownQty, setCooldownQty] = useState(0);
  const [cooldownUnit, setCooldownUnit] = useState<'hours' | 'days'>('hours');
  const [fetching, setFetching] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id || !family?.id) return;
    rewardsAdapter.getRewards(family.id).then(res => {
      if (res.ok) {
        const item = res.data.find(r => r.id === id);
        if (item) {
          setTitle(item.title);
          setCost(item.cost);
          setEmoji(item.emoji);
          const hours = item.cooldown_hours || 0;
          if (hours > 0 && hours % 24 === 0) {
            setCooldownQty(hours / 24);
            setCooldownUnit('days');
          } else {
            setCooldownQty(hours);
            setCooldownUnit('hours');
          }
        } else {
          setError('Recompensa no encontrada');
        }
      } else {
        setError('Error al cargar la recompensa');
      }
      setFetching(false);
    });
  }, [id, family?.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !title.trim()) {
      setError('Por favor, introduce un título.');
      return;
    }
    if (cost < 0) {
      setError('El coste no puede ser negativo.');
      return;
    }

    setLoading(true);
    setError('');

    const cooldown_hours = cooldownQty * (cooldownUnit === 'days' ? 24 : 1);

    const res = await rewardsAdapter.updateReward(id, {
      title: title.trim(),
      cost,
      emoji: emoji.trim() || '🎁',
      cooldown_hours,
    });

    setLoading(false);

    if (res.ok) {
      router.push('/dashboard/rewards');
    } else {
      setError('Error al actualizar: ' + res.error.message);
    }
  }

  if (fetching) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-stone-200 border-t-bloom-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-1">
        <Input
          label="Título del premio"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Ej: Tarde de piscina, Elegir postre..."
          required
        />

        <Input
          label="Coste en Sparks ✦"
          type="number"
          value={cost}
          onChange={e => setCost(Number(e.target.value))}
          min={0}
          required
        />

        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
            Tiempo de espera (Cooldown)
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={cooldownQty}
              onChange={e => setCooldownQty(Math.max(0, Number(e.target.value)))}
              min={0}
              className="w-24 p-2.5 rounded-2xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-bloom-200 text-sm text-stone-700 bg-stone-50/50"
            />
            <select
              value={cooldownUnit}
              onChange={e => setCooldownUnit(e.target.value as 'hours' | 'days')}
              className="flex-1 p-2.5 rounded-2xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-bloom-200 text-sm text-stone-700 bg-stone-50/50"
            >
              <option value="hours">Horas</option>
              <option value="days">Días</option>
            </select>
          </div>
          <p className="text-[10px] text-stone-400">
            Evita que el niño canjee este premio repetidamente hasta que transcurra este tiempo. Usa 0 para sin límite.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
            Emoji representativo
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={emoji}
              onChange={e => setEmoji(e.target.value)}
              maxLength={4}
              className="w-12 text-center text-xl p-2 rounded-2xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-bloom-200"
              placeholder="🎁"
            />
            <div className="flex-1 flex flex-wrap gap-1 items-center bg-stone-50 p-2 rounded-2xl border border-stone-100">
              {SUGGESTED_EMOJIS.map(item => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setEmoji(item)}
                  className={cn(
                    'w-7 h-7 flex items-center justify-center text-sm rounded-lg hover:bg-stone-200 transition-all cursor-pointer',
                    emoji === item && 'bg-bloom-100 border border-bloom-300'
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 text-center animate-fade-in" role="alert">
            {error}
          </p>
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={loading}
          className="w-full mt-2"
        >
          Guardar Cambios
        </Button>
      </form>
    </Card>
  );
}

export default function EditRewardPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-6 max-w-md mx-auto">
      <div>
        <button
          onClick={() => router.back()}
          className="text-stone-400 text-sm hover:text-stone-600 transition-colors flex items-center gap-1 cursor-pointer"
        >
          ← Volver
        </button>
        <h1 className="font-display text-2xl text-stone-800 font-semibold mt-3">Editar Recompensa</h1>
      </div>

      <Suspense fallback={
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-stone-200 border-t-bloom-400 rounded-full animate-spin" />
        </div>
      }>
        <EditRewardForm />
      </Suspense>
    </div>
  );
}
