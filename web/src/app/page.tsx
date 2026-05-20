'use client';

import { AppBar } from '@/components/layout/AppBar';
import { BottomNav } from '@/components/layout/BottomNav';
import { PhoneScreen } from '@/components/layout/PhoneScreen';
import { RoleSwitcher } from '@/components/layout/RoleSwitcher';
import { Amount } from '@/components/ui/Amount';
import { Card } from '@/components/ui/Card';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { TypeBadge } from '@/components/ui/TypeBadge';
import { useApp } from '@/context/AppContext';
import { useData } from '@/context/DataContext';
import { apiGet } from '@/lib/api';
import { catDisplay } from '@/lib/catDisplay';
import type { ApiTransaction, BudgetUsageItem } from '@/lib/types';
import { CN_FONT, NUM_FONT, T } from '@/lib/tokens';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

const ACTION_BTNS = [
  { label: '支出', glyph: '−', color: T.ink,      filled: true,  href: '/entry?mode=expense'  },
  { label: '入账', glyph: '+', color: T.income,   filled: false, href: '/entry?mode=income'   },
  { label: '转账', glyph: '⇄', color: T.transfer, filled: false, href: '/entry?mode=transfer' },
  { label: '小票', glyph: '↑', color: T.accent,   filled: false, href: '/upload'              },
];

const ACTOR_COLORS = [T.roleMe, T.roleHer, T.roleFamily];

function todayMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function addMonths(ym: string, delta: number) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function fmtMonth(ym: string) {
  const [y, m] = ym.split('-');
  return `${y} 年 ${parseInt(m)} 月`;
}

// ─── Inline transaction row (uses real ApiTransaction) ───────────────────────

