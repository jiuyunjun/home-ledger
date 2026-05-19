'use client';

import { useApp } from '@/context/AppContext';
import { ROLES } from '@/lib/data';
import { T } from '@/lib/tokens';

export function RoleSwitcher() {
  const { state, dispatch } = useApp();
  const active = state.currentRole;

  return (
    <div
      style={{
        display: 'flex',
        gap: 4,
        padding: 3,
        background: T.bgSubtle,
        borderRadius: 10,
        border: `1px solid ${T.borderSoft}`,
      }}
    >
      {ROLES.map((r) => {
        const on = r.id === active;
        return (
          <div
            key={r.id}
            onClick={() => dispatch({ type: 'SET_ROLE', role: r.id as 'me' | 'her' | 'family' })}
            style={{
              flex: 1,
              textAlign: 'center',
              padding: '6px 0',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 500,
              background: on ? '#fff' : 'transparent',
              color: on ? r.color : T.textSoft,
              boxShadow: on ? '0 1px 2px rgba(0,0,0,0.04)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              cursor: 'pointer',
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                background: r.color,
                opacity: on ? 1 : 0.5,
              }}
            />
            {r.name}
          </div>
        );
      })}
    </div>
  );
}
