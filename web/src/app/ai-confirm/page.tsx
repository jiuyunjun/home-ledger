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
import { hapticSuccess, hapticTap, hapticWarn } from '@/lib/haptic';
import { CN_FONT, NUM_FONT, T } from '@/lib/tokens';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

interface Candidate {
  id: string;
  receiptId: string;
  subReceiptId?: string;
  householdId: string;
  suggestedActorId: string;
  suggestedTransactionType: string;
  suggestedTransactionDate: string;
  suggestedAmount: number;
  suggestedCurrency: string;
  suggestedCategoryId: string;
  suggestedPaymentMethodId?: string;
  storeName: string;
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
  suggestedActorId?: string;
  suggestedCurrency?: string;
  suggestedPaymentMethodId?: string;
  convertedAmountStr?: string;
}

// ─── Bottom-sheet pickers ────────────────────────────────────────────────────

function Backdrop({ onClose }: { onClose: () => void }) {
  return <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 98, background: 'rgba(0,0,0,0.32)' }} />;
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <>
      <Backdrop onClose={onClose} />
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 99, background: T.surface, borderRadius: '16px 16px 0 0', padding: '16px 16px 36px', boxShadow: '0 -4px 24px rgba(0,0,0,0.14)' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, textAlign: 'center', marginBottom: 14 }}>{title}</div>
        {children}
        <div onClick={onClose} style={{ marginTop: 14, textAlign: 'center', fontSize: 12, color: T.textMute, cursor: 'pointer' }}>取消</div>
      </div>
    </>
  );
}

function CategoryPicker({ currentId, onSelect, onClose }: {
  currentId: string; onSelect: (id: string) => void; onClose: () => void;
}) {
  const data = useData();
  const cats = data.expenseCategories();
  return (
    <Sheet title="选择分类" onClose={onClose}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'flex-start' }}>
        {cats.map((cat) => {
          const { mark, tint } = catDisplay(cat.name);
          const selected = cat.id === currentId;
          return (
            <div key={cat.id} onClick={() => { onSelect(cat.id); onClose(); }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer', opacity: selected ? 1 : 0.72, width: 48 }}>
              <div style={{ width: 40, height: 40, borderRadius: 11, background: tint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 600, fontFamily: CN_FONT, color: T.ink, border: selected ? `2px solid ${T.accent}` : '2px solid transparent' }}>{mark}</div>
              <div style={{ fontSize: 10, color: T.textSoft, whiteSpace: 'nowrap', textAlign: 'center' }}>{cat.name}</div>
            </div>
          );
        })}
      </div>
    </Sheet>
  );
}

function ActorPicker({ currentId, onSelect, onClose }: {
  currentId: string; onSelect: (id: string) => void; onClose: () => void;
}) {
  const data = useData();
  return (
    <Sheet title="选择角色" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.actors.map((a) => {
          const selected = a.id === currentId;
          return (
            <div key={a.id} onClick={() => { onSelect(a.id); onClose(); }}
              style={{ padding: '12px 14px', borderRadius: 10, border: `1.5px solid ${selected ? T.accent : T.border}`, background: selected ? T.accentSoft : T.surface, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, color: T.ink, fontWeight: selected ? 600 : 400 }}>{a.displayName}</span>
              {selected && <span style={{ fontSize: 12, color: T.accent }}>✓</span>}
            </div>
          );
        })}
      </div>
    </Sheet>
  );
}

function PaymentMethodPicker({ currentId, onSelect, onClose }: {
  currentId: string; onSelect: (id: string) => void; onClose: () => void;
}) {
  const data = useData();
  const pms = data.paymentMethods.filter((p) => p.isActive);
  return (
    <Sheet title="选择支付方式" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {pms.map((pm) => {
          const selected = pm.id === currentId;
          const owner = data.actor(pm.ownerActorId);
          return (
            <div key={pm.id} onClick={() => { onSelect(pm.id); onClose(); }}
              style={{ padding: '12px 14px', borderRadius: 10, border: `1.5px solid ${selected ? T.accent : T.border}`, background: selected ? T.accentSoft : T.surface, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: 14, color: T.ink, fontWeight: selected ? 600 : 400 }}>{pm.name}</span>
                {owner && <span style={{ fontSize: 11, color: T.textMute, marginLeft: 8 }}>{owner.displayName}</span>}
              </div>
              {selected && <span style={{ fontSize: 12, color: T.accent }}>✓</span>}
            </div>
          );
        })}
        {pms.length === 0 && <div style={{ textAlign: 'center', color: T.textMute, fontSize: 13 }}>暂无支付方式</div>}
      </div>
    </Sheet>
  );
}

