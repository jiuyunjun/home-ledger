'use client';

import { AppBar } from '@/components/layout/AppBar';
import { BottomNav } from '@/components/layout/BottomNav';
import { PhoneScreen } from '@/components/layout/PhoneScreen';
import { Amount } from '@/components/ui/Amount';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ReceiptThumb } from '@/components/ui/ReceiptThumb';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { TypeBadge } from '@/components/ui/TypeBadge';
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

interface ItemEdit {
  merchantName?: string;
  suggestedAmount?: number;
  suggestedCategoryId?: string;
}

interface ReceiptEdit {
  suggestedTransactionDate?: string;
}

function ConfBadge({ v }: { v: number }) {
  const color = v >= 0.9 ? T.success : v >= 0.7 ? T.warning : T.danger;
  const soft  = v >= 0.9 ? T.successSoft : v >= 0.7 ? T.warningSoft : T.dangerSoft;
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 6px', borderRadius: 999, background: soft, color, fontSize: 10, fontWeight: 600, fontFamily: NUM_FONT }}>
      <span style={{ width: 4, height: 4, borderRadius: 2, background: color }} />
      {(v * 100).toFixed(0)}%
    </div>
  );
}

function CategoryPicker({ currentId, onSelect, onClose }: {
  currentId: string; onSelect: (id: string) => void; onClose: () => void;
}) {
  const data = useData();
  const cats = data.expenseCategories();
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.14)', padding: 12 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {cats.map((cat) => {
          const { mark, tint } = catDisplay(cat.name);
          const selected = cat.id === currentId;
          return (
            <div key={cat.id} onClick={() => { onSelect(cat.id); onClose(); }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer', opacity: selected ? 1 : 0.72 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: tint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 600, fontFamily: CN_FONT, color: T.ink, border: selected ? `2px solid ${T.accent}` : '2px solid transparent' }}>{mark}</div>
              <div style={{ fontSize: 9, color: T.textSoft, whiteSpace: 'nowrap' }}>{cat.name}</div>
            </div>
          );
        })}
      </div>
      <div onClick={onClose} style={{ marginTop: 10, textAlign: 'center', fontSize: 11, color: T.textMute, cursor: 'pointer' }}>取消</div>
    </div>
  );
}

