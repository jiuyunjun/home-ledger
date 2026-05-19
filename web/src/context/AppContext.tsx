'use client';

import { Account, Budget, FixedRule, Transaction } from '@/lib/data';
import accountsJson from '@/fixtures/accounts.json';
import budgetsJson from '@/fixtures/budgets.json';
import candidatesJson from '@/fixtures/candidates.json';
import fixedJson from '@/fixtures/fixed.json';
import transactionsJson from '@/fixtures/transactions.json';
import {
  createContext,
  Dispatch,
  ReactNode,
  useContext,
  useEffect,
  useReducer,
} from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

export type RoleId = string; // real actor UUID or legacy mock 'me'|'her'|'family'

export interface Candidate {
  id: string;
  receiptImage: string;
  status: 'draft' | 'confirmed' | 'rejected';
  confidence: number;
  userHint: string;
  fields: Record<string, { value: string; conf: number; warn?: boolean }>;
  items: Array<{
    id: string;
    name: string;
    price: number;
    cat: string;
    conf: number;
    include: boolean;
    warn?: boolean;
    isAdjust?: boolean;
  }>;
}

export interface AppState {
  currentRole: string; // real actor UUID once DataContext loads
  transactions: Transaction[];
  accounts: Account[];
  budgets: Budget[];
  fixedRules: FixedRule[];
  candidates: Candidate[];
}

// ── Actions ───────────────────────────────────────────────────────────────────

export type AppAction =
  | { type: 'SET_ROLE'; role: RoleId }
  | { type: 'ADD_TRANSACTION'; tx: Transaction }
  | { type: 'CONFIRM_CANDIDATE'; candidateId: string; tx: Transaction }
  | { type: 'REJECT_CANDIDATE'; candidateId: string }
  | { type: 'TOGGLE_FIXED_RULE'; ruleId: string };

// ── Reducer ───────────────────────────────────────────────────────────────────

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_ROLE':
      return { ...state, currentRole: action.role };

    case 'ADD_TRANSACTION':
      return {
        ...state,
        transactions: [action.tx, ...state.transactions],
      };

    case 'CONFIRM_CANDIDATE':
      return {
        ...state,
        candidates: state.candidates.map((c) =>
          c.id === action.candidateId ? { ...c, status: 'confirmed' as const } : c
        ),
        transactions: [action.tx, ...state.transactions],
      };

    case 'REJECT_CANDIDATE':
      return {
        ...state,
        candidates: state.candidates.map((c) =>
          c.id === action.candidateId ? { ...c, status: 'rejected' as const } : c
        ),
      };

    case 'TOGGLE_FIXED_RULE':
      return {
        ...state,
        fixedRules: state.fixedRules.map((r) =>
          r.id === action.ruleId ? { ...r, enabled: !r.enabled } : r
        ),
      };

    default:
      return state;
  }
}

// ── Initial state ─────────────────────────────────────────────────────────────

const INITIAL_STATE: AppState = {
  currentRole: 'me',
  transactions: transactionsJson as Transaction[],
  accounts: accountsJson as Account[],
  budgets: budgetsJson as Budget[],
  fixedRules: fixedJson as FixedRule[],
  candidates: candidatesJson as Candidate[],
};

// ── Context ───────────────────────────────────────────────────────────────────

const AppContext = createContext<{
  state: AppState;
  dispatch: Dispatch<AppAction>;
} | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE, (init) => {
    // Restore currentRole from localStorage on first render
    if (typeof window === 'undefined') return init;
    const saved = localStorage.getItem('currentRole') as RoleId | null;
    return saved ? { ...init, currentRole: saved } : init;
  });

  // Persist currentRole to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('currentRole', state.currentRole);
  }, [state.currentRole]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