function TxRowReal({ tx, showDate }: { tx: ApiTransaction; showDate?: boolean }) {
  const data = useData();
  const cat = data.category(tx.categoryId ?? '');
  const actor = data.actor(tx.actorId);
  const pm = data.paymentMethod(tx.paymentMethodId ?? '');
  const { mark, tint } = catDisplay(cat?.name ?? '');
  const isIncome = tx.transactionType === 'income';
  const isTransfer = tx.transactionType === 'transfer';

  if (isTransfer) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 4px' }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: T.transferSoft, color: T.transfer, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 600, flexShrink: 0 }}>⇄</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {tx.title || '转账'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2, fontSize: 11, color: T.textMute }}>
            <TypeBadge type="transfer" />
            {showDate && <span>{tx.transactionDate.slice(5)}</span>}
          </div>
        </div>
        <Amount value={tx.amount} size={13} weight={500} color={T.textSoft} currency={tx.currency} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 4px' }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: tint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontFamily: CN_FONT, fontWeight: 600, flexShrink: 0 }}>{mark}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {tx.title || tx.merchantName || cat?.name || '—'}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2, fontSize: 11, color: T.textMute }}>
          {isIncome && <TypeBadge type="income" />}
          {actor && <span>{actor.displayName}</span>}
          {pm && <><span style={{ color: T.textDim }}>·</span><span style={{ fontFamily: NUM_FONT }}>{pm.name}</span></>}
          {showDate && <><span style={{ color: T.textDim }}>·</span><span>{tx.transactionDate.slice(5)}</span></>}
        </div>
      </div>
      <Amount value={tx.amount} size={14} weight={600} currency={tx.currency} color={isIncome ? T.income : T.ink} sign={isIncome ? '+' : ''} />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { state } = useApp();
  const data = useData();

  const [month, setMonth] = useState(todayMonth);
  const [txs, setTxs] = useState<ApiTransaction[]>([]);
  const [usageItems, setUsageItems] = useState<BudgetUsageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [accountBalances, setAccountBalances] = useState<Record<string, number>>({});

  const load = useCallback(async (m: string) => {
    setLoading(true);
    try {
      const [list, usageResp, balances] = await Promise.all([
        apiGet<ApiTransaction[]>(`/api/transactions?month=${m}`),
        apiGet<{ month: string; items: BudgetUsageItem[] }>(`/api/budgets/usage?month=${m}`),
        apiGet<Record<string, number>>('/api/accounts/balances'),
      ]);
      setTxs(list);
      setUsageItems(usageResp.items);
      setAccountBalances(balances);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(month); }, [month, load]);

  // Selected actor filter (from RoleSwitcher via AppContext)
  const selectedActorId = state.currentRole || data.me?.actorId || '';

  const filteredTxs = selectedActorId
    ? txs.filter((t) => t.actorId === selectedActorId)
    : txs;

  // Aggregates
  const expense = filteredTxs
    .filter((t) => t.transactionType === 'expense' && t.currency === 'JPY')
    .reduce((s, t) => s + t.amount, 0);
  const income = filteredTxs
    .filter((t) => t.transactionType === 'income' && t.currency === 'JPY')
    .reduce((s, t) => s + t.amount, 0);

  // Per-actor expense totals (for mini cards)
  const actorExpense = (actorId: string) =>
    txs.filter((t) => t.actorId === actorId && t.transactionType === 'expense' && t.currency === 'JPY')
      .reduce((s, t) => s + t.amount, 0);

  // Category breakdown (top 4)
  const catMap = new Map<string, number>();
  filteredTxs.filter((t) => t.transactionType === 'expense' && t.currency === 'JPY').forEach((t) => {
    catMap.set(t.categoryId ?? '', (catMap.get(t.categoryId ?? '') ?? 0) + t.amount);
  });
  const topCats = Array.from(catMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const catTotal = topCats.reduce((s, [, v]) => s + v, 0);

  // Budget progress bar total limit
  const budgetTotal = usageItems.reduce((s, u) => s + u.limitAmount, 0);
  const overOrNear = usageItems.filter((u) => u.status !== 'ok');

  // Recent transactions
  const recent = filteredTxs.slice(0, 6);

  // Active accounts (non-card first)
  const activeAccounts = data.accounts.filter((a) => a.isActive).slice(0, 5);

  return (
    <PhoneScreen>
      <AppBar
        title="家计簿"
        subtitle={fmtMonth(month)}
        left={
          <div onClick={() => setMonth((m) => addMonths(m, -1))}
            style={{ fontSize: 20, color: T.textSoft, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>‹</div>
        }
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {month !== todayMonth() && (
              <div onClick={() => setMonth(todayMonth())}
                style={{ fontSize: 11, color: T.accent, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: T.accentSoft, cursor: 'pointer' }}>本月</div>
            )}
            <div onClick={() => setMonth((m) => addMonths(m, 1))}
              style={{ fontSize: 20, color: T.textSoft, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>›</div>
          </div>
        }
      />

      <div style={{ padding: '0 14px 6px' }}>
        <RoleSwitcher />
      </div>

      <style>{`
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        .skel { background: linear-gradient(90deg,#f0ece6 25%,#e8e2da 50%,#f0ece6 75%); background-size:200% 100%; animation:shimmer 1.4s infinite; border-radius:6px; }
      `}</style>

      <div style={{ flex: 1, overflow: 'auto', padding: '12px 14px 80px' }}>
        {loading ? (
          <div>
            {/* Hero card skeleton */}
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 14, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div className="skel" style={{ height: 10, width: '50%' }} />
                  <div className="skel" style={{ height: 28, width: '70%' }} />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                  <div className="skel" style={{ height: 10, width: '50%' }} />
                  <div className="skel" style={{ height: 20, width: '60%' }} />
                </div>
              </div>
            </div>
            {/* Actor mini cards skeleton */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
              {[0, 1].map((i) => (
                <div key={i} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: '10px 10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div className="skel" style={{ height: 10, width: '60%' }} />
                  <div className="skel" style={{ height: 16, width: '40%' }} />
                </div>
              ))}
            </div>
            {/* Action buttons (always rendered, not a skeleton) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6, marginBottom: 14 }}>
              {ACTION_BTNS.map((btn) => (
                <Link key={btn.label} href={btn.href} style={{ textDecoration: 'none' }}>
                  <div style={{ background: btn.filled ? btn.color : T.surface, border: btn.filled ? 'none' : `1px solid ${T.border}`, borderRadius: 10, padding: '10px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 14, background: btn.filled ? 'rgba(255,255,255,0.18)' : `${btn.color}15`, color: btn.filled ? '#fff' : btn.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 600 }}>{btn.glyph}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: btn.filled ? '#fff' : T.ink }}>{btn.label}</div>
                  </div>
                </Link>
              ))}
            </div>
            {/* Account balance skeleton */}
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '2px 0 10px', marginBottom: 4 }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ flex: '0 0 auto', minWidth: 124, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div className="skel" style={{ height: 10, width: '70%' }} />
                  <div className="skel" style={{ height: 16, width: '50%' }} />
                </div>
              ))}
            </div>
            {/* Transaction list skeleton */}
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: '4px 12px' }}>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', borderTop: i === 0 ? 'none' : `1px solid ${T.borderSoft}` }}>
                  <div className="skel" style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0 }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div className="skel" style={{ height: 12, width: '55%' }} />
                    <div className="skel" style={{ height: 9, width: '35%' }} />
                  </div>
                  <div className="skel" style={{ height: 14, width: 50 }} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Hero card */}
            <Card pad={14} style={{ background: `linear-gradient(155deg, #FFFFFF 0%, ${T.surfaceAlt} 100%)`, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: T.textMute, letterSpacing: 0.4, marginBottom: 3 }}>本月总支出</div>
                  <Amount value={expense} size={26} weight={600} color={T.ink} />
                </div>
                <div style={{ flex: 1, textAlign: 'right', borderLeft: `1px solid ${T.borderSoft}`, paddingLeft: 12 }}>
                  <div style={{ fontSize: 10, color: T.textMute, letterSpacing: 0.4, marginBottom: 3 }}>本月入账</div>
                  <Amount value={income} size={18} weight={600} color={T.income} sign="+" />
                  <div style={{ fontSize: 10, color: T.textMute, marginTop: 4 }}>
                    结余 <Amount value={income - expense} size={10} weight={600} color={income >= expense ? T.income : T.danger} />
                  </div>
                </div>
              </div>
              {budgetTotal > 0 && (
                <>
                  <div style={{ marginTop: 12, height: 5, background: T.bgSubtle, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, (expense / budgetTotal) * 100)}%`, height: '100%', background: expense > budgetTotal ? T.danger : T.accent }} />
                  </div>
                  <div style={{ marginTop: 6, fontSize: 10, color: T.textMute, display: 'flex', justifyContent: 'space-between' }}>
                    <span>本月预算 {((expense / budgetTotal) * 100).toFixed(0)}%</span>
                    <span>剩余 <Amount value={budgetTotal - expense} size={10} color={T.textSoft} /></span>
                  </div>
                </>
              )}
            </Card>

            {/* Per-actor mini cards */}
            {data.actors.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${data.actors.length}, 1fr)`, gap: 8, marginBottom: 14 }}>
                {data.actors.map((actor, i) => {
                  const v = actorExpense(actor.id);
                  const totalAll = txs.filter((t) => t.transactionType === 'expense' && t.currency === 'JPY').reduce((s, t) => s + t.amount, 0);
                  const color = ACTOR_COLORS[i % ACTOR_COLORS.length];
                  const isSelected = actor.id === selectedActorId;
                  return (
                    <div key={actor.id} style={{ background: T.surface, border: `1px solid ${isSelected ? color + '60' : T.border}`, borderRadius: 12, padding: '10px 10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                        <span style={{ width: 6, height: 6, borderRadius: 3, background: color }} />
                        <span style={{ fontSize: 11, color: T.textSoft, fontWeight: 500 }}>{actor.displayName}</span>
                      </div>
                      <Amount value={v} size={15} weight={600} color={T.ink} />
                      <div style={{ fontSize: 9, color: T.textMute, marginTop: 2 }}>
                        {totalAll > 0 ? ((v / totalAll) * 100).toFixed(0) : '0'}% 占比
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 4 action buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6, marginBottom: 14 }}>
              {ACTION_BTNS.map((btn) => (
                <Link key={btn.label} href={btn.href} style={{ textDecoration: 'none' }}>
                  <div style={{ background: btn.filled ? btn.color : T.surface, border: btn.filled ? 'none' : `1px solid ${T.border}`, borderRadius: 10, padding: '10px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 14, background: btn.filled ? 'rgba(255,255,255,0.18)' : `${btn.color}15`, color: btn.filled ? '#fff' : btn.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 600 }}>
                      {btn.glyph}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: btn.filled ? '#fff' : T.ink }}>{btn.label}</div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Account balances */}
            {activeAccounts.length > 0 && (
              <>
                <SectionLabel right={<Link href="/settings" style={{ color: T.textMute, textDecoration: 'none' }}>管理 →</Link>}>账户余额</SectionLabel>
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '2px 0 10px', marginBottom: 4 }}>
                  {activeAccounts.map((a) => (
                    <div key={a.id} style={{ flex: '0 0 auto', minWidth: 124, background: a.currency === 'CNY' ? '#FAF4EE' : T.surface, border: `1px solid ${a.currency === 'CNY' ? '#E8D9C5' : T.border}`, borderRadius: 12, padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                        <span style={{ fontSize: 10, color: T.textSoft, fontWeight: 500, whiteSpace: 'nowrap' }}>{a.name}</span>
                        {a.currency !== 'JPY' && (
                          <span style={{ marginLeft: 'auto', fontSize: 8, background: T.warningSoft, color: T.warning, padding: '1px 4px', borderRadius: 3, fontWeight: 700 }}>{a.currency}</span>
                        )}
                      </div>
                      <Amount value={accountBalances[a.id] ?? a.currentBalance} size={14} weight={600} currency={a.currency} showCurrency={false} />
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Budget alerts */}
            {overOrNear.length > 0 && (
              <>
                <SectionLabel right={<Link href="/budget" style={{ fontSize: 11, color: T.accent, fontWeight: 600, textDecoration: 'none' }}>{overOrNear.length} 项需关注 ›</Link>}>预算预警</SectionLabel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                  {overOrNear.map((u) => {
                    const cat = data.category(u.categoryId);
                    const { mark, tint } = catDisplay(cat?.name ?? '');
                    const over = u.status === 'over';
                    const accent = over ? T.danger : T.warning;
                    const accentSoft = over ? T.dangerSoft : T.warningSoft;
                    return (
                      <div key={u.budgetId} style={{ background: T.surface, border: `1px solid ${accent}30`, borderRadius: 10, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 30, height: 30, borderRadius: 9, background: tint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontFamily: CN_FONT, flexShrink: 0 }}>{mark}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <span style={{ fontSize: 12, color: T.ink, fontWeight: 500 }}>{cat?.name ?? '未知'}</span>
                            <span style={{ fontSize: 10, color: accent, fontWeight: 600 }}>{over ? '超出 ' : '已用 '}{u.usagePercent.toFixed(0)}%</span>
                          </div>
                          <div style={{ marginTop: 4, height: 4, background: accentSoft, borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ width: `${Math.min(100, u.usagePercent)}%`, height: '100%', background: accent }} />
                          </div>
                          <div style={{ marginTop: 4, fontSize: 10, color: T.textMute, display: 'flex', justifyContent: 'space-between' }}>
                            <Amount value={u.usedAmount} size={10} color={T.textSoft} />
                            <span>预算 <Amount value={u.limitAmount} size={10} color={T.textSoft} /></span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Category breakdown */}
            {topCats.length > 0 && (
              <>
                <SectionLabel right="本月">分类支出</SectionLabel>
                <Card pad={12} style={{ marginBottom: 14 }}>
                  {topCats.map(([catId, amount], i) => {
                    const cat = data.category(catId);
                    const { mark, tint } = catDisplay(cat?.name ?? '');
                    const pct = catTotal > 0 ? (amount / catTotal) * 100 : 0;
                    return (
                      <div key={catId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderTop: i === 0 ? 'none' : `1px solid ${T.borderSoft}` }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: tint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontFamily: CN_FONT, flexShrink: 0 }}>{mark}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <span style={{ fontSize: 13, color: T.ink }}>{cat?.name ?? '未分类'}</span>
                            <Amount value={amount} size={13} weight={500} />
                          </div>
                          <div style={{ marginTop: 4, height: 3, background: T.bgSubtle, borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: tint, borderRadius: 2 }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </Card>
              </>
            )}

            {/* Recent transactions */}
            <SectionLabel right={<Link href="/transactions" style={{ color: T.textMute, textDecoration: 'none' }}>查看全部 →</Link>}>最近</SectionLabel>
            {recent.length > 0 ? (
              <Card pad={4}>
                {recent.map((tx, i) => (
                  <div key={tx.id} style={{ borderTop: i === 0 ? 'none' : `1px solid ${T.borderSoft}`, padding: '0 8px' }}>
                    <TxRowReal tx={tx} showDate />
                  </div>
                ))}
              </Card>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px 0', color: T.textMute, fontSize: 13 }}>暂无记录</div>
            )}
          </>
        )}
      </div>

      <BottomNav active="home" />
    </PhoneScreen>
  );
}