function ItemConfRow({ candidate, edit, rejected, first, onEditName, onEditAmount, onEditCategory, onToggleReject }: {
  candidate: Candidate;
  edit: ItemEdit;
  rejected: boolean;
  first: boolean;
  onEditName: (v: string) => void;
  onEditAmount: (v: number) => void;
  onEditCategory: (id: string) => void;
  onToggleReject: () => void;
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
  const warn = candidate.confidence < 0.7;

  useEffect(() => { if (editingAmount) amountRef.current?.focus(); }, [editingAmount]);
  useEffect(() => { if (editingName)   nameRef.current?.focus();   }, [editingName]);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
      borderTop: first ? 'none' : `1px solid ${T.borderSoft}`,
      background: warn && !rejected ? `${T.warningSoft}55` : 'transparent',
      opacity: rejected ? 0.4 : 1,
      position: 'relative',
    }}>
      {/* Category mark + name below */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div onClick={() => !rejected && setShowCatPicker(true)}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, cursor: rejected ? 'default' : 'pointer' }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: tint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, fontFamily: CN_FONT, color: T.ink }}>{mark}</div>
          <div style={{ fontSize: 9, color: T.textSoft, fontWeight: 500, whiteSpace: 'nowrap' }}>{cat?.name ?? '未分类'}</div>
        </div>
        {warn && (
          <div style={{ position: 'absolute', top: -3, right: -5, width: 14, height: 14, borderRadius: 7, background: T.warning, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, border: '1.5px solid #fff' }}>!</div>
        )}
        {showCatPicker && (
          <CategoryPicker currentId={catId} onSelect={onEditCategory} onClose={() => setShowCatPicker(false)} />
        )}
      </div>

      {/* Item name + conf badge */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {editingName && !rejected ? (
          <input
            ref={nameRef}
            defaultValue={name}
            onBlur={(e) => { onEditName(e.target.value); setEditingName(false); }}
            onKeyDown={(e) => { if (e.key === 'Enter') nameRef.current?.blur(); }}
            style={{ width: '100%', border: `1px solid ${T.accent}`, borderRadius: 6, padding: '3px 6px', fontSize: 13, color: T.ink, outline: 'none', background: T.surfaceAlt }}
          />
        ) : (
          <div onClick={() => !rejected && setEditingName(true)}
            style={{ fontSize: 13, fontWeight: 500, color: T.ink, cursor: rejected ? 'default' : 'text', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textDecoration: rejected ? 'line-through' : 'none' }}>
            {name || '—'}
          </div>
        )}
        <div style={{ marginTop: 3, display: 'flex', alignItems: 'center', gap: 5 }}>
          <ConfBadge v={candidate.confidence} />
          {warn && !rejected && <span style={{ fontSize: 10, color: T.warning, fontWeight: 500 }}>建议核对</span>}
        </div>
      </div>

      {/* Amount + action */}
      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
        {editingAmount && !rejected ? (
          <input
            ref={amountRef}
            type="number"
            defaultValue={amount}
            onBlur={(e) => { const v = parseInt(e.target.value); if (!isNaN(v) && v > 0) onEditAmount(v); setEditingAmount(false); }}
            onKeyDown={(e) => { if (e.key === 'Enter') amountRef.current?.blur(); }}
            style={{ width: 72, border: `1px solid ${T.accent}`, borderRadius: 6, padding: '3px 6px', fontSize: 14, fontFamily: NUM_FONT, fontWeight: 600, textAlign: 'right', outline: 'none', background: T.surfaceAlt }}
          />
        ) : (
          <div onClick={() => !rejected && setEditingAmount(true)} style={{ cursor: rejected ? 'default' : 'text' }}>
            <Amount value={amount} size={14} weight={600} currency={currency} color={T.ink} />
          </div>
        )}
        <div onClick={onToggleReject} style={{ fontSize: 10, cursor: 'pointer', color: rejected ? T.danger : T.textMute, fontWeight: rejected ? 500 : 400 }}>
          {rejected ? '已排除 ↩' : '编辑 ›'}
        </div>
      </div>
    </div>
  );
}

