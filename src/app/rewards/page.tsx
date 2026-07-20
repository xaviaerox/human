'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useSparks } from '@/lib/sparks/SparkProvider';
import { useRewards } from '@/lib/rewards/RewardsProvider';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SparkBadge } from '@/components/ui/SparkBadge';
import { ArrowLeft, Gift, Clock, CheckCircle2, XCircle, Sparkles } from 'lucide-react';
import type { Reward } from '@/types';

export default function ChildRewardsPage() {
  const { session } = useAuth();
  const { balance } = useSparks();
  const { rewards, requests, requestReward, loading } = useRewards();

  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const isChild = session?.profile?.role === 'child';

  if (!isChild) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md p-6 text-center space-y-4">
          <Gift className="w-12 h-12 text-teal-600 mx-auto" />
          <h1 className="text-xl font-bold text-slate-800">Sección para Niños</h1>
          <p className="text-slate-600 text-sm">
            Esta pantalla es para que los niños canjeen sus chispas por recompensas familiares.
          </p>
          <Link href="/dashboard/rewards">
            <Button className="w-full">Ir a Gestión de Recompensas (Padres)</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const handleRequest = async (reward: Reward) => {
    if (balance < reward.cost) {
      setFeedback(`¡Necesitas ${reward.cost - balance} chispas más para esta recompensa! Sigue completando aventuras.`);
      setTimeout(() => setFeedback(null), 4000);
      return;
    }

    setRequestingId(reward.id);
    const res = await requestReward(reward.title, reward.emoji, reward.cost);
    setRequestingId(null);

    if (res.ok) {
      setFeedback(`¡Petición enviada! Tu familia la verá pronto. 🌟`);
      setTimeout(() => setFeedback(null), 4000);
    } else {
      setFeedback(`No pudimos enviar la petición. Intenta de nuevo.`);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50/50 via-sky-50/30 to-amber-50/40 p-4 sm:p-6 pb-24">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/home"
            className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900 transition-colors bg-white/80 backdrop-blur px-3 py-1.5 rounded-full border border-slate-200"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Volver a Inicio
          </Link>
          <SparkBadge count={balance} size="md" />
        </div>

        {/* Hero Card */}
        <Card className="p-6 bg-gradient-to-r from-amber-500/10 via-teal-500/10 to-emerald-500/10 border-amber-200/60 text-center space-y-3">
          <div className="inline-flex p-3 bg-amber-100 text-amber-700 rounded-full mb-1">
            <Gift className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Cofre de Recompensas</h1>
          <p className="text-slate-600 max-w-md mx-auto text-sm">
            Canjea tus chispas por actividades mágicas y momentos especiales con tu familia.
          </p>
        </Card>

        {/* Feedback Message */}
        {feedback && (
          <div className="bg-teal-600 text-white p-4 rounded-xl text-center text-sm font-medium shadow-md animate-fade-in flex items-center justify-center space-x-2">
            <Sparkles className="w-5 h-5 text-amber-300" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Available Rewards Grid */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-slate-800 flex items-center">
            <Gift className="w-5 h-5 mr-2 text-teal-600" />
            Recompensas Disponibles
          </h2>

          {loading ? (
            <div className="text-center py-8 text-slate-500 text-sm">Cargando recompensas...</div>
          ) : rewards.length === 0 ? (
            <Card className="p-8 text-center text-slate-500 space-y-2">
              <p className="text-base font-medium">Aún no hay recompensas creadas.</p>
              <p className="text-xs text-slate-400">Pide a tus padres que añadan recompensas familiares.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {rewards.map((reward) => {
                const canAfford = balance >= reward.cost;
                const isPending = requestingId === reward.id;

                return (
                  <Card
                    key={reward.id}
                    className={`p-5 flex flex-col justify-between space-y-4 border transition-all ${
                      canAfford
                        ? 'border-teal-200 bg-white hover:shadow-md'
                        : 'border-slate-200 bg-slate-50/80 opacity-90'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <span className="text-4xl">{reward.emoji || '🎁'}</span>
                        <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          ✨ {reward.cost} chispas
                        </div>
                      </div>
                      <h3 className="font-bold text-slate-800 text-lg leading-snug">{reward.title}</h3>
                    </div>

                    <Button
                      onClick={() => handleRequest(reward)}
                      disabled={isPending}
                      className={`w-full text-sm font-semibold rounded-xl transition-all ${
                        canAfford
                          ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-sm'
                          : 'bg-slate-200 text-slate-500 cursor-not-allowed hover:bg-slate-200'
                      }`}
                    >
                      {isPending ? 'Enviando...' : canAfford ? 'Pedir Recompensa ✨' : `Te faltan ${reward.cost - balance} ✨`}
                    </Button>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Requests Section */}
        {requests.length > 0 && (
          <div className="space-y-3 pt-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center">
              <Clock className="w-5 h-5 mr-2 text-amber-600" />
              Tus Peticiones Recientes
            </h2>

            <div className="space-y-2">
              {requests.slice(0, 5).map((req) => (
                <Card key={req.id} className="p-4 flex items-center justify-between border-slate-200 bg-white">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{req.emoji || '🎁'}</span>
                    <div>
                      <h4 className="font-semibold text-slate-800 text-sm">{req.title}</h4>
                      <p className="text-xs text-slate-500">
                        {new Date(req.created_at).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </p>
                    </div>
                  </div>

                  <div>
                    {req.status === 'pending' && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                        <Clock className="w-3.5 h-3.5 mr-1" /> Pendiente
                      </span>
                    )}
                    {req.status === 'approved' && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> ¡Aprobado! 🎉
                      </span>
                    )}
                    {req.status === 'rejected' && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                        <XCircle className="w-3.5 h-3.5 mr-1" /> Guardado para después
                      </span>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
