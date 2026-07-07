'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, X, Sparkles } from 'lucide-react';
import { Button } from './ui/Button';

export function PwaUpdater() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Solo ejecutar en el cliente y si el navegador soporta Service Workers
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    let refreshing = false;

    // Detectar cuando el nuevo SW toma el control y recargar la página
    const onControllerChange = () => {
      if (!refreshing) {
        refreshing = true;
        console.log('[PWA] Controlador cambiado, recargando página...');
        window.location.reload();
      }
    };

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    const registerSW = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/human/sw.js');
        console.log('[PWA] Service Worker registrado con éxito:', reg.scope);

        // Caso 1: Hay un SW esperando desde antes
        if (reg.waiting) {
          setWaitingWorker(reg.waiting);
          setShowPrompt(true);
        }

        // Caso 2: Se detecta una actualización en curso
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
              // Si ya había un controlador activo, significa que es una actualización real (no primera carga)
              if (navigator.serviceWorker.controller) {
                setWaitingWorker(newWorker);
                setShowPrompt(true);
              }
            }
          });
        });
      } catch (error) {
        console.error('[PWA] Error registrando el Service Worker:', error);
      }
    };

    // Registrar cuando el documento esté completamente cargado
    if (document.readyState === 'complete') {
      registerSW();
    } else {
      window.addEventListener('load', registerSW);
      return () => {
        window.removeEventListener('load', registerSW);
        navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      };
    }

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  const handleUpdate = () => {
    if (waitingWorker) {
      // Enviar mensaje al SW en espera para que llame a skipWaiting()
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }
    setShowPrompt(false);
  };

  const handleClose = () => {
    setShowPrompt(false);
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="fixed bottom-6 right-6 left-6 md:left-auto md:w-[400px] z-50"
        >
          <div className="bg-white/95 backdrop-blur-md border border-stone-200 shadow-card rounded-2xl p-5 flex flex-col gap-4 relative overflow-hidden">
            {/* Elemento decorativo superior estilo Mira */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-bloom-300 via-bloom-400 to-lavender-400" />
            
            <div className="flex gap-3 items-start mt-1">
              <div className="p-2 bg-bloom-50 rounded-xl text-bloom-500 shrink-0 animate-pulse-gentle">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-display text-base font-semibold text-stone-900 leading-tight">
                  ¡Actualización disponible!
                </h3>
                <p className="font-body text-sm text-stone-600 mt-1 leading-relaxed">
                  Mira tiene nuevas mejoras preparadas para tu familia. Actualiza para aplicarlas al instante.
                </p>
              </div>
              <button 
                onClick={handleClose}
                className="p-1 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-50 transition-colors shrink-0"
                aria-label="Cerrar notificación"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex gap-2 justify-end items-center mt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="text-stone-500 hover:text-stone-700 font-body text-xs"
              >
                Más tarde
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleUpdate}
                className="flex items-center gap-1.5 text-xs px-4 py-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Actualizar ahora
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
