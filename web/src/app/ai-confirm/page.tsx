'use client';

import { AppBar } from '@/components/layout/AppBar';
import { BottomNav } from '@/components/layout/BottomNav';
import { PhoneScreen } from '@/components/layout/PhoneScreen';
import { Amount } from '@/components/ui/Amount';
import { Button } from '@/components/ui/Button';
import { useData } from '@/context/DataContext';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
import { catDisplay } from '@/lib/catDisplay';
import { CN_FONT, NUM_FONT, T } from '@/lib/tokens';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

interface Candidate {
  id: string;
  receiptId: string;
  householdId: string;
  suggestedActorId: string;
  suggestedTransactionType: string;
  suggestedTransactionDate: string;
  suggestedAmount: number;
  suggestedCurrency: string;
  suggestedCategoryId: string;
  merchantName: string;
  aiUserNote: string;
  confidence: number;
  status: string;
}

// Local edits buffered until confirm
interface Edit {
  merchantName?: string;
  suggestedAmount?: number;
  suggestedCategoryId?: string;
}

function ConfBadge({ v }: { v: number }) {
  const color = v >= 0.85 ? T.success : v >= 0.65 ? T.warning : T.danger;
  const soft  = v >= 0.85 ? T.successSoft : v >= 0.65 ? T.warningSoft : T.dangerSoft;
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 999, background: soft, color, fontSize: 10, fontWeight: 600, fontFamily: NUM_FONT }}>
      <span style={{ width: 4, height: 4, borderRadius: 2, background: color }} />
      {(v * 100).toFixed(0)}%
    </div>
  );
}

function CategoryPicker({ currentId, onSelect, onClose }: { currentId: string; onSelect: (id: string) => void; onClose: () => void }) {
  const data = useData();
  const cats = data.expenseCategories();
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', padding: 10 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-start' }}>
        {cats.map((cat) => {
          const { mark, tint } = catDisplay(cat.name);
          const selected = cat.id === currentId;
          return (
            <div key={cat.id} onClick={() => { onSelect(cat.id); onClose(); }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer', opacity: selected ? 1 : 0.75 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: tint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 600, fontFamily: CN_FONT, color: T.ink, border: selected ? `2px solid ${T.accent}` : '2px solid transparent' }}>{mark}</div>
              <div style={{ fontSize: 9, color: T.textSoft, whiteSpace: 'nowrap' }}>{cat.name}</div>
            </div>
          );
        })}
      </div>
      <div onClick={onClose} style={{ marginTop: 8, textAlign: 'center', fontSize: 11, color: T.textMute, cursor: 'pointer' }}>取消</div>
    </div>
  );
}

