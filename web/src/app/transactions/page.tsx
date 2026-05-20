'use client';

import { AppBar } from '@/components/layout/AppBar';
import { BottomNav } from '@/components/layout/BottomNav';
import { PhoneScreen } from '@/components/layout/PhoneScreen';
import { Amount } from '@/components/ui/Amount';
import { Card } from '@/components/ui/Card';
import { useApp } from '@/context/AppContext';
import { useData } from '@/context/DataContext';
import { apiDelete, apiGet, apiGetBlob, apiPatch } from '@/lib/api';
import { catDisplay } from '@/lib/catDisplay';
import { T, NUM_FONT, CN_FONT } from '@/lib/tokens';
import type { ApiTransaction } from '@/lib/types';
import { useEffect, useState } from 'react';

interface PendingRule {
  id: string;
  title: string;
  amount: number;
  currency: string;
  transactionType: string;
  categoryId: string;
  paymentMethodId: string;
  dayOfMonth: number;
  nextRunDate: string;
  isActive: boolean;
}

function PendingRuleRow({ rule }: { rule: PendingRule }) {
  const data = useData();
  const cat = data.category(rule.categoryId ?? '');
  const pm = data.paymentMethod(rule.paymentMethodId ?? '');
  const { mark, tint } = catDisplay(cat?.name ?? '');
  const isIncome = rule.transactionType === 'income';
  const dayNum = rule.dayOfMonth;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 4px' }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: tint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, fontFamily: CN_FONT, flexShrink: 0, color: T.ink, border: `1.5px dashed ${T.border}` }}>{mark}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{rule.title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, fontSize: 11, color: T.textMute }}>
          <span style={{ background: T.bgSubtle, color: T.textSoft, borderRadius: 4, padding: '1px 5px', fontWeight: 600 }}>待执行</span>
          {pm && <span style={{ fontFamily: NUM_FONT }}>{pm.name}</span>}
          <span style={{ color: T.textDim }}>·</span>
          <span>{dayNum} 日执行</span>
        </div>
      </div>
      <Amount value={rule.amount} size={14} weight={600} currency={rule.currency as 'JPY' | 'CNY'} color={isIncome ? T.income : T.ink} sign={isIncome ? '+' : ''} />
    </div>
  );
}

const TYPE_FILTERS = [
  { id: 'all',      label: '全部' },
  { id: 'expense',  label: '支出' },
  { id: 'income',   label: '入账' },
  { id: 'transfer', label: '转账' },
];

type TxTypeFilter = 'all' | 'expense' | 'income' | 'transfer';

function fmtDay(dateStr: string) {
  const m = parseInt(dateStr.slice(5, 7), 10);
  const day = parseInt(dateStr.slice(8, 10), 10);
  const wd = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][new Date(dateStr).getDay()];
  return { md: `${m}月${day}日`, wd };
}

function Backdrop({ onClose }: { onClose: () => void }) {
  return <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 98, background: 'rgba(0,0,0,0.32)' }} />;
}

function CategoryPicker({ currentId, onSelect, onClose }: {
  currentId: string; onSelect: (id: string) => void; onClose: () => void;
}) {
  const data = useData();
  const cats = data.expenseCategories();
  return (
    <>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.32)' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 101, background: T.surface, borderRadius: '16px 16px 0 0', padding: '16px 16px 36px', boxShadow: '0 -4px 24px rgba(0,0,0,0.14)' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, textAlign: 'center', marginBottom: 14 }}>选择分类</div>
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
        <div onClick={onClose} style={{ marginTop: 14, textAlign: 'center', fontSize: 12, color: T.textMute, cursor: 'pointer' }}>取消</div>
      </div>
    </>
  );
}

