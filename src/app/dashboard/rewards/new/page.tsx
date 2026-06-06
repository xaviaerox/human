'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFamily } from '@/lib/family/FamilyProvider';
import { getRewardsAdapter } from '@/lib/adapters';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const rewardsAdapter = getRewardsAdapter();

const SUGGESTED_EMOJIS = ['🍕', '🎮', '🛝', '🍿', '🧸', '📖', '🍦', '🚴', '🎈', '🎁', '🍩', '🏊', '⚽'];

export default function NewRewardPage() {
  const router = useRouter();
  const { family } = useFamily();

  const [title, setTitle] = useState('');
  const [cost, setCost] = useState(5);
  const [emoji, setEmoji] = useState('🎁');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!family?.id) return;
    if (!title.trim()) {
      setError('Por favor, introduce un título.');
      return;
    }
    if (cost < 0) {
      setError('El coste no puede ser negativo.');
      return;
    }

    setLoading(true);
    setError('');

    const res = await rewardsAdapter.createReward(family.id, {
      title: title.trim(),
      cost,
      emoji: emoji.trim() || '🎁',
    });

    setLoading(false);

    if (res.ok) {
      router.push('/dashboard/rewards');
    } else {
      setError('Error al crear: ' + res.error.message);
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-md mx-auto">
      <div>
        <button
          onClick={() => router.back()}
          className="text-stone-400 text-sm hover:text-stone-600 transition-colors flex items-center gap-1 cursor-pointer"
        >
          ← Volver
        </button>
        <h1 className="font-display text-2xl text-stone-800 font-semibold mt-3">Nueva Recompensa</h1>
      </div>

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
            Guardar Recompensa
          </Button>
        </form>
      </Card>
    </div>
  );
}
