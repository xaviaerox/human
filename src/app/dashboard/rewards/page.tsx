'use client';

import { useEffect, useState } from 'react';
import { useFamily } from '@/lib/family/FamilyProvider';
import { getRewardsAdapter, DATA_SOURCE } from '@/lib/adapters';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import type { Reward, RewardRequest } from '@/types';
import { supabase } from '@/lib/supabase';
import { Sparkles, Check, X, Edit2, Trash2, Plus, Gift } from 'lucide-react';

const rewardsAdapter = getRewardsAdapter();

const SUGGESTED_REWARDS = [
  { title: 'Elegir la cena', cost: 5, emoji: '☕', cooldown_hours: 0 },
  { title: '30 min de pantalla extra', cost: 10, emoji: '⚡', cooldown_hours: 0 },
  { title: 'Tarde de parque', cost: 15, emoji: '☘', cooldown_hours: 0 },
  { title: 'Elegir película familiar', cost: 20, emoji: '♫', cooldown_hours: 0 },
];

export default function RewardsDashboardPage() {
  const { family, children } = useFamily();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [requests, setRequests] = useState<RewardRequest[]>([]);
  const [childBalances, setChildBalances] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [submittingAction, setSubmittingAction] = useState(false);

  // Approval Modal State for Child Proposals
  const [selectedRequest, setSelectedRequest] = useState<RewardRequest | null>(null);
  const [approvalCost, setApprovalCost] = useState<number>(10);
  const [addToCatalog, setAddToCatalog] = useState<boolean>(true);
  const [deductSparks, setDeductSparks] = useState<boolean>(false);

  useEffect(() => {
    if (!family?.id) return;

    const timer = setTimeout(() => setLoading(true), 0);

    const loadData = async () => {
      const rewardsRes = await rewardsAdapter.getRewards(family.id);
      if (rewardsRes.ok) setRewards(rewardsRes.data);

      const requestsRes = await rewardsAdapter.getRewardRequests(family.id);
      if (requestsRes.ok) {
        setRequests(requestsRes.data.filter(r => r.status === 'pending'));
      }

      if (DATA_SOURCE === 'supabase') {
        const { data, error } = await supabase
          .from('spark_ledger')
          .select('child_id, delta');
        if (!error && data) {
          const balances: Record<string, number> = {};
          data.forEach(row => {
            balances[row.child_id] = (balances[row.child_id] || 0) + (row.delta || 0);
          });
          setChildBalances(balances);
        }
      } else {
        const mockBalances: Record<string, number> = {};
        children.forEach(c => {
          mockBalances[c.id] = 100;
        });
        setChildBalances(mockBalances);
      }
      setLoading(false);
    };

    loadData();

    return () => clearTimeout(timer);
  }, [family?.id, children]);

  function handleOpenApprovalModal(req: RewardRequest) {
    const existingReward = rewards.find(
      r => r.title.trim().toLowerCase() === req.title.trim().toLowerCase()
    );
    const initialCost = existingReward
      ? existingReward.cost
      : req.cost && req.cost > 0
      ? req.cost
      : 10;

    setSelectedRequest(req);
    setApprovalCost(initialCost);
    setAddToCatalog(!existingReward);
    setDeductSparks(false);
  }

  async function handleConfirmApproval() {
    if (!selectedRequest || !family?.id || submittingAction) return;

    if (approvalCost < 0) {
      alert('El coste en Sparks no puede ser negativo.');
      return;
    }

    const childBalance = childBalances[selectedRequest.child_id] ?? 0;
    if (deductSparks && childBalance < approvalCost) {
      alert(
        `El niño no tiene suficientes Sparks para cobrar este premio ahora. Tiene ${childBalance} de ${approvalCost} Sparks necesarias.`
      );
      return;
    }

    setSubmittingAction(true);
    try {
      // 1. If parent chooses to add/update in the catalog
      if (addToCatalog) {
        const existingReward = rewards.find(
          r => r.title.trim().toLowerCase() === selectedRequest.title.trim().toLowerCase()
        );

        if (existingReward) {
          const updateRes = await rewardsAdapter.updateReward(existingReward.id, {
            cost: approvalCost,
            emoji: selectedRequest.emoji,
          });
          if (updateRes.ok) {
            setRewards(prev =>
              prev.map(r => (r.id === existingReward.id ? updateRes.data : r))
            );
          }
        } else {
          const createRes = await rewardsAdapter.createReward(family.id, {
            title: selectedRequest.title,
            emoji: selectedRequest.emoji,
            cost: approvalCost,
            cooldown_hours: 0,
          });
          if (createRes.ok) {
            setRewards(prev => [...prev, createRes.data]);
          }
        }
      }

      // 2. If parent chooses to deduct sparks now
      if (deductSparks) {
        if (DATA_SOURCE === 'supabase') {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            selectedRequest.id
          );
          const { error } = await supabase.rpc('award_sparks', {
            p_child_id: selectedRequest.child_id,
            p_delta: -approvalCost,
            p_source_type: 'redemption',
            p_source_id: isUuid ? selectedRequest.id : null,
            p_note: `Aprobado: ${selectedRequest.title}`,
          });

          if (error) {
            alert('Error al cobrar las Sparks: ' + error.message);
            setSubmittingAction(false);
            return;
          }
        }

        setChildBalances(prev => ({
          ...prev,
          [selectedRequest.child_id]: childBalance - approvalCost,
        }));
      }

      // 3. Mark request as approved
      const res = await rewardsAdapter.updateRewardRequestStatus(selectedRequest.id, 'approved');
      if (res.ok) {
        setRequests(prev => prev.filter(r => r.id !== selectedRequest.id));
        setSelectedRequest(null);
      } else {
        alert('Error al actualizar la propuesta: ' + res.error.message);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      alert('Error inesperado: ' + message);
    } finally {
      setSubmittingAction(false);
    }
  }

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
    if (!confirm('¿Seguro que quieres eliminar esta recompensa del catálogo?')) return;
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
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-stone-800 font-semibold flex items-center gap-2">
            <Gift className="w-6 h-6 text-amber-500" />
            Catálogo de Premios
          </h1>
          <p className="text-xs text-stone-400 mt-1">
            Revisa las sugerencias de tus hijos y asigna el valor en Sparks ✦ para cada recompensa.
          </p>
        </div>
        <Link href="/dashboard/rewards/new">
          <Button variant="primary" size="sm" className="flex items-center gap-1">
            <Plus className="w-4 h-4" /> Nuevo Premio
          </Button>
        </Link>
      </div>

      {/* PENDING CHILD REQUESTS / PROPOSALS */}
      {!loading && requests.length > 0 && (
        <div className="flex flex-col gap-3 bg-amber-50/60 border border-amber-200/80 rounded-3xl p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold text-amber-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" /> Propuestas de los niños ({requests.length})
            </h3>
            <span className="text-[10px] bg-amber-200/80 text-amber-900 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              Pendientes de Aprobar
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {requests.map(req => {
              const childBalance = childBalances[req.child_id] ?? 0;
              const suggestedCostText = req.cost && req.cost > 0 ? `${req.cost} Sparks sugeridas` : 'Sin coste asignado';

              return (
                <Card
                  key={req.id}
                  variant="bordered"
                  className="p-4 flex items-center justify-between bg-white/90 backdrop-blur-sm border-amber-200 hover:shadow-soft transition-all duration-300"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl" role="img" aria-label={req.title}>
                      {req.emoji}
                    </span>
                    <div className="flex flex-col">
                      <span className="font-semibold text-stone-800 text-sm">{req.title}</span>
                      <span className="text-stone-500 text-xs mt-0.5">
                        Sugerido por <strong className="text-stone-700">{req.child?.display_name || 'Hijo'}</strong>
                      </span>
                      <span className="text-[10px] font-medium text-amber-700 mt-0.5">
                        {suggestedCostText} • Saldo del niño: {childBalance} ✦
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleOpenApprovalModal(req)}
                      className="bg-amber-500 hover:bg-amber-600 font-bold text-white shadow-soft text-xs"
                    >
                      Aprobar y Asignar
                    </Button>
                    <button
                      onClick={() => handleRejectRequest(req.id)}
                      className="p-1.5 text-stone-400 hover:text-red-500 transition-colors cursor-pointer rounded-lg hover:bg-stone-100"
                      aria-label="Rechazar petición"
                      title="Rechazar petición"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </Card>
              );
            })}
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
              Cargar sugerencias ✧
            </Button>
          </div>
        </Card>
      )}

      {!loading && rewards.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {rewards.map(reward => (
            <Card
              key={reward.id}
              variant="bordered"
              className="p-4 flex items-center justify-between hover:shadow-soft transition-all duration-300"
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl" role="img" aria-label={reward.title}>
                  {reward.emoji}
                </span>
                <div className="flex flex-col">
                  <span className="font-semibold text-stone-800 text-sm">{reward.title}</span>
                  <span className="text-amber-600 font-bold text-xs mt-0.5">
                    {reward.cost} Sparks ✦
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link href={`/dashboard/rewards/edit?id=${reward.id}`}>
                  <button
                    className="p-2 text-stone-400 hover:text-bloom-600 transition-colors cursor-pointer rounded-lg hover:bg-stone-100"
                    aria-label={`Editar ${reward.title}`}
                    title="Editar precio o detalles"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </Link>
                <button
                  onClick={() => handleDelete(reward.id)}
                  className="p-2 text-stone-400 hover:text-red-500 transition-colors cursor-pointer rounded-lg hover:bg-stone-100"
                  aria-label={`Eliminar ${reward.title}`}
                  title="Eliminar del catálogo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* PARENT APPROVAL MODAL FOR CHILD PROPOSALS */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-stone-200 space-y-5">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{selectedRequest.emoji}</span>
                <div>
                  <h3 className="font-display font-bold text-stone-800 text-lg">
                    Aprobar Sugerencia
                  </h3>
                  <p className="text-xs text-stone-500">
                    Propuesto por {selectedRequest.child?.display_name || 'Hijo'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="text-stone-400 hover:text-stone-600 p-1.5 rounded-full hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-stone-600 uppercase tracking-wider block mb-1.5">
                  Nombre del Premio
                </label>
                <input
                  type="text"
                  value={selectedRequest.title}
                  disabled
                  className="w-full px-4 py-2.5 rounded-2xl border border-stone-200 text-stone-700 bg-stone-100 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-amber-700 uppercase tracking-wider block mb-1.5">
                  ¿Cuántas Sparks ✦ debe costar este premio?
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    min={1}
                    value={approvalCost}
                    onChange={e => setApprovalCost(Math.max(1, Number(e.target.value)))}
                    className="w-28 px-4 py-2.5 rounded-2xl border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400 text-lg font-bold text-amber-700 text-center bg-amber-50/50"
                  />
                  <div className="flex-1 flex gap-1 flex-wrap">
                    {[5, 10, 15, 20, 30].map(preset => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setApprovalCost(preset)}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          approvalCost === preset
                            ? 'bg-amber-500 text-white shadow-sm'
                            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                        }`}
                      >
                        {preset} ✦
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-[11px] text-stone-400 mt-1">
                  Tú decides el coste exacto en Sparks. El niño canjeará el premio cuando alcance esta cantidad.
                </p>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-stone-100">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-stone-700">
                  <input
                    type="checkbox"
                    checked={addToCatalog}
                    onChange={e => setAddToCatalog(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 border-stone-300"
                  />
                  <span>Guardar en el catálogo permanente de la familia</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-stone-700">
                  <input
                    type="checkbox"
                    checked={deductSparks}
                    onChange={e => setDeductSparks(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 border-stone-300"
                  />
                  <span>Descontar {approvalCost} Sparks del saldo del niño inmediatamente</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setSelectedRequest(null)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleConfirmApproval}
                loading={submittingAction}
                className="flex-1 bg-amber-500 hover:bg-amber-600 font-bold text-white shadow-soft"
              >
                <Check className="w-4 h-4 mr-1" /> Aprobar Premio
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