function EditSheet({ tx, onSave, onClose }: {
  tx: ApiTransaction;
  onSave: (patch: Record<string, string>) => Promise<void>;
  onClose: () => void;
}) {
  const data = useData();
  const [title, setTitle] = useState(tx.title ?? '');
  const [merchantName, setMerchantName] = useState(tx.merchantName ?? '');
  const [date, setDate] = useState(tx.transactionDate);
  const [memo, setMemo] = useState(tx.memo ?? '');
  const [categoryId, setCategoryId] = useState(tx.categoryId ?? '');
  const [showCatPicker, setShowCatPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [receiptExpanded, setReceiptExpanded] = useState(false);

  useEffect(() => {
    if (!tx.receiptId) return;
    apiGetBlob(`/api/receipts/${tx.receiptId}/image`)
      .then(setReceiptUrl)
      .catch(() => {});
  }, [tx.receiptId]);

  const cat = data.category(categoryId);
  const { mark, tint } = catDisplay(cat?.name ?? '');

  async function handleSave() {
    setSaving(true);
    const patch: Record<string, string> = {};
    if (title !== (tx.title ?? '')) patch.title = title;
    if (merchantName !== (tx.merchantName ?? '')) patch.merchantName = merchantName;
    if (date !== tx.transactionDate) patch.transactionDate = date;
    if (memo !== (tx.memo ?? '')) patch.memo = memo;
    if (categoryId !== (tx.categoryId ?? '')) patch.categoryId = categoryId;
    try {
      await onSave(patch);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {showCatPicker && (
        <CategoryPicker currentId={categoryId} onSelect={setCategoryId} onClose={() => setShowCatPicker(false)} />
      )}
      <Backdrop onClose={onClose} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 99, background: T.surface, borderRadius: '16px 16px 0 0', padding: '16px 16px 36px', boxShadow: '0 -4px 24px rgba(0,0,0,0.14)' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.ink, textAlign: 'center', marginBottom: 18 }}>编辑记录</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, color: T.textSoft, fontWeight: 500 }}>店铺名称</label>
            <input value={merchantName} onChange={e => setMerchantName(e.target.value)}
              placeholder="店铺 / 来源（可选）"
              style={{ padding: '10px 12px', borderRadius: 10, border: `1px solid ${T.border}`, fontSize: 14, color: T.ink, outline: 'none', background: T.surfaceAlt }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, color: T.textSoft, fontWeight: 500 }}>品目名称</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="可为空（使用分类名）"
              style={{ padding: '10px 12px', borderRadius: 10, border: `1px solid ${T.border}`, fontSize: 14, color: T.ink, outline: 'none', background: T.surfaceAlt }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, color: T.textSoft, fontWeight: 500 }}>日期</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              style={{ padding: '10px 12px', borderRadius: 10, border: `1px solid ${T.border}`, fontSize: 14, color: T.ink, outline: 'none', background: T.surfaceAlt }} />
          </div>
          {tx.transactionType !== 'transfer' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, color: T.textSoft, fontWeight: 500 }}>分类</label>
              <div onClick={() => setShowCatPicker(true)}
                style={{ padding: '10px 12px', borderRadius: 10, border: `1px solid ${T.border}`, background: T.surfaceAlt, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: tint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontFamily: CN_FONT, color: T.ink }}>{mark}</div>
                <span style={{ fontSize: 14, color: T.ink }}>{cat?.name ?? '未分类'}</span>
                <span style={{ marginLeft: 'auto', color: T.textDim }}>›</span>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, color: T.textSoft, fontWeight: 500 }}>备注</label>
            <input value={memo} onChange={e => setMemo(e.target.value)}
              placeholder="可选"
              style={{ padding: '10px 12px', borderRadius: 10, border: `1px solid ${T.border}`, fontSize: 14, color: T.ink, outline: 'none', background: T.surfaceAlt }} />
          </div>
          {receiptUrl && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, color: T.textSoft, fontWeight: 500 }}>小票图片</label>
              <div onClick={() => setReceiptExpanded((v) => !v)} style={{ cursor: 'pointer', borderRadius: 10, overflow: 'hidden', border: `1px solid ${T.border}` }}>
                <img src={receiptUrl} alt="小票" style={{ width: '100%', display: 'block', maxHeight: receiptExpanded ? 'none' : 120, objectFit: receiptExpanded ? 'contain' : 'cover', objectPosition: 'top' }} />
              </div>
              <div style={{ fontSize: 10, color: T.textMute, textAlign: 'center' }}>{receiptExpanded ? '点击收起' : '点击查看完整小票'}</div>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: '12px 0', borderRadius: 10, border: `1px solid ${T.border}`, background: T.surface, fontSize: 14, color: T.textSoft, cursor: 'pointer', fontWeight: 500 }}>
            取消
          </button>
          <button onClick={handleSave} disabled={saving}
            style={{ flex: 2, padding: '12px 0', borderRadius: 10, border: 'none', background: T.accent, fontSize: 14, color: '#fff', cursor: saving ? 'default' : 'pointer', fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </div>
    </>
  );
}