function ReceiptGroup({
  group, itemEdits, receiptEdit, rejected,
  onItemEdit, onReceiptEdit, onReject, onRejectGroup,
}: {
  group: { receiptId: string; date: string; type: string; currency: string; actorId: string; hint: string; items: Candidate[] };
  itemEdits: Record<string, ItemEdit>;
  receiptEdit: ReceiptEdit;
  rejected: Set<string>;
  onItemEdit: (id: string, patch: Partial<ItemEdit>) => void;
  onReceiptEdit: (patch: Partial<ReceiptEdit>) => void;
  onReject: (id: string) => void;
  onRejectGroup: () => void;
}) {
  const data = useData();
  const [editingDate, setEditingDate] = useState(false);
  const dateRef = useRef<HTMLInputElement>(null);

  const date = receiptEdit.suggestedTransactionDate ?? group.date;
  const currency = group.currency as 'JPY' | 'CNY';
  const actor = data.actor(group.actorId);
  const avgConf = group.items.reduce((s, c) => s + c.confidence, 0) / group.items.length;
  const activeItems = group.items.filter((c) => !rejected.has(c.id));
  const total = activeItems.reduce((s, c) => s + (itemEdits[c.id]?.suggestedAmount ?? c.suggestedAmount), 0);
  const lowConfItems = group.items.filter((c) => !rejected.has(c.id) && c.confidence < 0.7);

  // Category distribution from active items
  const catMap = new Map<string, { catId: string; amount: number }>();
  for (const c of activeItems) {
    const catId = itemEdits[c.id]?.suggestedCategoryId ?? c.suggestedCategoryId;
    const amount = itemEdits[c.id]?.suggestedAmount ?? c.suggestedAmount;
    const existing = catMap.get(catId);
    catMap.set(catId, { catId, amount: (existing?.amount ?? 0) + amount });
  }
  const catDist = Array.from(catMap.values()).sort((a, b) => b.amount - a.amount);

  useEffect(() => { if (editingDate) dateRef.current?.focus(); }, [editingDate]);

  const allRejected = group.items.every((c) => rejected.has(c.id));

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Receipt summary card */}
      <div style={{ display: 'flex', gap: 12, padding: 12, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, marginBottom: 10 }}>
        <ReceiptThumb w={60} h={80} label="" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5, flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 999, background: T.warningSoft, color: T.warning, fontSize: 10, fontWeight: 600 }}>
              <span style={{ width: 4, height: 4, borderRadius: 2, background: T.warning }} />
              待确认 · AI 草稿
            </span>
            <TypeBadge type={group.type} />
            <ConfBadge v={avgConf} />
          </div>
          <div style={{ fontSize: 12, color: T.textMute, marginBottom: 5 }}>
            {date} · 共 {activeItems.length} 项
          </div>
          <Amount value={total} size={20} weight={600} color={T.ink} currency={currency} />
        </div>
      </div>

      {/* User hint */}
      {group.hint && (
        <div style={{ padding: '10px 12px', marginBottom: 10, background: T.accentSoft, borderRadius: 10, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <div style={{ width: 20, height: 20, borderRadius: 10, flexShrink: 0, background: T.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>i</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, color: T.accent, fontWeight: 600, marginBottom: 2, letterSpacing: 0.3 }}>你上传时的提示</div>
            <div style={{ fontSize: 11, color: T.ink, lineHeight: 1.5 }}>{group.hint}</div>
          </div>
        </div>
      )}

      {/* Shared fields */}
      <SectionLabel right={<span style={{ color: T.textMute, fontSize: 10 }}>可逐项覆盖</span>}>所有项共用</SectionLabel>
      <Card pad={0} style={{ marginBottom: 12 }}>
        {/* Type row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px' }}>
          <div style={{ width: 32, fontSize: 11, color: T.textSoft, fontWeight: 500 }}>类型</div>
          <div style={{ flex: 1 }}><TypeBadge type={group.type} size="md" /></div>
          <ConfBadge v={0.99} />
          <span style={{ color: T.textDim, fontSize: 12, marginLeft: 2 }}>›</span>
        </div>
        {/* Actor row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderTop: `1px solid ${T.borderSoft}` }}>
          <div style={{ width: 32, fontSize: 11, color: T.textSoft, fontWeight: 500 }}>角色</div>
          <div style={{ flex: 1, fontSize: 13, color: T.ink }}>{actor?.displayName ?? '—'}</div>
          <ConfBadge v={0.88} />
          <span style={{ color: T.textDim, fontSize: 12, marginLeft: 2 }}>›</span>
        </div>
        {/* Date row — editable */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderTop: `1px solid ${T.borderSoft}` }}>
          <div style={{ width: 32, fontSize: 11, color: T.textSoft, fontWeight: 500 }}>日期</div>
          <div style={{ flex: 1 }}>
            {editingDate ? (
              <input
                ref={dateRef}
                type="date"
                defaultValue={date}
                onBlur={(e) => { onReceiptEdit({ suggestedTransactionDate: e.target.value }); setEditingDate(false); }}
                style={{ border: `1px solid ${T.accent}`, borderRadius: 6, padding: '2px 6px', fontSize: 13, color: T.ink, outline: 'none', background: T.surfaceAlt }}
              />
            ) : (
              <div onClick={() => setEditingDate(true)} style={{ fontSize: 13, color: T.ink, cursor: 'text' }}>{date}</div>
            )}
          </div>
          <ConfBadge v={0.98} />
          <span style={{ color: T.textDim, fontSize: 12, marginLeft: 2 }}>›</span>
        </div>
        {/* Currency row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderTop: `1px solid ${T.borderSoft}` }}>
          <div style={{ width: 32, fontSize: 11, color: T.textSoft, fontWeight: 500 }}>币种</div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontFamily: NUM_FONT, fontSize: 13, fontWeight: 600, color: T.ink }}>{currency}</span>
            <span style={{ fontSize: 10, color: T.textMute }}>{currency === 'JPY' ? '¥' : '¥（人民币）'}</span>
          </div>
          <ConfBadge v={0.99} />
          <span style={{ color: T.textDim, fontSize: 12, marginLeft: 2 }}>›</span>
        </div>
      </Card>

      {/* Category distribution */}
      {catDist.length > 0 && (
        <>
          <SectionLabel right={<Amount value={total} size={11} color={T.textSoft} weight={600} currency={currency} />}>
            分类汇总 · 将生成 {activeItems.length} 笔交易
          </SectionLabel>
          <Card pad={12} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {catDist.map(({ catId, amount }) => {
                const cat = data.category(catId);
                const { mark, tint } = catDisplay(cat?.name ?? '');
                return (
                  <div key={catId} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 9px 5px 5px', borderRadius: 999, background: T.bgSubtle, fontSize: 11, color: T.ink }}>
                    <div style={{ width: 20, height: 20, borderRadius: 6, background: tint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, fontFamily: CN_FONT, color: T.ink }}>{mark}</div>
                    <span style={{ fontWeight: 500 }}>{cat?.name ?? '未分类'}</span>
                    <Amount value={amount} size={11} weight={600} color={T.textSoft} currency={currency} />
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      )}

      {/* Per-item list */}
      <SectionLabel right={
        !allRejected && (
          <span onClick={onRejectGroup} style={{ color: T.danger, fontSize: 10, cursor: 'pointer', fontWeight: 500 }}>全部排除</span>
        )
      }>每项分类（AI）</SectionLabel>
      <Card pad={0} style={{ marginBottom: 12, overflow: 'hidden' }}>
        {group.items.map((c, i) => (
          <ItemConfRow
            key={c.id}
            candidate={c}
            edit={itemEdits[c.id] ?? {}}
            rejected={rejected.has(c.id)}
            first={i === 0}
            onEditName={(v) => onItemEdit(c.id, { merchantName: v })}
            onEditAmount={(v) => onItemEdit(c.id, { suggestedAmount: v })}
            onEditCategory={(id) => onItemEdit(c.id, { suggestedCategoryId: id })}
            onToggleReject={() => onReject(c.id)}
          />
        ))}
        {allRejected && (
          <div style={{ padding: '14px 12px', fontSize: 12, color: T.textMute, textAlign: 'center' }}>已全部排除</div>
        )}
      </Card>

      {/* Low confidence warning */}
      {lowConfItems.length > 0 && (
        <div style={{ background: T.warningSoft, padding: '10px 12px', borderRadius: 10, display: 'flex', gap: 8, marginBottom: 4 }}>
          <div style={{ width: 18, height: 18, borderRadius: 9, flexShrink: 0, background: T.warning, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>!</div>
          <div style={{ fontSize: 11, color: T.ink, lineHeight: 1.5 }}>
            <strong>{lowConfItems.length} 个商品</strong>分类置信度较低，请点击分类图标核对，AI 不会自动入账。
          </div>
        </div>
      )}
    </div>
  );
}

export default function AIConfirmPage() {
  const router = useRouter();
  const data = useData();

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [itemEdits, setItemEdits] = useState<Record<string, ItemEdit>>({});
  const [receiptEdits, setReceiptEdits] = useState<Record<string, ReceiptEdit>>({});
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

  function setItemEdit(id: string, patch: Partial<ItemEdit>) {
    setItemEdits((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }
  function setReceiptEdit(receiptId: string, patch: Partial<ReceiptEdit>) {
    setReceiptEdits((prev) => ({ ...prev, [receiptId]: { ...prev[receiptId], ...patch } }));
  }
  function toggleReject(id: string) {
    setRejected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // Build receipt groups
  const groupMap = new Map<string, { receiptId: string; date: string; type: string; currency: string; actorId: string; hint: string; items: Candidate[] }>();
  for (const c of candidates) {
    if (!groupMap.has(c.receiptId)) {
      groupMap.set(c.receiptId, {
        receiptId: c.receiptId,
        date: c.suggestedTransactionDate,
        type: c.suggestedTransactionType,
        currency: c.suggestedCurrency,
        actorId: c.suggestedActorId,
        hint: c.aiUserNote,
        items: [],
      });
    }
    groupMap.get(c.receiptId)!.items.push(c);
  }
  const receiptGroups = Array.from(groupMap.values());

  const active = candidates.filter((c) => !rejected.has(c.id));
  const totalActive = active.reduce((s, c) => s + (itemEdits[c.id]?.suggestedAmount ?? c.suggestedAmount), 0);
  const primaryCurrency = (candidates[0]?.suggestedCurrency ?? 'JPY') as 'JPY' | 'CNY';

  async function handleConfirmAll() {
    if (acting || active.length === 0) return;
    setActing(true);
    try {
      for (const c of active) {
        const rEdit = receiptEdits[c.receiptId] ?? {};
        const iEdit = itemEdits[c.id] ?? {};
        const body: Record<string, unknown> = {};
        if (rEdit.suggestedTransactionDate) body.suggestedTransactionDate = rEdit.suggestedTransactionDate;
        if (iEdit.merchantName !== undefined)        body.merchantName = iEdit.merchantName;
        if (iEdit.suggestedAmount !== undefined)     body.suggestedAmount = iEdit.suggestedAmount;
        if (iEdit.suggestedCategoryId !== undefined) body.suggestedCategoryId = iEdit.suggestedCategoryId;
        if (Object.keys(body).length > 0) {
          await apiPatch(`/api/transaction-candidates/${c.id}`, body);
        }
        await apiPost(`/api/transaction-candidates/${c.id}/confirm`, {});
      }
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

  async function handleRejectAll() {
    if (acting) return;
    setRejected(new Set(candidates.map((c) => c.id)));
  }

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

  return (
    <PhoneScreen>
      <AppBar
        title="确认入账"
        subtitle={`${active.length} 项待确认 · 每项 AI 已分类，请核对`}
        left={
          <Link href="/upload" style={{ textDecoration: 'none' }}>
            <div style={{ fontSize: 18, color: T.textSoft, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</div>
          </Link>
        }
      />

      <div style={{ flex: 1, overflow: 'auto', padding: '8px 16px 100px' }}>
        {receiptGroups.map((group) => (
          <ReceiptGroup
            key={group.receiptId}
            group={group}
            itemEdits={itemEdits}
            receiptEdit={receiptEdits[group.receiptId] ?? {}}
            rejected={rejected}
            onItemEdit={setItemEdit}
            onReceiptEdit={(patch) => setReceiptEdit(group.receiptId, patch)}
            onReject={toggleReject}
            onRejectGroup={() => group.items.forEach((c) => setRejected((prev) => new Set([...prev, c.id])))}
          />
        ))}

        <div style={{ fontSize: 11, color: T.textMute, textAlign: 'center', marginTop: 4 }}>
          点击分类图标可修改 · 点击名称或金额可编辑 · 点击"编辑 ›"可排除
        </div>
      </div>

      <div style={{ padding: '10px 16px 18px', borderTop: `1px solid ${T.borderSoft}`, background: 'rgba(251,248,242,0.96)', display: 'flex', gap: 8, alignItems: 'stretch' }}>
        <Button variant="danger" size="lg" style={{ flex: 1 }} onClick={handleRejectAll} disabled={acting || active.length === 0}>
          拒绝
        </Button>
        <Button variant="success" size="lg" style={{ flex: 2, flexDirection: 'column', gap: 0, padding: '6px 10px', height: 48 }} onClick={handleConfirmAll} disabled={acting || active.length === 0}>
          <span style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.1 }}>{acting ? '处理中…' : '确认入账'}</span>
          <span style={{ fontSize: 10, opacity: 0.85, lineHeight: 1.1, marginTop: 2 }}>
            {active.length} 笔 · {primaryCurrency === 'JPY' ? '¥' : '¥'}{totalActive.toLocaleString()}
          </span>
        </Button>
      </div>

      <BottomNav />
    </PhoneScreen>
  );
}