function ItemRow({
  candidate, edit, rejected,
  onEditName, onEditAmount, onEditCategory, onReject,
}: {
  candidate: Candidate;
  edit: Edit;
  rejected: boolean;
  onEditName: (v: string) => void;
  onEditAmount: (v: number) => void;
  onEditCategory: (id: string) => void;
  onReject: () => void;
}) {
  const data = useData();
  const [showCatPicker, setShowCatPicker] = useState(false);
  const [editingAmount, setEditingAmount] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const catId = edit.suggestedCategoryId ?? candidate.suggestedCategoryId;
  const cat = data.category(catId);
  const { mark, tint } = catDisplay(cat?.name ?? '');
  const amount = edit.suggestedAmount ?? candidate.suggestedAmount;
  const name = edit.merchantName ?? candidate.merchantName;
  const currency = candidate.suggestedCurrency as 'JPY' | 'CNY';

  useEffect(() => { if (editingAmount) amountRef.current?.focus(); }, [editingAmount]);
  useEffect(() => { if (editingName) nameRef.current?.focus(); }, [editingName]);

  if (rejected) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderTop: `1px solid ${T.borderSoft}`, position: 'relative' }}>
      {/* Category mark — tap to pick */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div onClick={() => setShowCatPicker(true)} style={{ width: 36, height: 36, borderRadius: 10, background: tint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 600, fontFamily: CN_FONT, color: T.ink, cursor: 'pointer' }}>{mark}</div>
        {showCatPicker && (
          <CategoryPicker currentId={catId} onSelect={onEditCategory} onClose={() => setShowCatPicker(false)} />
        )}
      </div>

      {/* Item name */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {editingName ? (
          <input
            ref={nameRef}
            defaultValue={name}
            onBlur={(e) => { onEditName(e.target.value); setEditingName(false); }}
            onKeyDown={(e) => { if (e.key === 'Enter') nameRef.current?.blur(); }}
            style={{ width: '100%', border: `1px solid ${T.accent}`, borderRadius: 6, padding: '3px 6px', fontSize: 13, color: T.ink, outline: 'none', background: T.surfaceAlt }}
          />
        ) : (
          <div onClick={() => setEditingName(true)} style={{ fontSize: 13, fontWeight: 500, color: T.ink, cursor: 'text', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name || '—'}</div>
        )}
        <div style={{ fontSize: 10, color: T.textMute, marginTop: 2 }}>{cat?.name ?? '未分类'}</div>
      </div>

      {/* Amount */}
      <div style={{ flexShrink: 0 }}>
        {editingAmount ? (
          <input
            ref={amountRef}
            type="number"
            defaultValue={amount}
            onBlur={(e) => { const v = parseInt(e.target.value); if (!isNaN(v) && v > 0) onEditAmount(v); setEditingAmount(false); }}
            onKeyDown={(e) => { if (e.key === 'Enter') amountRef.current?.blur(); }}
            style={{ width: 72, border: `1px solid ${T.accent}`, borderRadius: 6, padding: '3px 6px', fontSize: 14, fontFamily: NUM_FONT, fontWeight: 600, textAlign: 'right', outline: 'none', background: T.surfaceAlt }}
          />
        ) : (
          <div onClick={() => setEditingAmount(true)} style={{ cursor: 'text' }}>
            <Amount value={amount} size={14} weight={600} currency={currency} color={T.ink} />
          </div>
        )}
      </div>

      {/* Reject */}
      <div onClick={onReject} style={{ width: 24, height: 24, borderRadius: 12, background: T.bgSubtle, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: T.textDim, cursor: 'pointer', flexShrink: 0 }}>×</div>
    </div>
  );
}

export default function AIConfirmPage() {
  const router = useRouter();
  const data = useData();

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [edits, setEdits] = useState<Record<string, Edit>>({});
  const [rejected, setRejected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    try {
      const list = await apiGet<Candidate[]>('/api/transaction-candidates');
      setCandidates(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCandidates(); }, [fetchCandidates]);

  function setEdit(id: string, patch: Partial<Edit>) {
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  function rejectLocal(id: string) {
    setRejected((prev) => new Set([...prev, id]));
  }

  const active = candidates.filter((c) => !rejected.has(c.id));

  async function handleConfirmAll() {
    if (acting || active.length === 0) return;
    setActing(true);
    try {
      for (const c of active) {
        const edit = edits[c.id] ?? {};
        if (Object.keys(edit).length > 0) {
          const body: Record<string, unknown> = {};
          if (edit.merchantName !== undefined) body.merchantName = edit.merchantName;
          if (edit.suggestedAmount !== undefined) body.suggestedAmount = edit.suggestedAmount;
          if (edit.suggestedCategoryId !== undefined) body.suggestedCategoryId = edit.suggestedCategoryId;
          await apiPatch(`/api/transaction-candidates/${c.id}`, body);
        }
        await apiPost(`/api/transaction-candidates/${c.id}/confirm`, {});
      }
      // Reject locally-rejected ones server-side
      for (const id of rejected) {
        await apiPost(`/api/transaction-candidates/${id}/reject`, {});
      }
      router.push('/transactions');
    } catch (e) {
      console.error(e);
    } finally {
      setActing(false);
    }
  }

  // Group by receiptId for display
  const groups: { receiptId: string; date: string; items: Candidate[] }[] = [];
  const seen = new Set<string>();
  for (const c of candidates) {
    if (!seen.has(c.receiptId)) {
      seen.add(c.receiptId);
      groups.push({ receiptId: c.receiptId, date: c.suggestedTransactionDate, items: [] });
    }
    groups[groups.length - 1].items.push(c);
  }
  // Fix: each candidate goes to its own receipt group
  const groupMap = new Map<string, { receiptId: string; date: string; items: Candidate[] }>();
  for (const c of candidates) {
    if (!groupMap.has(c.receiptId)) {
      groupMap.set(c.receiptId, { receiptId: c.receiptId, date: c.suggestedTransactionDate, items: [] });
    }
    groupMap.get(c.receiptId)!.items.push(c);
  }
  const receiptGroups = Array.from(groupMap.values());

  if (loading) {
    return (
      <PhoneScreen>
        <AppBar title="确认入账" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.textMute, fontSize: 13 }}>加载中…</div>
        <BottomNav />
      </PhoneScreen>
    );
  }

  if (candidates.length === 0) {
    return (
      <PhoneScreen>
        <AppBar title="确认入账" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: T.textMute }}>
          <div style={{ fontSize: 36 }}>✓</div>
          <div style={{ fontSize: 14 }}>没有待确认的记录</div>
          <Link href="/upload" style={{ fontSize: 13, color: T.accent }}>上传新小票</Link>
        </div>
        <BottomNav />
      </PhoneScreen>
    );
  }

  const avgConf = candidates.length > 0
    ? candidates.reduce((s, c) => s + c.confidence, 0) / candidates.length
    : 0;

  return (
    <PhoneScreen>
      <AppBar
        title="确认入账"
        subtitle={`${active.length} 项待确认 · AI 草稿`}
        left={
          <Link href="/upload" style={{ textDecoration: 'none' }}>
            <div style={{ fontSize: 18, color: T.textSoft, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</div>
          </Link>
        }
        right={<ConfBadge v={avgConf} />}
      />

      <div style={{ flex: 1, overflow: 'auto', padding: '8px 16px 100px' }}>
        {receiptGroups.map((group) => {
          const groupActive = group.items.filter((c) => !rejected.has(c.id));
          return (
            <div key={group.receiptId} style={{ marginBottom: 16 }}>
              {/* Receipt header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, padding: '0 2px' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: T.textSoft }}>小票 · {group.date}</div>
                {group.items.some((c) => !rejected.has(c.id)) && (
                  <div onClick={() => group.items.forEach((c) => rejectLocal(c.id))}
                    style={{ fontSize: 10, color: T.danger, cursor: 'pointer' }}>全部拒绝</div>
                )}
              </div>

              {/* Item rows */}
              <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, overflow: 'hidden' }}>
                {group.items.filter((c) => !rejected.has(c.id)).length === 0 ? (
                  <div style={{ padding: '14px 12px', fontSize: 12, color: T.textMute, textAlign: 'center' }}>已全部拒绝</div>
                ) : (
                  group.items.map((c, i) => (
                    <ItemRow
                      key={c.id}
                      candidate={c}
                      edit={edits[c.id] ?? {}}
                      rejected={rejected.has(c.id)}
                      onEditName={(v) => setEdit(c.id, { merchantName: v })}
                      onEditAmount={(v) => setEdit(c.id, { suggestedAmount: v })}
                      onEditCategory={(id) => setEdit(c.id, { suggestedCategoryId: id })}
                      onReject={() => rejectLocal(c.id)}
                    />
                  ))
                )}
              </div>

              {/* Subtotal for this receipt */}
              {groupActive.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '6px 4px 0', fontSize: 11, color: T.textSoft }}>
                  小计{' '}
                  <span style={{ fontFamily: NUM_FONT, fontWeight: 600, color: T.ink, marginLeft: 4 }}>
                    ¥{groupActive.reduce((s, c) => s + (edits[c.id]?.suggestedAmount ?? c.suggestedAmount), 0).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          );
        })}

        {candidates.length > 0 && (
          <div style={{ fontSize: 11, color: T.textMute, textAlign: 'center', marginTop: 4 }}>
            点击分类图标可修改分类 · 点击名称或金额可编辑
          </div>
        )}
      </div>

      <div style={{ padding: '10px 16px 18px', borderTop: `1px solid ${T.borderSoft}`, background: 'rgba(251,248,242,0.96)', display: 'flex', gap: 8 }}>
        <Button variant="danger" size="lg" style={{ flex: 1 }} onClick={() => { candidates.forEach((c) => rejectLocal(c.id)); }} disabled={acting || active.length === 0}>
          全部拒绝
        </Button>
        <Button variant="success" size="lg" style={{ flex: 2 }} onClick={handleConfirmAll} disabled={acting || active.length === 0}>
          {acting ? '处理中…' : `确认 ${active.length} 项入账`}
        </Button>
      </div>

      <BottomNav />
    </PhoneScreen>
  );
}
