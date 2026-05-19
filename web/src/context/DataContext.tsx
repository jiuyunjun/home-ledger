'use client';

import { useAuth } from '@/context/AuthContext';
import { apiGet, apiPost } from '@/lib/api';
import type {
  Account,
  Actor,
  Category,
  MeResponse,
  PaymentMethod,
} from '@/lib/types';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

interface DataState {
  loading: boolean;
  me: MeResponse | null;
  actors: Actor[];
  categories: Category[];
  accounts: Account[];
  paymentMethods: PaymentMethod[];
}

interface DataContextValue extends DataState {
  actor(id: string): Actor | undefined;
  category(id: string): Category | undefined;
  account(id: string): Account | undefined;
  paymentMethod(id: string): PaymentMethod | undefined;
  expenseCategories(): Category[];
  incomeCategories(): Category[];
  refresh(): Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const [state, setState] = useState<DataState>({
    loading: true,
    me: null,
    actors: [],
    categories: [],
    accounts: [],
    paymentMethods: [],
  });

  const load = useCallback(async () => {
    if (!user) {
      setState({ loading: false, me: null, actors: [], categories: [], accounts: [], paymentMethods: [] });
      return;
    }

    setState((s) => ({ ...s, loading: true }));
    try {
      let me = await apiGet<MeResponse>('/api/me');

      if (me.needsSetup) {
        await apiPost('/api/households/bootstrap', { householdName: '我的家庭' });
        me = await apiGet<MeResponse>('/api/me');
      }

      if (!me.householdId) {
        setState({ loading: false, me, actors: [], categories: [], accounts: [], paymentMethods: [] });
        return;
      }

      const [actors, categories, accounts, paymentMethods] = await Promise.all([
        apiGet<Actor[]>('/api/actors'),
        apiGet<Category[]>('/api/categories'),
        apiGet<Account[]>('/api/accounts'),
        apiGet<PaymentMethod[]>('/api/payment-methods'),
      ]);

      setState({ loading: false, me, actors, categories, accounts, paymentMethods });
    } catch (err) {
      console.error('DataContext load error:', err);
      setState((s) => ({ ...s, loading: false }));
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const ctx: DataContextValue = {
    ...state,
    actor: (id) => state.actors.find((a) => a.id === id),
    category: (id) => state.categories.find((c) => c.id === id),
    account: (id) => state.accounts.find((a) => a.id === id),
    paymentMethod: (id) => state.paymentMethods.find((p) => p.id === id),
    expenseCategories: () => state.categories.filter((c) => c.type === 'expense'),
    incomeCategories: () => state.categories.filter((c) => c.type === 'income'),
    refresh: load,
  };

  return <DataContext.Provider value={ctx}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}