function ReceiptViewer({ receiptId, onClose }: { receiptId: string; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    apiGetBlob(`/api/receipts/${receiptId}/image`).then(setUrl).catch(() => {});
  }, [receiptId]);
  return (
    <>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 102, background: 'rgba(0,0,0,0.72)' }} />
      <div style={{ position: 'absolute', top: '50%', left: 12, right: 12, transform: 'translateY(-50%)', zIndex: 103, borderRadius: 14, overflow: 'hidden', background: '#000' }}>
        {url
          ? <img src={url} alt="小票" style={{ width: '100%', display: 'block' }} />
          : <div style={{ padding: 40, textAlign: 'center', color: '#fff', fontSize: 13 }}>加载中…</div>
        }
        <div onClick={onClose} style={{ position: 'absolute', top: 10, right: 10, width: 28, height: 28, borderRadius: 14, background: 'rgba(0,0,0,0.5)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, cursor: 'pointer' }}>×</div>
      </div>
    </>
  );
}

function ActionRow({ receiptId, onEdit, onDelete, confirming, onConfirmDelete, onCancelDelete }: {
  receiptId?: string;
  onEdit: () => void;
  onDelete: () => void;
  confirming: boolean;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}) {
  const [showReceipt, setShowReceipt] = useState(false);
  if (confirming) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 4px 10px', borderTop: `1px solid ${T.borderSoft}` }}>
        <span style={{ flex: 1, fontSize: 12, color: T.danger, paddingLeft: 4 }}>确认删除这笔记录？</span>
        <button onClick={(e) => { e.stopPropagation(); onCancelDelete(); }}
          style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface, fontSize: 12, color: T.textSoft, cursor: 'pointer' }}>
          取消
        </button>
        <button onClick={(e) => { e.stopPropagation(); onConfirmDelete(); }}
          style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: T.danger, fontSize: 12, color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
          删除
        </button>
      </div>
    );
  }
  return (
    <>
      {showReceipt && receiptId && <ReceiptViewer receiptId={receiptId} onClose={() => setShowReceipt(false)} />}
      <div style={{ display: 'flex', gap: 8, padding: '6px 4px 10px', borderTop: `1px solid ${T.borderSoft}` }}>
        {receiptId && (
          <button onClick={(e) => { e.stopPropagation(); setShowReceipt(true); }}
            style={{ padding: '8px 10px', borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface, fontSize: 12, color: T.textSoft, cursor: 'pointer', fontWeight: 500 }}>
            🧾
          </button>
        )}
        <button onClick={(e) => { e.stopPropagation(); onEdit(); }}
          style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface, fontSize: 12, color: T.ink, cursor: 'pointer', fontWeight: 500 }}>
          编辑
        </button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
          style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: `1px solid ${T.dangerSoft}`, background: T.dangerSoft, fontSize: 12, color: T.danger, cursor: 'pointer', fontWeight: 500 }}>
          删除
        </button>
      </div>
    </>
  );
}

