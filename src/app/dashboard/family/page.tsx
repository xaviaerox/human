'use client';

import { useEffect, useState, useCallback } from 'react';
import { useFamily } from '@/lib/family/FamilyProvider';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import type { FamilyInvite } from '@/types';

export default function FamilySettingsPage() {
  const { family, createInvite, getActiveInvites, loading: familyLoading } = useFamily();
  const [invites, setInvites] = useState<FamilyInvite[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(true);
  const [generatingRole, setGeneratingRole] = useState<'parent' | 'child' | null>(null);

  const fetchInvites = useCallback(async () => {
    if (!family?.id) return;
    try {
      const result = await getActiveInvites();
      setInvites(result);
    } catch (err) {
      console.error(err);
    } finally {
      setInvitesLoading(false);
    }
  }, [family?.id, getActiveInvites]);

  useEffect(() => {
    if (family?.id) {
      Promise.resolve().then(() => fetchInvites());
    }
  }, [family?.id, fetchInvites]);

  async function handleInvite(role: 'parent' | 'child') {
    if (!family?.id || generatingRole) return;
    setGeneratingRole(role);
    try {
      const invite = await createInvite(role);
      if (invite) {
        await fetchInvites();
      } else {
        alert('Error al generar la invitación.');
      }
    } catch (err) {
      console.error(err);
      alert('Ocurrió un error al generar la invitación.');
    } finally {
      setGeneratingRole(null);
    }
  }

  function handleCopy(code: string) {
    navigator.clipboard.writeText(code);
    alert('Código copiado al portapapeles: ' + code);
  }

  const loading = familyLoading || (family?.id && invitesLoading);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-stone-200 border-t-bloom-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!family) {
    return (
      <Card variant="warm" className="text-center py-10">
        <p className="text-stone-500 text-sm">No se pudo cargar la información de la familia.</p>
      </Card>
    );
  }

  const childrenMembers = family.members.filter(m => m.role === 'child');
  const parentMembers   = family.members.filter(m => m.role === 'parent');

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl text-stone-800 font-semibold">{family.name}</h1>
        <p className="text-xs text-stone-400 mt-1">Gestiona los miembros de tu familia e invita a nuevos tutores o niños</p>
      </div>

      {/* Members Section */}
      <div className="grid gap-6 sm:grid-cols-2">
        {/* Children card */}
        <Card>
          <CardHeader>
            <CardTitle>Niños</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {childrenMembers.map(child => (
              <div key={child.id} className="flex items-center justify-between p-3 bg-stone-50 rounded-2xl border border-stone-200">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-moss-100 text-moss-700 flex items-center justify-center font-bold text-sm select-none">
                    {child.display_name[0]?.toUpperCase()}
                  </div>
                  <span className="font-medium text-stone-700 text-sm">{child.display_name}</span>
                </div>
                <Link href={`/dashboard/child?id=${child.id}`}>
                  <Button variant="ghost" size="sm">Ver progreso →</Button>
                </Link>
              </div>
            ))}
            {childrenMembers.length === 0 && (
              <p className="text-xs text-stone-400 py-2 italic text-center">No hay niños registrados en la familia.</p>
            )}
          </CardContent>
        </Card>

        {/* Parents card */}
        <Card>
          <CardHeader>
            <CardTitle>Adultos / Tutores</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {parentMembers.map(parent => (
              <div key={parent.id} className="flex items-center gap-3 p-3 bg-stone-50 rounded-2xl border border-stone-200">
                <div className="w-9 h-9 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-sm select-none">
                  {parent.display_name[0]?.toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className="font-medium text-stone-700 text-sm">{parent.display_name}</span>
                  <span className="text-[10px] text-stone-400 mt-0.5">Tutor de la familia</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Invitations Generators */}
      <Card>
        <CardHeader>
          <CardTitle>Invitar a la Familia</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 flex flex-col gap-2 p-4 bg-stone-50 border border-stone-200 rounded-3xl">
            <h3 className="font-semibold text-stone-700 text-sm">Invitar a un Adulto</h3>
            <p className="text-xs text-stone-400 leading-relaxed">
              Genera un código para añadir a otro padre o tutor. Podrá gestionar las rutinas, premios y ver el progreso de los niños.
            </p>
            <Button
              variant="secondary"
              size="md"
              className="mt-2 w-full"
              onClick={() => handleInvite('parent')}
              loading={generatingRole === 'parent'}
            >
              + Generar código para Adulto
            </Button>
          </div>

          <div className="flex-1 flex flex-col gap-2 p-4 bg-stone-50 border border-stone-200 rounded-3xl">
            <h3 className="font-semibold text-stone-700 text-sm">Invitar a un Niño</h3>
            <p className="text-xs text-stone-400 leading-relaxed">
              Genera un código para añadir a otro hijo a la familia. Se le asignará su propio companion y podrá completar rutinas u objetivos.
            </p>
            <Button
              variant="primary"
              size="md"
              className="mt-2 w-full"
              onClick={() => handleInvite('child')}
              loading={generatingRole === 'child'}
            >
              + Generar código para Niño
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Active Invites List */}
      <Card>
        <CardHeader>
          <CardTitle>Invitaciones Activas (Códigos Pendientes)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2.5 max-h-[300px] overflow-y-auto pr-1">
            {invites.map(invite => {
              const dateLabel = new Date(invite.expires_at).toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
              });
              return (
                <div key={invite.id} className="flex items-center justify-between p-3.5 bg-stone-50 rounded-2xl border border-stone-200 text-xs">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-bloom-600 text-sm tracking-wider">{invite.invite_code}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${invite.role === 'parent' ? 'bg-sky-100 text-sky-700' : 'bg-moss-100 text-moss-700'}`}>
                        {invite.role === 'parent' ? 'Para Adulto' : 'Para Niño'}
                      </span>
                    </div>
                    <span className="text-[10px] text-stone-400 mt-1">Expira: {dateLabel}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(invite.invite_code)}
                  >
                    Copiar
                  </Button>
                </div>
              );
            })}
            {invites.length === 0 && (
              <p className="text-xs text-stone-400 text-center py-4 italic">No hay invitaciones pendientes activas.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
