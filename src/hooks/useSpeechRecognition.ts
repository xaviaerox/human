'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// Web Speech API interface declarations for TypeScript compatibility
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export interface UseSpeechRecognitionReturn {
  isListening: boolean;
  transcript: string;
  isSupported: boolean;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

/**
 * Custom hook for real-time Web Speech API voice recognition (Speech-to-Text).
 * Tailored for neurodiverse children (ADHD, dyslexia, ASD) who prefer speaking over typing.
 *
 * Defaults to Spanish ('es-ES').
 */
export function useSpeechRecognition(lang = 'es-ES'): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  });

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !isSupported) return;

    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) return;

    const instance = new SpeechRecognitionClass();
    instance.continuous = true;
    instance.interimResults = true;
    instance.lang = lang;

    instance.onresult = (event: SpeechRecognitionEvent) => {
      let currentTranscript = '';
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result && result[0]) {
          currentTranscript += result[0].transcript;
        }
      }
      setTranscript(currentTranscript);
    };

    instance.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.warn('[useSpeechRecognition] Error:', event.error);
      if (event.error !== 'no-speech') {
        setError(`Error de micrófono (${event.error})`);
      }
      setIsListening(false);
    };

    instance.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = instance;

    return () => {
      try {
        instance.abort();
      } catch {
        // Ignore cleanup abort errors
      }
    };
  }, [lang, isSupported]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || isListening) return;

    setError(null);
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (err) {
      console.error('[useSpeechRecognition] start error:', err);
      setIsListening(false);
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current || !isListening) return;

    try {
      recognitionRef.current.stop();
    } catch (err) {
      console.error('[useSpeechRecognition] stop error:', err);
    } finally {
      setIsListening(false);
    }
  }, [isListening]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  return {
    isListening,
    transcript,
    isSupported,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
}