function ApiTxRow({ tx, expanded, confirming, onTap, onEdit, onDelete, onConfirmDelete, onCancelDelete }: {
  tx: ApiTransaction;
  expanded: boolean;
  confirming: boolean;
  onTap: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}) {
  const data = useData();
  const pad = '10px 4px';

  if (tx.transactionType === 'transfer') {
    const from = data.paymentMethod(tx.fromAccountId ?? '');
    const to = data.paymentMethod(tx.toAccountId ?? '');
    return (
      <div>
        <div onClick={onTap} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: pad, cursor: 'pointer' }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: T.transferSoft, color: T.transfer, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 600, flexShrink: 0 }}>⇄</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {from?.name ?? '—'} → {to?.name ?? '—'}
            </div>
            <div style={{ fontSize: 11, color: T.textMute, marginTop: 2, fontFamily: NUM_FONT }}>转账</div>
          </div>
          <Amount value={tx.amount} size={13} weight={500} color={T.textSoft} currency={tx.currency} showCurrency={tx.currency !== 'JPY'} />
          <span style={{ fontSize: 11, color: T.textDim, marginLeft: 6 }}>{expanded ? '∨' : '›'}</span>
        </div>
        {expanded && (
          <ActionRow receiptId={tx.receiptId} onEdit={onEdit} onDelete={onDelete} confirming={confirming} onConfirmDelete={onConfirmDelete} onCancelDelete={onCancelDelete} />
        )}
      </div>
    );
  }

  const cat = data.category(tx.categoryId ?? '');
  const actor = data.actor(tx.actorId);
  const pm = data.paymentMethod(tx.paymentMethodId ?? '');
  const isIncome = tx.transactionType === 'income';
  const { mark, tint } = catDisplay(cat?.name ?? '');

  const actorColors: Record<string, string> = {};
  const actors = data.actors;
  const colorPalette = [T.roleMe, T.roleHer, T.roleFamily];
  actors.forEach((a, i) => { actorColors[a.id] = colorPalette[i % colorPalette.length]; });

  return (
    <div>
      <div onClick={onTap} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: pad, cursor: 'pointer' }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: tint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, fontFamily: CN_FONT, flexShrink: 0, color: T.ink }}>{mark}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {tx.title || cat?.name || '—'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, fontSize: 11, color: T.textMute }}>
            {isIncome && <span style={{ background: T.incomeSoft, color: T.income, borderRadius: 4, padding: '1px 5px', fontWeight: 600 }}>入账</span>}
            {tx.merchantName && tx.merchantName !== tx.title && (
              <span style={{ color: T.textSoft, fontWeight: 500 }}>{tx.merchantName}</span>
            )}
            {actor && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <span style={{ width: 5, height: 5, borderRadius: 3, background: actorColors[actor.id] }} />
                {actor.displayName}
              </span>
            )}
            {pm && (
              <>
                <span style={{ color: T.textDim }}>·</span>
                <span style={{ fontFamily: NUM_FONT }}>{pm.name}</span>
              </>
            )}
          </div>
        </div>
        <Amount
          value={tx.amount}
          size={14}
          weight={600}
          currency={tx.currency}
          color={isIncome ? T.income : T.ink}
          sign={isIncome ? '+' : ''}
        />
        <span style={{ fontSize: 11, color: T.textDim, marginLeft: 6 }}>{expanded ? '∨' : '›'}</span>
      </div>
      {expanded && (
        <ActionRow receiptId={tx.receiptId} onEdit={onEdit} onDelete={onDelete} confirming={confirming} onConfirmDelete={onConfirmDelete} onCancelDelete={onCancelDelete} />
      )}
    </div>
  );
}

