'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, AlertCircle, X } from 'lucide-react';

interface ParentPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  description?: string;
}

export function ParentPinModal({
  isOpen,
  onClose,
  onSuccess,
  title = 'Verificación Parental',
  description = 'Ingresa tu PIN parental de 4 dígitos para autorizar esta acción.',
}: ParentPinModalProps) {
  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleDigitChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newPin = [...pin];
    newPin[index] = value.slice(-1);
    setPin(newPin);
    setError('');

    // Auto-focus next input
    if (value && index < 3) {
      const nextInput = document.getElementById(`parent-pin-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      const prevInput = document.getElementById(`parent-pin-input-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fullPin = pin.join('');
    // Default PIN for demo / verification is 1234 or any 4 digits
    if (fullPin.length === 4) {
      onSuccess();
      setPin(['', '', '', '']);
      setError('');
      onClose();
    } else {
      setError('Por favor ingresa un PIN completo de 4 dígitos.');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-100 shadow-2xl"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">{title}</h3>
              <p className="text-xs text-slate-400">{description}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex justify-center gap-3 my-4">
              {pin.map((digit, idx) => (
                <input
                  key={idx}
                  id={`parent-pin-input-${idx}`}
                  type="password"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  className="h-14 w-12 rounded-xl border border-slate-700 bg-slate-800 text-center text-2xl font-bold text-amber-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              ))}
            </div>

            {error && (
              <div className="flex items-center justify-center gap-2 text-xs text-rose-400">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-750 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20"
              >
                Confirmar PIN
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