// ─── Conf badge ──────────────────────────────────────────────────────────────

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

// ─── Per-item row ────────────────────────────────────────────────────────────

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
    <>
      {showCatPicker && (
        <CategoryPicker currentId={catId} onSelect={onEditCategory} onClose={() => setShowCatPicker(false)} />
      )}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
        borderTop: first ? 'none' : `1px solid ${T.borderSoft}`,
        background: warn && !rejected ? `${T.warningSoft}55` : 'transparent',
        opacity: rejected ? 0.4 : 1,
      }}>
        {/* Category mark + name below */}
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, position: 'relative', cursor: rejected ? 'default' : 'pointer' }}
          onClick={() => !rejected && setShowCatPicker(true)}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: tint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, fontFamily: CN_FONT, color: T.ink }}>{mark}</div>
          <div style={{ fontSize: 9, color: T.textSoft, fontWeight: 500, whiteSpace: 'nowrap' }}>{cat?.name ?? '未分类'}</div>
          {warn && (
            <div style={{ position: 'absolute', top: -4, right: -6, width: 14, height: 14, borderRadius: 7, background: T.warning, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, border: '1.5px solid #fff' }}>!</div>
          )}
        </div>

        {/* Name + conf */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {editingName && !rejected ? (
            <input ref={nameRef} defaultValue={name}
              onBlur={(e) => { onEditName(e.target.value); setEditingName(false); }}
              onKeyDown={(e) => { if (e.key === 'Enter') nameRef.current?.blur(); }}
              style={{ width: '100%', border: `1px solid ${T.accent}`, borderRadius: 6, padding: '3px 6px', fontSize: 13, color: T.ink, outline: 'none', background: T.surfaceAlt }} />
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
            <input ref={amountRef} type="number" defaultValue={amount}
              onBlur={(e) => { const v = parseInt(e.target.value); if (!isNaN(v) && v > 0) onEditAmount(v); setEditingAmount(false); }}
              onKeyDown={(e) => { if (e.key === 'Enter') amountRef.current?.blur(); }}
              style={{ width: 72, border: `1px solid ${T.accent}`, borderRadius: 6, padding: '3px 6px', fontSize: 14, fontFamily: NUM_FONT, fontWeight: 600, textAlign: 'right', outline: 'none', background: T.surfaceAlt }} />
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
    </>
  );
}

// ─── Receipt group ────────────────────────────────────────────────────────────

function ReceiptGroup({ group, photoItemCount, itemEdits, receiptEdit, rejected, regenerating, onItemEdit, onReceiptEdit, onToggleReject, onRejectGroup, onRegenerate }: {
  group: { key: string; receiptId: string; date: string; type: string; currency: string; actorId: string; hint: string; paymentMethodId: string; storeName: string; items: Candidate[] };
  photoItemCount: number;
  itemEdits: Record<string, ItemEdit>;
  receiptEdit: ReceiptEdit;
  rejected: Set<string>;
  regenerating: boolean;
  onItemEdit: (id: string, patch: Partial<ItemEdit>) => void;
  onReceiptEdit: (patch: Partial<ReceiptEdit>) => void;
  onToggleReject: (id: string) => void;
  onRejectGroup: () => void;
  onRegenerate: (model: 'fast' | 'accurate') => void;
}) {
  const data = useData();
  const [editingDate, setEditingDate] = useState(false);
  const [showActorPicker, setShowActorPicker] = useState(false);
  const [showPmPicker, setShowPmPicker] = useState(false);
  const [regenOpen, setRegenOpen] = useState(false);
  const dateRef = useRef<HTMLInputElement>(null);

  const date     = receiptEdit.suggestedTransactionDate ?? group.date;
  const actorId  = receiptEdit.suggestedActorId ?? group.actorId;
  const currency = (receiptEdit.suggestedCurrency ?? group.currency) as 'JPY' | 'CNY';
  const pmId     = receiptEdit.suggestedPaymentMethodId ?? group.paymentMethodId;
  const actor    = data.actor(actorId);
  const pm       = data.paymentMethod(pmId);
  const showCnyField = pm?.currency === 'CNY' && currency === 'JPY' && group.type === 'expense';

  const activeItems = group.items.filter((c) => !rejected.has(c.id));
  const total = activeItems.reduce((s, c) => s + (itemEdits[c.id]?.suggestedAmount ?? c.suggestedAmount), 0);
  const avgConf = group.items.reduce((s, c) => s + c.confidence, 0) / group.items.length;
  const lowConfItems = group.items.filter((c) => !rejected.has(c.id) && c.confidence < 0.7);
  const allRejected = group.items.every((c) => rejected.has(c.id));

  // Category distribution
  const catMap = new Map<string, number>();
  for (const c of activeItems) {
    const cid = itemEdits[c.id]?.suggestedCategoryId ?? c.suggestedCategoryId;
    catMap.set(cid, (catMap.get(cid) ?? 0) + (itemEdits[c.id]?.suggestedAmount ?? c.suggestedAmount));
  }
  const catDist = Array.from(catMap.entries()).sort((a, b) => b[1] - a[1]);

  useEffect(() => { if (editingDate) dateRef.current?.focus(); }, [editingDate]);

  return (
    <div style={{ marginBottom: 20 }}>
      {showActorPicker && <ActorPicker currentId={actorId} onSelect={(id) => onReceiptEdit({ suggestedActorId: id })} onClose={() => setShowActorPicker(false)} />}
      {showPmPicker && <PaymentMethodPicker currentId={pmId} onSelect={(id) => onReceiptEdit({ suggestedPaymentMethodId: id })} onClose={() => setShowPmPicker(false)} />}

      {/* Receipt summary card */}
      <div style={{ display: 'flex', gap: 12, padding: 12, background: T.surface, border: `1px solid ${avgConf < 0.7 ? T.warning : T.border}`, borderRadius: 14, marginBottom: 10, position: 'relative' }}>
        <ReceiptThumb w={60} h={80} label="" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5, flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 999, background: T.warningSoft, color: T.warning, fontSize: 10, fontWeight: 600 }}>
              <span style={{ width: 4, height: 4, borderRadius: 2, background: T.warning }} />
              待确认
            </span>
            <TypeBadge type={group.type} />
            <ConfBadge v={avgConf} />
          </div>
          <div style={{ fontSize: 12, color: T.textMute, marginBottom: 5 }}>
            {group.storeName && <span style={{ color: T.ink, fontWeight: 600 }}>{group.storeName} · </span>}
            {date} · 共 {activeItems.length} 项
          </div>
          <Amount value={total} size={20} weight={600} color={T.ink} currency={currency} />
        </div>
        <div onClick={() => !regenerating && setRegenOpen((v) => !v)}
          style={{ position: 'absolute', top: 10, right: 10, padding: '4px 9px', borderRadius: 999, border: `1px solid ${avgConf < 0.7 ? T.warning : T.border}`, background: avgConf < 0.7 ? T.warningSoft : T.surfaceAlt, color: avgConf < 0.7 ? T.warning : T.textSoft, fontSize: 10, fontWeight: 600, cursor: regenerating ? 'default' : 'pointer', opacity: regenerating ? 0.5 : 1, whiteSpace: 'nowrap' }}>
          {regenerating ? '识别中…' : '↻ 重新生成'}
        </div>
      </div>

      {/* Regenerate model picker (inline) */}
      {regenOpen && !regenerating && (
        <div style={{ marginBottom: 10, padding: 10, border: `1px solid ${T.border}`, borderRadius: 10, background: T.surfaceAlt }}>
          <div style={{ fontSize: 11, color: T.textSoft, marginBottom: 6 }}>
            {photoItemCount > group.items.length
              ? `整张照片共 ${photoItemCount} 项将全部重新识别（含同张照片的其它小票）· 选择模型：`
              : `当前 ${group.items.length} 项将被丢弃并重新识别 · 选择模型：`}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {([{ v: 'accurate', label: '精准', sub: 'GPT-5.5' }, { v: 'fast', label: '快速', sub: 'GPT-5.4 mini' }] as const).map((opt) => (
              <div key={opt.v} onClick={() => { setRegenOpen(false); onRegenerate(opt.v); }}
                style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface, cursor: 'pointer', textAlign: 'center' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.ink }}>{opt.label}</div>
                <div style={{ fontSize: 9, color: T.textMute, marginTop: 1 }}>{opt.sub}</div>
              </div>
            ))}
            <div onClick={() => setRegenOpen(false)}
              style={{ padding: '8px 10px', borderRadius: 8, border: `1px solid ${T.border}`, background: 'transparent', cursor: 'pointer', fontSize: 11, color: T.textMute, alignSelf: 'center' }}>
              取消
            </div>
          </div>
        </div>
      )}

      {/* Low confidence warning — surfaced above items so user sees it first */}
      {lowConfItems.length > 0 && !regenerating && (
        <div style={{ background: T.warningSoft, padding: '10px 12px', borderRadius: 10, display: 'flex', gap: 8, marginBottom: 10 }}>
          <div style={{ width: 18, height: 18, borderRadius: 9, flexShrink: 0, background: T.warning, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>!</div>
          <div style={{ fontSize: 11, color: T.ink, lineHeight: 1.5 }}>
            <strong>{lowConfItems.length} 个商品</strong>分类置信度较低，建议核对，或点击右上角重新生成。
          </div>
        </div>
      )}

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
        {[
          {
            label: '类型',
            content: <TypeBadge type={group.type} size="md" />,
            tap: undefined,
          },
          {
            label: '角色',
            content: <span style={{ fontSize: 13, color: T.ink }}>{actor?.displayName ?? '—'}</span>,
            tap: () => setShowActorPicker(true),
          },
          {
            label: '日期',
            content: editingDate ? (
              <input ref={dateRef} type="date" defaultValue={date}
                onBlur={(e) => { onReceiptEdit({ suggestedTransactionDate: e.target.value }); setEditingDate(false); }}
                style={{ border: `1px solid ${T.accent}`, borderRadius: 6, padding: '2px 6px', fontSize: 13, color: T.ink, outline: 'none', background: T.surfaceAlt }} />
            ) : (
              <span style={{ fontSize: 13, color: T.ink }}>{date}</span>
            ),
            tap: () => setEditingDate(true),
          },
          {
            label: '币种',
            content: (
              <div style={{ display: 'inline-flex', gap: 4, padding: 2, background: T.bgSubtle, borderRadius: 6 }}>
                {(['JPY', 'CNY'] as const).map((cc) => {
                  const on = cc === currency;
                  return (
                    <div key={cc} onClick={(e) => { e.stopPropagation(); onReceiptEdit({ suggestedCurrency: cc }); }}
                      style={{ padding: '3px 10px', borderRadius: 4, background: on ? '#fff' : 'transparent', color: on ? T.ink : T.textSoft, fontSize: 11, fontWeight: 600, fontFamily: NUM_FONT, cursor: 'pointer' }}>{cc}</div>
                  );
                })}
              </div>
            ),
            tap: undefined,
          },
          {
            label: '账户',
            content: <span style={{ fontSize: 13, color: T.ink }}>{pm?.name ?? '—'}</span>,
            tap: () => setShowPmPicker(true),
          },
        ].map(({ label, content, tap }, i) => (
          <div key={label} onClick={tap} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderTop: i === 0 ? 'none' : `1px solid ${T.borderSoft}`, cursor: tap ? 'pointer' : 'default' }}>
            <div style={{ width: 32, fontSize: 11, color: T.textSoft, fontWeight: 500 }}>{label}</div>
            <div style={{ flex: 1 }}>{content}</div>
            <span style={{ color: T.textDim, fontSize: 12 }}>›</span>
          </div>
        ))}
        {showCnyField && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderTop: `1px solid ${T.borderSoft}` }}>
            <div style={{ width: 32, fontSize: 11, color: T.textSoft, fontWeight: 500 }}>实付</div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="text"
                inputMode="decimal"
                value={receiptEdit.convertedAmountStr ?? ''}
                onChange={(e) => onReceiptEdit({ convertedAmountStr: e.target.value.replace(/[^\d.]/g, '') })}
                placeholder="人民币合计（可选）"
                style={{ flex: 1, border: `1px solid ${T.border}`, borderRadius: 8, padding: '6px 10px', fontSize: 13, color: T.ink, outline: 'none', background: T.surfaceAlt, fontFamily: NUM_FONT }}
              />
              <span style={{ fontSize: 11, color: T.textMute, flexShrink: 0, fontFamily: NUM_FONT }}>CNY</span>
            </div>
          </div>
        )}
      </Card>

      {/* Category distribution */}
      {catDist.length > 0 && (
        <>
          <SectionLabel right={<Amount value={total} size={11} color={T.textSoft} weight={600} currency={currency} />}>
            分类汇总 · 将生成 {activeItems.length} 笔交易
          </SectionLabel>
          <Card pad={12} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {catDist.map(([catId, amount]) => {
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
      <Card pad={0} style={{ marginBottom: 12, overflow: 'visible' }}>
        {group.items.map((c, i) => (
          <ItemConfRow key={c.id} candidate={c} edit={itemEdits[c.id] ?? {}} rejected={rejected.has(c.id)} first={i === 0}
            onEditName={(v) => onItemEdit(c.id, { merchantName: v })}
            onEditAmount={(v) => onItemEdit(c.id, { suggestedAmount: v })}
            onEditCategory={(id) => onItemEdit(c.id, { suggestedCategoryId: id })}
            onToggleReject={() => onToggleReject(c.id)} />
        ))}
        {allRejected && <div style={{ padding: '14px 12px', fontSize: 12, color: T.textMute, textAlign: 'center' }}>已全部排除</div>}
      </Card>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AIConfirmPage() {
  const router = useRouter();
  const data = useData();

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [itemEdits, setItemEdits] = useState<Record<string, ItemEdit>>({});
  const [receiptEdits, setReceiptEdits] = useState<Record<string, ReceiptEdit>>({});
  const [rejected, setRejected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [confirmError, setConfirmError] = useState('');
  const [regeneratingReceiptId, setRegeneratingReceiptId] = useState<string | null>(null);

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
    setRejected((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }

  // Build receipt groups — key by subReceiptId (one physical receipt within a photo)
  // falling back to receiptId for candidates created before multi-receipt support.
  const groupMap = new Map<string, { key: string; receiptId: string; date: string; type: string; currency: string; actorId: string; hint: string; paymentMethodId: string; storeName: string; items: Candidate[] }>();
  for (const c of candidates) {
    const key = c.subReceiptId ?? c.receiptId;
    if (!groupMap.has(key)) {
      groupMap.set(key, { key, receiptId: c.receiptId, date: c.suggestedTransactionDate, type: c.suggestedTransactionType, currency: c.suggestedCurrency, actorId: c.suggestedActorId, hint: c.aiUserNote, paymentMethodId: c.suggestedPaymentMethodId ?? '', storeName: c.storeName ?? '', items: [] });
    }
    groupMap.get(key)!.items.push(c);
  }
  const receiptGroups = Array.from(groupMap.values());

  const active = candidates.filter((c) => !rejected.has(c.id));

  // Item count per physical photo (receiptId) — regenerating one re-extracts all.
  const photoItemCounts: Record<string, number> = {};
  for (const c of candidates) photoItemCounts[c.receiptId] = (photoItemCounts[c.receiptId] ?? 0) + 1;

  // Totals split by currency so a mixed JPY+CNY batch isn't summed into one number.
  const totalsByCurrency: Record<string, number> = {};
  for (const c of active) {
    const cur = (receiptEdits[c.subReceiptId ?? c.receiptId]?.suggestedCurrency ?? c.suggestedCurrency) || 'JPY';
    totalsByCurrency[cur] = (totalsByCurrency[cur] ?? 0) + (itemEdits[c.id]?.suggestedAmount ?? c.suggestedAmount);
  }
  const totalLabel = Object.entries(totalsByCurrency)
    .map(([cur, amt]) => (cur === 'JPY' ? `¥${amt.toLocaleString()}` : `${amt.toLocaleString()} ${cur}`))
    .join(' + ') || '¥0';

  async function handleConfirmAll() {
    if (acting || active.length === 0) return;
    hapticSuccess();
    setActing(true);
    setConfirmError('');
    try {
      // Pre-compute proportional CNY amounts per receipt group
      const groupCnyMap = new Map<string, Map<string, number>>();
      for (const group of receiptGroups) {
        const rEdit = receiptEdits[group.key] ?? {};
        // If user changed PM away from CNY after entering a CNY total, drop the
        // stale CNY value so balances aren't corrupted.
        const effectivePmId = rEdit.suggestedPaymentMethodId ?? group.paymentMethodId;
        const effectivePm = data.paymentMethod(effectivePmId);
        if (effectivePm?.currency !== 'CNY') continue;
        const totalCny = Math.round(parseFloat(rEdit.convertedAmountStr ?? '') || 0);
        if (totalCny <= 0) continue;
        const activeGroupItems = group.items.filter((c) => !rejected.has(c.id));
        const groupTotal = activeGroupItems.reduce((s, c) => s + (itemEdits[c.id]?.suggestedAmount ?? c.suggestedAmount), 0);
        if (groupTotal <= 0) continue;
        const alloc = new Map<string, number>();
        let remaining = totalCny;
        activeGroupItems.forEach((c, idx) => {
          const amt = itemEdits[c.id]?.suggestedAmount ?? c.suggestedAmount;
          const share = idx === activeGroupItems.length - 1 ? remaining : Math.round(totalCny * amt / groupTotal);
          alloc.set(c.id, share);
          remaining -= share;
        });
        groupCnyMap.set(group.key, alloc);
      }

      await Promise.all(active.map(async (c) => {
        const rEdit = receiptEdits[c.subReceiptId ?? c.receiptId] ?? {};
        const iEdit = itemEdits[c.id] ?? {};
        const body: Record<string, unknown> = {};
        if (rEdit.suggestedTransactionDate)  body.suggestedTransactionDate  = rEdit.suggestedTransactionDate;
        if (rEdit.suggestedActorId)          body.suggestedActorId          = rEdit.suggestedActorId;
        if (rEdit.suggestedCurrency)         body.suggestedCurrency         = rEdit.suggestedCurrency;
        if (rEdit.suggestedPaymentMethodId)  body.suggestedPaymentMethodId  = rEdit.suggestedPaymentMethodId;
        if (iEdit.merchantName !== undefined)        body.merchantName            = iEdit.merchantName;
        if (iEdit.suggestedAmount !== undefined)     body.suggestedAmount         = iEdit.suggestedAmount;
        if (iEdit.suggestedCategoryId !== undefined) body.suggestedCategoryId     = iEdit.suggestedCategoryId;
        const cnyAlloc = groupCnyMap.get(c.subReceiptId ?? c.receiptId)?.get(c.id);
        if (cnyAlloc && cnyAlloc > 0) { body.convertedAmount = cnyAlloc; body.convertedCurrency = 'CNY'; }
        if (Object.keys(body).length > 0) await apiPatch(`/api/transaction-candidates/${c.id}`, body);
        await apiPost(`/api/transaction-candidates/${c.id}/confirm`, {});
      }));
      await Promise.all([...rejected].map((id) => apiPost(`/api/transaction-candidates/${id}/reject`, {})));
      router.push('/transactions');
    } catch (e: any) {
      setConfirmError(e?.message ?? '操作失败，请重试');
    } finally {
      setActing(false);
    }
  }

  async function handleRegenerate(receiptId: string, model: 'fast' | 'accurate') {
    if (regeneratingReceiptId) return;
    hapticTap();
    setRegeneratingReceiptId(receiptId);
    setConfirmError('');
    // Drop any in-flight edits / reject toggles for items under this receipt
    // since they'll be replaced by new candidate IDs.
    const oldIds = candidates.filter((c) => c.receiptId === receiptId).map((c) => c.id);
    setItemEdits((prev) => {
      const next = { ...prev };
      for (const id of oldIds) delete next[id];
      return next;
    });
    setRejected((prev) => {
      const next = new Set(prev);
      for (const id of oldIds) next.delete(id);
      return next;
    });
    try {
      await apiPost(`/api/receipts/${receiptId}/extract`, { model });
      await fetchCandidates();
    } catch (e) {
      setConfirmError(e instanceof Error ? e.message : '重新生成失败');
    } finally {
      setRegeneratingReceiptId(null);
    }
  }

  async function handleRejectAll() {
    if (acting) return;
    hapticWarn();
    setActing(true);
    try {
      await Promise.all(candidates.map((c) => apiPost(`/api/transaction-candidates/${c.id}/reject`, {})));
      router.push('/upload');
    } catch (e) {
      console.error(e);
    } finally {
      setActing(false);
    }
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
        subtitle={`${active.length} 项待确认 · AI 草稿`}
        left={
          <Link href="/upload" style={{ textDecoration: 'none' }}>
            <div style={{ fontSize: 18, color: T.textSoft, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</div>
          </Link>
        }
      />

      <div style={{ flex: 1, overflow: 'auto', padding: '8px 16px 100px' }}>
        {receiptGroups.map((group) => (
          <ReceiptGroup key={group.key} group={group}
            photoItemCount={photoItemCounts[group.receiptId] ?? group.items.length}
            itemEdits={itemEdits}
            receiptEdit={receiptEdits[group.key] ?? {}}
            rejected={rejected}
            regenerating={regeneratingReceiptId === group.receiptId}
            onItemEdit={setItemEdit}
            onReceiptEdit={(patch) => setReceiptEdit(group.key, patch)}
            onToggleReject={toggleReject}
            onRejectGroup={() => group.items.forEach((c) => setRejected((prev) => new Set([...prev, c.id])))}
            onRegenerate={(model) => handleRegenerate(group.receiptId, model)} />
        ))}
        <div style={{ fontSize: 11, color: T.textMute, textAlign: 'center', marginTop: 4 }}>
          点击分类图标修改 · 点击名称或金额编辑 · 点击"编辑 ›"排除此项
        </div>
      </div>

      {confirmError && (
        <div style={{ padding: '8px 16px', background: T.dangerSoft, borderTop: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 12, color: T.danger, textAlign: 'center' }}>{confirmError}</div>
        </div>
      )}
      <div style={{ padding: '10px 16px 18px', borderTop: `1px solid ${T.borderSoft}`, background: 'rgba(251,248,242,0.96)', display: 'flex', gap: 8, alignItems: 'stretch' }}>
        <Button variant="danger" size="lg" style={{ flex: 1 }} onClick={handleRejectAll} disabled={acting || active.length === 0}>
          拒绝
        </Button>
        <Button variant="success" size="lg" style={{ flex: 2, flexDirection: 'column', gap: 0, padding: '6px 10px', height: 48 }} onClick={handleConfirmAll} disabled={acting || active.length === 0}>
          <span style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.1 }}>{acting ? '处理中…' : '确认入账'}</span>
          <span style={{ fontSize: 10, opacity: 0.85, lineHeight: 1.1, marginTop: 2 }}>
            {active.length} 笔 · {totalLabel}
          </span>
        </Button>
      </div>

      <BottomNav />
    </PhoneScreen>
  );
}
