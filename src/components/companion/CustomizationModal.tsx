'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useCompanion } from '@/lib/companion/CompanionProvider';
import { supabase } from '@/lib/supabase';
import { ChildAvatar } from '../ui/ChildAvatar';
import { CompanionBlob } from './CompanionBlob';
import { CUSTOMIZATION_ITEMS, type CustomizationItem } from '@/lib/customization/CustomizationItems';

interface CustomizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  sparkBalance: number;
  onPurchaseSuccess: () => void; // Callback to fetch new spark balance in parent
}

const EMOJI_OPTIONS = ['🦊', '🐼', '🐨', '🦁', '🐯', '🐸', '🐰', '🐙', '🦄', '🦖', '🐒', '🦉'];

export function CustomizationModal({ isOpen, onClose, sparkBalance, onPurchaseSuccess }: CustomizationModalProps) {
  const { profile, updateProfile } = useAuth();
  const { companion, updateCompanionCustomization } = useCompanion();
  const [activeTab, setActiveTab] = useState<'avatar' | 'companion'>('avatar');
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [companionName, setCompanionName] = useState(companion?.name || '');
  const [renaming, setRenaming] = useState(false);

  useEffect(() => {
    if (companion?.name) {
      setCompanionName(companion.name);
    }
  }, [companion?.name]);

  async function handleRenameCompanion() {
    if (!companionName.trim() || !companion) return;
    setRenaming(true);
    const ok = await updateCompanionCustomization({ name: companionName.trim() });
    if (!ok) {
      alert('Error al renombrar a tu compañero');
    }
    setRenaming(false);
  }

  if (!profile || profile.role !== 'child') return null;

  const unlocked = profile.unlocked_accessories || [];
  const currentAvatarAcc = profile.avatar_accessory || null;
  const currentAvatarEmoji = profile.avatar_base_emoji || '🦊';

  const companionAcc = companion?.equipped_accessory || null;
  const companionTheme = companion?.equipped_color_theme || null;

  async function handleBuyItem(item: CustomizationItem) {
    if (!profile) return;
    if (sparkBalance < item.cost) {
      alert('¡No tienes suficientes estrellas! Completa más rutinas para ganar Sparks ✦');
      return;
    }

    setBuyingId(item.id);

    // 1. Deduct sparks
    const { error: sparkError } = await supabase.rpc('award_sparks', {
      p_child_id: profile.id,
      p_delta: -item.cost,
      p_source_type: 'customization_purchase',
      p_note: `Tienda: Comprado ${item.name}`
    });

    if (sparkError) {
      alert('Error en la compra: ' + sparkError.message);
      setBuyingId(null);
      return;
    }

    // 2. Add item to unlocked list in profile
    const updatedUnlocked = [...unlocked, item.id];
    const profileRes = await updateProfile({
      unlocked_accessories: updatedUnlocked
    });

    if (!profileRes.ok) {
      alert('Error al guardar el accesorio desbloqueado: ' + (profileRes.error?.message ?? 'error'));
      setBuyingId(null);
      return;
    }

    // Play a gentle confirm chime (Web Audio)
    playPurchaseChime();
    setBuyingId(null);
    onPurchaseSuccess();
  }

  function playPurchaseChime() {
    if (typeof window === 'undefined') return;
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    try {
      const ctx = new AudioContext();
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
        gain.gain.setValueAtTime(0, ctx.currentTime + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + idx * 0.08 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.08 + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.08);
        osc.stop(ctx.currentTime + idx * 0.08 + 0.35);
      });
    } catch (e) {
      console.warn(e);
    }
  }

  async function handleEquipAvatar(item: CustomizationItem) {
    const isEquipped = currentAvatarAcc === item.value;
    const { ok } = await updateProfile({
      avatar_accessory: isEquipped ? null : item.value
    });
    if (!ok) alert('Error al equipar el accesorio');
  }

  async function handleEquipCompanion(item: CustomizationItem) {
    if (item.type === 'accessory') {
      const isEquipped = companionAcc === item.value;
      const ok = await updateCompanionCustomization({
        equipped_accessory: isEquipped ? null : item.value
      });
      if (!ok) alert('Error al equipar el accesorio del compañero');
    } else {
      const isEquipped = companionTheme === item.value;
      const ok = await updateCompanionCustomization({
        equipped_color_theme: isEquipped ? null : item.value
      });
      if (!ok) alert('Error al aplicar el estilo del compañero');
    }
  }

  async function handleSelectEmoji(emoji: string) {
    await updateProfile({
      avatar_base_emoji: emoji
    });
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-stone-900/60 backdrop-blur-md"
          />

          {/* Modal Panel */}
          <motion.div
            initial={{ scale: 0.9, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 30, opacity: 0 }}
            className="relative w-full max-w-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-850 shadow-2xl rounded-3xl overflow-hidden flex flex-col max-h-[85vh] z-10"
          >
            {/* Header */}
            <div className="p-5 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between bg-stone-50/50 dark:bg-stone-850/50">
              <div>
                <h2 className="font-display text-xl text-stone-800 dark:text-stone-100">
                  🎨 Mi Armario de Estrellas
                </h2>
                <p className="text-xs text-stone-400 mt-0.5">
                  Personaliza tu perfil y el de tu compañero
                </p>
              </div>
              <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 px-3.5 py-1.5 rounded-2xl shadow-soft">
                <span className="text-sm font-extrabold text-amber-600 dark:text-amber-500">
                  {sparkBalance} Sparks ✦
                </span>
              </div>
            </div>

            {/* TAB SELECTOR */}
            <div className="flex border-b border-stone-100 dark:border-stone-800 text-sm font-bold">
              <button
                onClick={() => setActiveTab('avatar')}
                className={`flex-1 py-3 text-center transition-colors border-b-2 ${
                  activeTab === 'avatar'
                    ? 'border-bloom-500 text-bloom-600 dark:text-bloom-400'
                    : 'border-transparent text-stone-400 hover:text-stone-600'
                }`}
              >
                🦊 Mi Avatar
              </button>
              <button
                onClick={() => setActiveTab('companion')}
                className={`flex-1 py-3 text-center transition-colors border-b-2 ${
                  activeTab === 'companion'
                    ? 'border-bloom-500 text-bloom-600 dark:text-bloom-400'
                    : 'border-transparent text-stone-400 hover:text-stone-600'
                }`}
              >
                🌟 Mi Compañero
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* TAB 1: AVATAR */}
              {activeTab === 'avatar' && (
                <>
                  {/* PREVIEW */}
                  <div className="flex flex-col items-center justify-center p-4 bg-stone-50 dark:bg-stone-850 rounded-2xl border border-stone-150 dark:border-stone-800">
                    <ChildAvatar
                      baseEmoji={currentAvatarEmoji}
                      accessory={currentAvatarAcc}
                      size="lg"
                    />
                    <span className="text-xs text-stone-400 font-semibold mt-3">
                      Vista previa de tu avatar
                    </span>
                  </div>

                  {/* BASE EMOJI SELECTION */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest">
                      Elige tu personaje base (Gratis)
                    </h3>
                    <div className="grid grid-cols-6 gap-2">
                      {EMOJI_OPTIONS.map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => handleSelectEmoji(emoji)}
                          className={`
                            text-2xl p-2.5 rounded-xl border transition-all active:scale-[0.92] cursor-pointer
                            ${
                              currentAvatarEmoji === emoji
                                ? 'bg-bloom-50 border-bloom-400 shadow-soft scale-110'
                                : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 hover:bg-stone-50'
                            }
                          `}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ACCESSORY STORE/WARDROBE */}
                  <div className="space-y-2.5">
                    <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest">
                      Accesorios de cabeza y cara
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {CUSTOMIZATION_ITEMS.filter(i => i.type === 'accessory').map(item => {
                        const isUnlocked = unlocked.includes(item.id);
                        const isEquipped = currentAvatarAcc === item.value;
                        const isBuying = buyingId === item.id;

                        return (
                          <div
                            key={item.id}
                            className={`
                              flex items-center justify-between p-3 rounded-2xl border transition-all
                              ${
                                isEquipped
                                  ? 'bg-bloom-50/20 border-bloom-300 dark:border-bloom-800/80 shadow-sm'
                                  : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700'
                              }
                            `}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-2xl p-2 bg-stone-50 dark:bg-stone-850 rounded-xl">
                                {item.emoji}
                              </span>
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-stone-700 dark:text-stone-250">
                                  {item.name}
                                </span>
                                <span className="text-[10px] text-stone-400 leading-tight pr-1">
                                  {item.description}
                                </span>
                              </div>
                            </div>

                            <button
                              disabled={isBuying}
                              onClick={() => {
                                if (isUnlocked) {
                                  handleEquipAvatar(item);
                                } else {
                                  handleBuyItem(item);
                                }
                              }}
                              className={`
                                text-[10px] font-extrabold px-3 py-2 rounded-xl transition-all active:scale-[0.96] cursor-pointer
                                ${
                                  isEquipped
                                    ? 'bg-amber-500 text-white shadow-soft'
                                    : isUnlocked
                                    ? 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
                                    : 'bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200'
                                }
                              `}
                            >
                              {isEquipped
                                ? 'Puesto'
                                : isUnlocked
                                ? 'Equipar'
                                : `Comprar (${item.cost} ✦)`}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* TAB 2: COMPANION */}
              {activeTab === 'companion' && (
                <>
                  {/* PREVIEW */}
                  <div className="flex flex-col items-center justify-center p-4 bg-stone-50 dark:bg-stone-850 rounded-2xl border border-stone-150 dark:border-stone-800 min-h-[170px]">
                    {companion ? (
                      <CompanionBlob
                        stage={companion.stage}
                        size="lg"
                        customTheme={companionTheme}
                        customAccessory={companionAcc}
                      />
                    ) : (
                      <div className="w-16 h-16 border-2 border-stone-200 border-t-bloom-400 rounded-full animate-spin" />
                    )}
                    <div className="flex flex-col items-center gap-1.5 w-full mt-3">
                      <div className="flex items-center gap-2 w-full max-w-xs justify-center">
                        <input
                          type="text"
                          value={companionName}
                          onChange={(e) => setCompanionName(e.target.value)}
                          className="text-center text-base font-bold text-stone-850 dark:text-stone-100 bg-transparent border-b border-transparent focus:border-stone-300 dark:focus:border-stone-750 focus:outline-none px-2 py-0.5 w-full max-w-[180px] hover:bg-stone-100/50 dark:hover:bg-stone-800 rounded transition-all"
                          placeholder="Nombre de tu compañero..."
                          maxLength={20}
                        />
                        {companionName !== (companion?.name || '') && (
                          <button
                            onClick={handleRenameCompanion}
                            disabled={renaming || !companionName.trim()}
                            className="text-[10px] font-extrabold px-3 py-1.5 bg-bloom-50 hover:bg-bloom-100 text-bloom-600 rounded-xl cursor-pointer transition-colors shadow-soft"
                          >
                            {renaming ? 'Guardando...' : 'Guardar'}
                          </button>
                        )}
                      </div>
                      <span className="text-[10px] text-stone-400 font-semibold">
                        Haz clic en el nombre arriba para cambiarlo ✏_
                      </span>
                    </div>
                  </div>

                  {/* COMPANION ACCESSORIES */}
                  <div className="space-y-2.5">
                    <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest">
                      Accesorios para equipar
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {CUSTOMIZATION_ITEMS.filter(i => i.type === 'accessory').map(item => {
                        const isUnlocked = unlocked.includes(item.id);
                        const isEquipped = companionAcc === item.value;
                        const isBuying = buyingId === item.id;

                        return (
                          <div
                            key={item.id}
                            className={`
                              flex items-center justify-between p-3 rounded-2xl border transition-all
                              ${
                                isEquipped
                                  ? 'bg-bloom-50/20 border-bloom-300 dark:border-bloom-800/80 shadow-sm'
                                  : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700'
                              }
                            `}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-2xl p-2 bg-stone-50 dark:bg-stone-850 rounded-xl">
                                {item.emoji}
                              </span>
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-stone-700 dark:text-stone-250">
                                  {item.name}
                                </span>
                                <span className="text-[10px] text-stone-400 leading-tight pr-1">
                                  {item.description}
                                </span>
                              </div>
                            </div>

                            <button
                              disabled={isBuying}
                              onClick={() => {
                                if (isUnlocked) {
                                  handleEquipCompanion(item);
                                } else {
                                  handleBuyItem(item);
                                }
                              }}
                              className={`
                                text-[10px] font-extrabold px-3 py-2 rounded-xl transition-all active:scale-[0.96] cursor-pointer
                                ${
                                  isEquipped
                                    ? 'bg-amber-500 text-white shadow-soft'
                                    : isUnlocked
                                    ? 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
                                    : 'bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200'
                                }
                              `}
                            >
                              {isEquipped
                                ? 'Puesto'
                                : isUnlocked
                                ? 'Equipar'
                                : `Comprar (${item.cost} ✦)`}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* COMPANION SKINS/THEMES */}
                  <div className="space-y-2.5">
                    <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest">
                      Pieles y colores de energía
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {CUSTOMIZATION_ITEMS.filter(i => i.type === 'theme').map(item => {
                        const isUnlocked = unlocked.includes(item.id);
                        const isEquipped = companionTheme === item.value;
                        const isBuying = buyingId === item.id;

                        return (
                          <div
                            key={item.id}
                            className={`
                              flex items-center justify-between p-3 rounded-2xl border transition-all
                              ${
                                isEquipped
                                  ? 'bg-bloom-50/20 border-bloom-300 dark:border-bloom-800/80 shadow-sm'
                                  : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700'
                              }
                            `}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-2xl p-2 bg-stone-50 dark:bg-stone-850 rounded-xl">
                                {item.emoji}
                              </span>
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-stone-700 dark:text-stone-250">
                                  {item.name}
                                </span>
                                <span className="text-[10px] text-stone-400 leading-tight pr-1">
                                  {item.description}
                                </span>
                              </div>
                            </div>

                            <button
                              disabled={isBuying}
                              onClick={() => {
                                if (isUnlocked) {
                                  handleEquipCompanion(item);
                                } else {
                                  handleBuyItem(item);
                                }
                              }}
                              className={`
                                text-[10px] font-extrabold px-3 py-2 rounded-xl transition-all active:scale-[0.96] cursor-pointer
                                ${
                                  isEquipped
                                    ? 'bg-amber-500 text-white shadow-soft'
                                    : isUnlocked
                                    ? 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
                                    : 'bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200'
                                }
                              `}
                            >
                              {isEquipped
                                ? 'Puesto'
                                : isUnlocked
                                ? 'Usar'
                                : `Comprar (${item.cost} ✦)`}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-850/50 flex justify-end">
              <button
                onClick={onClose}
                className="px-5 py-2.5 bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 text-stone-700 dark:text-stone-200 font-bold text-sm rounded-xl cursor-pointer transition-colors"
              >
                Cerrar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
