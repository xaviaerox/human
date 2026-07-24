import { describe, it, expect } from 'vitest';
import { LocalLLMEngine } from '@/lib/companion/LocalLLMEngine';

describe('LocalLLMEngine', () => {
  it('debe generar respuesta afirmativa cuando el niño esta triste', () => {
    const res = LocalLLMEngine.generateResponse({
      message: 'Me siento triste hoy',
      childName: 'Alex',
      companionName: 'Lumi',
    });
    expect(res).toContain('Alex');
    expect(res).toContain('Lumi');
    expect(res).toContain('prisa');
  });

  it('debe celebrar cuando el niño esta feliz', () => {
    const res = LocalLLMEngine.generateResponse({
      message: '¡Estoy muy feliz!',
      childName: 'Alex',
      companionName: 'Lumi',
    });
    expect(res).toContain('alegría');
  });

  it('debe animar cuando habla de rutinas y metas', () => {
    const res = LocalLLMEngine.generateResponse({
      message: 'Completé mi rutina',
      childName: 'Alex',
      companionName: 'Lumi',
    });
    expect(res).toContain('autonomía');
  });
});
