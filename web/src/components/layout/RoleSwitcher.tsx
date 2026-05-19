'use client';

import { useApp } from '@/context/AppContext';
import { useData } from '@/context/DataContext';
import { T } from '@/lib/tokens';
import { useEffect } from 'react';

const ACTOR_COLORS = [T.roleMe, T.roleHer, T.roleFamily];

export function RoleSwitcher() {
  const { state, dispatch } = useApp();
  const data = useData();

  // Sync default role to logged-in user's actorId once data loads.
  useEffect(() => {
    if (data.me?.actorId && !state.currentRole) {
      dispatch({ type: 'SET_ROLE', role: data.me.actorId });
    }
  }, [data.me?.actorId, state.currentRole, dispatch]);

  const actors = data.actors;
  if (actors.length === 0) return null;

  const active = state.currentRole || data.me?.actorId || '';

  return (
    <div style={{ display: 'flex', gap: 4, padding: 3, background: T.bgSubtle, borderRadius: 10, border: `1px solid ${T.borderSoft}` }}>
      {actors.map((a, i) => {
        const on = a.id === active;
        const color = ACTOR_COLORS[i % ACTOR_COLORS.length];
        return (
          <div
            key={a.id}
            onClick={() => dispatch({ type: 'SET_ROLE', role: a.id })}
            style={{ flex: 1, textAlign: 'center', padding: '6px 0', borderRadius: 8, fontSize: 12, fontWeight: 500, background: on ? '#fff' : 'transparent', color: on ? color : T.textSoft, boxShadow: on ? '0 1px 2px rgba(0,0,0,0.04)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, cursor: 'pointer' }}
          >
            <span style={{ width: 6, height: 6, borderRadius: 3, background: color, opacity: on ? 1 : 0.5 }} />
            {a.displayName}
          </div>
        );
      })}
    </div>
  );
}