export default function TransactionsPage() {
  const { state } = useApp();
  const data = useData();
  const [typeFilter, setTypeFilter] = useState<TxTypeFilter>('all');
  const [txs, setTxs] = useState<ApiTransaction[]>([]);
  const [pendingRules, setPendingRules] = useState<PendingRule[]>([]);
  const [pmBalances, setPmBalances] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const [expanded, setExpanded] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editingTx, setEditingTx] = useState<ApiTransaction | null>(null);

  const month = new Date().toISOString().slice(0, 7);
  const today = new Date().toISOString().slice(0, 10);

  async function loadTxs() {
    setLoading(true);
    const params = new URLSearchParams({ month });
    if (state.currentRole) params.set('actorId', state.currentRole);
    try {
      const [txData, rules, balances] = await Promise.all([
        apiGet<ApiTransaction[]>(`/api/transactions?${params}`),
        apiGet<PendingRule[]>('/api/recurring-rules'),
        apiGet<Record<string, number>>('/api/payment-methods/balances'),
      ]);
      setTxs(txData);
      setPmBalances(balances);
      const todayDayOfMonth = new Date().getDate();
      setPendingRules(
        rules.filter((r) => r.isActive && r.dayOfMonth >= todayDayOfMonth)
          .sort((a, b) => a.dayOfMonth - b.dayOfMonth)
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTxs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentRole, month]);

  function handleRowTap(txId: string) {
    if (expanded === txId) {
      setExpanded(null);
      setDeleteConfirm(null);
    } else {
      setExpanded(txId);
      setDeleteConfirm(null);
    }
  }

  async function handleSaveEdit(patch: Record<string, string>) {
    if (!editingTx) return;
    await apiPatch(`/api/transactions/${editingTx.id}`, patch);
    setEditingTx(null);
    setExpanded(null);
    await loadTxs();
  }

  async function handleConfirmDelete(txId: string) {
    await apiDelete(`/api/transactions/${txId}`);
    setTxs((prev) => prev.filter((t) => t.id !== txId));
    setExpanded(null);
    setDeleteConfirm(null);
  }

  const filtered = txs.filter((t) => {
    return typeFilter === 'all' || t.transactionType === typeFilter;
  });

  const filteredPending = typeFilter === 'transfer' ? [] : pendingRules.filter((r) =>
    typeFilter === 'all' || r.transactionType === typeFilter
  );

  // Credit card pending payments: only show when viewing expense or all
  const todayDay = new Date().getDate();
  const ccPending = (typeFilter === 'all' || typeFilter === 'expense')
    ? data.paymentMethods.filter((p) => p.type === 'credit_card' && p.isActive && p.settlementDay && (pmBalances[p.id] ?? 0) < 0)
        .map((p) => {
          const amount = Math.abs(pmBalances[p.id]!);
          const sd = p.settlementDay!;
          const d = new Date();
          const settleMonth = sd >= todayDay ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` : `${d.getFullYear()}-${String(d.getMonth() + 2).padStart(2, '0')}`;
          return { id: p.id, name: p.name, amount, settlementDay: sd, settleMonth };
        })
    : [];

  const byDate: Record<string, ApiTransaction[]> = {};
  filtered.forEach((t) => { (byDate[t.transactionDate] ??= []).push(t); });
  const dates = Object.keys(byDate).sort().reverse();

  return (
    <PhoneScreen>
      {editingTx && (
        <EditSheet tx={editingTx} onSave={handleSaveEdit} onClose={() => setEditingTx(null)} />
      )}

      <AppBar
        title="明细"
        subtitle={`${month.replace('-', ' 年 ')} 月 · 共 ${filtered.length} 笔`}
        right={<div style={{ fontSize: 12, color: T.accent, fontWeight: 600 }}>导出</div>}
      />

      <div style={{ padding: '0 14px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10 }}>
          <span style={{ color: T.textMute, fontSize: 13 }}>⌕</span>
          <span style={{ flex: 1, fontSize: 13, color: T.textMute }}>搜索店铺、来源或备注</span>
        </div>
        <div style={{ display: 'flex', gap: 4, marginTop: 8, padding: 3, background: T.bgSubtle, borderRadius: 8 }}>
          {TYPE_FILTERS.map((f) => {
            const on = f.id === typeFilter;
            return (
              <div key={f.id} onClick={() => setTypeFilter(f.id as TxTypeFilter)} style={{ flex: 1, textAlign: 'center', padding: '5px 0', borderRadius: 6, fontSize: 11, fontWeight: 500, background: on ? '#fff' : 'transparent', color: on ? T.ink : T.textSoft, cursor: 'pointer' }}>
                {f.label}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '8px 14px 80px' }}>
        {loading && <div style={{ textAlign: 'center', padding: '40px 0', color: T.textMute, fontSize: 13 }}>加载中…</div>}
        {!loading && filteredPending.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0 4px 6px' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: T.textSoft }}>本月待执行</span>
              <span style={{ fontSize: 11, color: T.textMute }}>{filteredPending.length} 项</span>
            </div>
            <Card pad={4} style={{ border: `1px dashed ${T.border}` }}>
              {filteredPending.map((rule, i) => (
                <div key={rule.id} style={{ padding: '0 8px', borderTop: i === 0 ? 'none' : `1px solid ${T.borderSoft}` }}>
                  <PendingRuleRow rule={rule} />
                </div>
              ))}
            </Card>
          </div>
        )}
        {!loading && ccPending.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0 4px 6px' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: T.warning }}>信用卡还款</span>
            </div>
            <Card pad={4} style={{ border: `1px dashed ${T.warningSoft}` }}>
              {ccPending.map((cc, i) => {
                const [y, m] = cc.settleMonth.split('-').map(Number);
                const monthLabel = `${m}月${cc.settlementDay}日`;
                return (
                  <div key={cc.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderTop: i === 0 ? 'none' : `1px solid ${T.borderSoft}` }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: T.warningSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: T.warning, flexShrink: 0, border: `1.5px dashed ${T.warning}40` }}>💳</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: T.ink }}>{cc.name} 还款</div>
                      <div style={{ fontSize: 11, color: T.textMute, marginTop: 2 }}>
                        <span style={{ background: T.warningSoft, color: T.warning, borderRadius: 4, padding: '1px 5px', fontWeight: 600, marginRight: 6 }}>待还</span>
                        {y !== new Date().getFullYear() || m !== new Date().getMonth() + 1
                          ? `${m}月` : ''}{monthLabel}还款
                      </div>
                    </div>
                    <Amount value={cc.amount} size={14} weight={600} color={T.warning} />
                  </div>
                );
              })}
            </Card>
          </div>
        )}
        {!loading && dates.length === 0 && filteredPending.length === 0 && ccPending.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: T.textMute, fontSize: 13 }}>暂无记录</div>
        )}
        {dates.map((d) => {
          const { md, wd } = fmtDay(d);
          const dayEx = byDate[d]
            .filter((t) => t.transactionType === 'expense')
            .reduce((acc, t) => acc + (t.currency === 'JPY' ? t.amount : 0), 0);
          return (
            <div key={d} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0 4px 6px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{md}</span>
                  <span style={{ fontSize: 11, color: T.textMute }}>{wd}</span>
                </div>
                {dayEx > 0 && <Amount value={dayEx} size={12} color={T.textSoft} weight={500} />}
              </div>
              <Card pad={4}>
                {byDate[d].map((tx, i) => (
                  <div key={tx.id} style={{ padding: '0 8px', borderTop: i === 0 ? 'none' : `1px solid ${T.borderSoft}`, background: tx.transactionType === 'transfer' ? `${T.transferSoft}40` : 'transparent' }}>
                    <ApiTxRow
                      tx={tx}
                      expanded={expanded === tx.id}
                      confirming={deleteConfirm === tx.id}
                      onTap={() => handleRowTap(tx.id)}
                      onEdit={() => setEditingTx(tx)}
                      onDelete={() => setDeleteConfirm(tx.id)}
                      onConfirmDelete={() => handleConfirmDelete(tx.id)}
                      onCancelDelete={() => setDeleteConfirm(null)}
                    />
                  </div>
                ))}
              </Card>
            </div>
          );
        })}
      </div>

      <BottomNav active="list" />
    </PhoneScreen>
  );
}
