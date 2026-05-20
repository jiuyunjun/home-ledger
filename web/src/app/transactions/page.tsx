'use client';

import { AppBar } from '@/components/layout/AppBar';
import { BottomNav } from '@/components/layout/BottomNav';
import { PhoneScreen } from '@/components/layout/PhoneScreen';
import { Amount } from '@/components/ui/Amount';
import { Card } from '@/components/ui/Card';
import { useApp } from '@/context/AppContext';
import { useData } from '@/context/DataContext';
import { apiDelete, apiGet, apiGetBlob, apiPatch, apiPost } from '@/lib/api';
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

function PendingRuleRow({ rule, expanded, executing, onTap, onExecute, onCancel, onConfirmExecute }: {
  rule: PendingRule;
  expanded: boolean;
  executing: boolean;
  onTap: () => void;
  onExecute: () => void;
  onCancel: () => void;
  onConfirmExecute: () => void;
}) {
  const data = useData();
  const cat = data.category(rule.categoryId ?? '');
  const pm = data.paymentMethod(rule.paymentMethodId ?? '');
  const { mark, tint } = catDisplay(cat?.name ?? '');
  const isIncome = rule.transactionType === 'income';
  const dayNum = rule.dayOfMonth;
  return (
    <div>
      <div onClick={onTap} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 4px', cursor: 'pointer' }}>
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
        <span style={{ fontSize: 11, color: T.textDim, marginLeft: 6 }}>{expanded ? '∨' : '›'}</span>
      </div>
      {expanded && (
        <div style={{ padding: '0 4px 10px', display: 'flex', gap: 8 }}>
          {!executing ? (
            <button onClick={(e) => { e.stopPropagation(); onExecute(); }}
              style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: `1px solid ${T.accent}`, background: T.accentSoft, fontSize: 12, color: T.accent, cursor: 'pointer', fontWeight: 600 }}>
              提前执行
            </button>
          ) : (
            <>
              <button onClick={(e) => { e.stopPropagation(); onCancel(); }}
                style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface, fontSize: 12, color: T.textSoft, cursor: 'pointer' }}>
                取消
              </button>
              <button onClick={(e) => { e.stopPropagation(); onConfirmExecute(); }}
                style={{ flex: 2, padding: '7px 0', borderRadius: 8, border: 'none', background: T.accent, fontSize: 12, color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
                确认：{isIncome ? '+' : ''}¥{rule.amount.toLocaleString()} 记今日
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

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

const TYPE_FILTERS = [
  { id: 'all',      label: '全部' },
  { id: 'expense',  label: '支出' },
  { id: 'income',   label: '入账' },
  { id: 'transfer', label: '转账' },
];

type TxTypeFilter = 'all' | 'expense' | 'income' | 'transfer';
type SortBy = 'time-desc' | 'time-asc' | 'amount-desc' | 'amount-asc';

const SORT_LABELS: Record<SortBy, string> = {
  'time-desc': '时间 ↓',
  'time-asc': '时间 ↑',
  'amount-desc': '金额 ↓',
  'amount-asc': '金额 ↑',
};
const SORT_ORDER: SortBy[] = ['time-desc', 'time-asc', 'amount-desc', 'amount-asc'];

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
  onSave: (patch: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
}) {
  const data = useData();
  const isTransfer = tx.transactionType === 'transfer';
  const [title, setTitle] = useState(tx.title ?? '');
  const [merchantName, setMerchantName] = useState(tx.merchantName ?? '');
  const [date, setDate] = useState(tx.transactionDate);
  const [memo, setMemo] = useState(tx.memo ?? '');
  const [categoryId, setCategoryId] = useState(tx.categoryId ?? '');
  const [amountStr, setAmountStr] = useState(String(tx.amount));
  const [fromPmId, setFromPmId] = useState(tx.fromAccountId ?? '');
  const [toPmId, setToPmId] = useState(tx.toAccountId ?? '');
  const [showCatPicker, setShowCatPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [receiptExpanded, setReceiptExpanded] = useState(false);
  const [receiptLoading, setReceiptLoading] = useState(!!tx.receiptId);

  useEffect(() => {
    if (!tx.receiptId) return;
    setReceiptLoading(true);
    apiGetBlob(`/api/receipts/${tx.receiptId}/image`)
      .then((url) => { setReceiptUrl(url); setReceiptLoading(false); })
      .catch(() => setReceiptLoading(false));
  }, [tx.receiptId]);

  const cat = data.category(categoryId);
  const { mark, tint } = catDisplay(cat?.name ?? '');
  const activePms = data.paymentMethods.filter((p) => p.isActive);

  async function handleSave() {
    setSaving(true);
    const patch: Record<string, unknown> = {};
    if (date !== tx.transactionDate) patch.transactionDate = date;
    if (memo !== (tx.memo ?? '')) patch.memo = memo;
    if (isTransfer) {
      const amt = Math.round(parseFloat(amountStr) || 0);
      if (amt > 0 && amt !== tx.amount) patch.amount = amt;
      if (fromPmId && fromPmId !== (tx.fromAccountId ?? '')) patch.fromAccountId = fromPmId;
      if (toPmId && toPmId !== (tx.toAccountId ?? '')) patch.toAccountId = toPmId;
    } else {
      if (title !== (tx.title ?? '')) patch.title = title;
      if (merchantName !== (tx.merchantName ?? '')) patch.merchantName = merchantName;
      if (categoryId !== (tx.categoryId ?? '')) patch.categoryId = categoryId;
    }
    try {
      await onSave(patch);
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = { padding: '10px 12px', borderRadius: 10, border: `1px solid ${T.border}`, fontSize: 14, color: T.ink, outline: 'none', background: T.surfaceAlt } as const;

  return (
    <>
      {showCatPicker && (
        <CategoryPicker currentId={categoryId} onSelect={setCategoryId} onClose={() => setShowCatPicker(false)} />
      )}
      <Backdrop onClose={onClose} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 99, background: T.surface, borderRadius: '16px 16px 0 0', padding: '16px 16px 36px', boxShadow: '0 -4px 24px rgba(0,0,0,0.14)' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.ink, textAlign: 'center', marginBottom: 18 }}>编辑记录</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {isTransfer ? (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, color: T.textSoft, fontWeight: 500 }}>转出账户</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {activePms.map((pm) => (
                    <div key={pm.id} onClick={() => setFromPmId(pm.id)}
                      style={{ padding: '6px 12px', borderRadius: 999, fontSize: 12, cursor: 'pointer', background: fromPmId === pm.id ? T.ink : T.surfaceAlt, color: fromPmId === pm.id ? '#fff' : T.ink, border: `1px solid ${fromPmId === pm.id ? T.ink : T.border}` }}>
                      {pm.name}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, color: T.textSoft, fontWeight: 500 }}>转入账户</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {activePms.map((pm) => (
                    <div key={pm.id} onClick={() => setToPmId(pm.id)}
                      style={{ padding: '6px 12px', borderRadius: 999, fontSize: 12, cursor: 'pointer', background: toPmId === pm.id ? T.transfer : T.surfaceAlt, color: toPmId === pm.id ? '#fff' : T.ink, border: `1px solid ${toPmId === pm.id ? T.transfer : T.border}` }}>
                      {pm.name}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, color: T.textSoft, fontWeight: 500 }}>金额</label>
                <input type="text" inputMode="decimal" value={amountStr}
                  onChange={e => setAmountStr(e.target.value.replace(/[^\d.]/g, ''))}
                  style={{ ...inputStyle, fontFamily: NUM_FONT, fontSize: 18, fontWeight: 600 }} />
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, color: T.textSoft, fontWeight: 500 }}>店铺名称</label>
                <input value={merchantName} onChange={e => setMerchantName(e.target.value)}
                  placeholder="店铺 / 来源（可选）" style={inputStyle} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, color: T.textSoft, fontWeight: 500 }}>品目名称</label>
                <input value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="可为空（使用分类名）" style={inputStyle} />
              </div>
            </>
          )}
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
          {tx.receiptId && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, color: T.textSoft, fontWeight: 500 }}>小票图片</label>
              {receiptLoading ? (
                <div style={{ height: 120, borderRadius: 10, border: `1px solid ${T.border}`, background: 'linear-gradient(90deg,#f0ece6 25%,#e8e2da 50%,#f0ece6 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 12, color: T.textMute }}>小票加载中…</span>
                </div>
              ) : receiptUrl ? (
                <>
                  <div onClick={() => setReceiptExpanded((v) => !v)} style={{ cursor: 'pointer', borderRadius: 10, overflow: 'hidden', border: `1px solid ${T.border}` }}>
                    <img src={receiptUrl} alt="小票" style={{ width: '100%', display: 'block', maxHeight: receiptExpanded ? 'none' : 120, objectFit: receiptExpanded ? 'contain' : 'cover', objectPosition: 'top' }} />
                  </div>
                  <div style={{ fontSize: 10, color: T.textMute, textAlign: 'center' }}>{receiptExpanded ? '点击收起' : '点击查看完整小票'}</div>
                </>
              ) : (
                <div style={{ height: 60, borderRadius: 10, border: `1px dashed ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 12, color: T.textMute }}>小票加载失败</span>
                </div>
              )}
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
  const [month, setMonth] = useState(todayMonth);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TxTypeFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('time-desc');
  const [filterPmIds, setFilterPmIds] = useState<string[]>([]);
  const [filterActorIds, setFilterActorIds] = useState<string[]>([]);
  const [txs, setTxs] = useState<ApiTransaction[]>([]);
  const [pendingRules, setPendingRules] = useState<PendingRule[]>([]);
  const [pmBalances, setPmBalances] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [ccExpanded, setCcExpanded] = useState<string | null>(null);
  const [ccExecuting, setCcExecuting] = useState<string | null>(null);
  const [ruleExpanded, setRuleExpanded] = useState<string | null>(null);
  const [ruleExecuting, setRuleExecuting] = useState<string | null>(null);

  const [expanded, setExpanded] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editingTx, setEditingTx] = useState<ApiTransaction | null>(null);

  const currentMonth = todayMonth();

  async function loadTxs() {
    setLoading(true);
    const params = new URLSearchParams({ month });
    if (state.currentRole) params.set('actorId', state.currentRole);
    try {
      const [txData, balances] = await Promise.all([
        apiGet<ApiTransaction[]>(`/api/transactions?${params}`),
        apiGet<Record<string, number>>('/api/payment-methods/balances'),
      ] as const);
      setTxs(txData);
      setPmBalances(balances);

      if (month === currentMonth) {
        const rules = await apiGet<PendingRule[]>('/api/recurring-rules');
        const todayDayOfMonth = new Date().getDate();
        setPendingRules(
          rules.filter((r) => r.isActive && r.dayOfMonth >= todayDayOfMonth)
            .sort((a, b) => a.dayOfMonth - b.dayOfMonth)
        );
      } else {
        setPendingRules([]);
      }
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

  async function handleExecuteCC(cc: { id: string; name: string; amount: number; debitPmId: string; settleDate: string }) {
    try {
      await apiPost('/api/transactions', {
        transactionType: 'transfer',
        fromAccountId: cc.debitPmId,
        toAccountId: cc.id,
        amount: cc.amount,
        currency: 'JPY',
        transactionDate: cc.settleDate,
        title: `${cc.name} 还款`,
      });
      setCcExecuting(null);
      await loadTxs();
    } catch (e) {
      console.error(e);
    }
  }

  async function handleExecuteRule(rule: PendingRule) {
    const today = new Date().toISOString().slice(0, 10);
    try {
      await apiPost('/api/transactions', {
        transactionType: rule.transactionType,
        transactionDate: today,
        amount: rule.amount,
        currency: rule.currency,
        categoryId: rule.categoryId,
        paymentMethodId: rule.paymentMethodId,
        title: rule.title,
      });
      setRuleExpanded(null);
      setRuleExecuting(null);
      await loadTxs();
    } catch (e) {
      console.error(e);
    }
  }

  function handleRowTap(txId: string) {
    if (expanded === txId) {
      setExpanded(null);
      setDeleteConfirm(null);
    } else {
      setExpanded(txId);
      setDeleteConfirm(null);
    }
  }

  async function handleSaveEdit(patch: Record<string, unknown>) {
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

  function togglePmFilter(pmId: string) {
    setFilterPmIds((prev) =>
      prev.includes(pmId) ? prev.filter((id) => id !== pmId) : [...prev, pmId]
    );
  }

  function toggleActorFilter(actorId: string) {
    setFilterActorIds((prev) =>
      prev.includes(actorId) ? prev.filter((id) => id !== actorId) : [...prev, actorId]
    );
  }

  function cycleSortBy() {
    setSortBy((prev) => {
      const idx = SORT_ORDER.indexOf(prev);
      return SORT_ORDER[(idx + 1) % SORT_ORDER.length];
    });
  }

  const q = searchQuery.trim().toLowerCase();

  const filtered = txs.filter((t) => {
    if (typeFilter !== 'all' && t.transactionType !== typeFilter) return false;
    if (filterPmIds.length > 0) {
      if (t.transactionType === 'transfer') {
        if (!filterPmIds.includes(t.fromAccountId ?? '') && !filterPmIds.includes(t.toAccountId ?? '')) return false;
      } else {
        if (!filterPmIds.includes(t.paymentMethodId ?? '')) return false;
      }
    }
    if (filterActorIds.length > 0 && !filterActorIds.includes(t.actorId)) return false;
    if (q) {
      const hay = [t.title, t.merchantName, t.memo].filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const filteredPending = typeFilter === 'transfer' ? [] : pendingRules.filter((r) =>
    typeFilter === 'all' || r.transactionType === typeFilter
  );

  // Credit card pending payments scoped to the currently viewed month
  const todayDay = new Date().getDate();
  const ccPending = (typeFilter === 'all' || typeFilter === 'expense')
    ? data.paymentMethods
        .filter((p) => p.type === 'credit_card' && p.isActive && p.settlementDay && (pmBalances[p.id] ?? 0) < 0)
        .map((p) => {
          const bd = p.billingDay || 31;
          const sd = p.settlementDay!;
          const d = new Date();
          const td = d.getDate();
          let sy = d.getFullYear(), sm = d.getMonth() + 1;
          if (td <= bd) {
            // billing period still open this month → settlement is next month
            sm++; if (sm > 12) { sm = 1; sy++; }
          } else {
            // billing period closed → settlement this month (if sd >= td) or next month
            if (sd < td) { sm++; if (sm > 12) { sm = 1; sy++; } }
          }
          const settleMonth = `${sy}-${String(sm).padStart(2, '0')}`;
          const settleDate = `${sy}-${String(sm).padStart(2, '0')}-${String(sd).padStart(2, '0')}`;
          return { id: p.id, name: p.name, amount: Math.abs(pmBalances[p.id]!), settlementDay: sd, settleMonth, settleDate, debitPmId: p.debitPmId ?? '' };
        })
        .filter((cc) => cc.settleMonth === month)
    : [];

  const isAmountSort = sortBy === 'amount-desc' || sortBy === 'amount-asc';

  // Apply sort
  let sortedFiltered = [...filtered];
  if (sortBy === 'amount-desc') {
    sortedFiltered.sort((a, b) => b.amount - a.amount);
  } else if (sortBy === 'amount-asc') {
    sortedFiltered.sort((a, b) => a.amount - b.amount);
  }

  // Build date-grouped structure for time sort
  const byDate: Record<string, ApiTransaction[]> = {};
  if (!isAmountSort) {
    sortedFiltered.forEach((t) => { (byDate[t.transactionDate] ??= []).push(t); });
    Object.values(byDate).forEach((list) =>
      list.sort((a, b) =>
        sortBy === 'time-asc'
          ? a.createdAt.localeCompare(b.createdAt)
          : b.createdAt.localeCompare(a.createdAt)
      )
    );
  }
  const dates = isAmountSort
    ? []
    : Object.keys(byDate).sort(
        sortBy === 'time-asc' ? (a, b) => a.localeCompare(b) : (a, b) => b.localeCompare(a)
      );

  const activePms = data.paymentMethods.filter((p) => p.isActive);
  const hasFilters = filterPmIds.length > 0 || filterActorIds.length > 0 || sortBy !== 'time-desc';

  const monthlyExpense = txs.filter(t => t.transactionType === 'expense' && t.currency === 'JPY').reduce((s, t) => s + t.amount, 0);
  const monthlyIncome = txs.filter(t => t.transactionType === 'income' && t.currency === 'JPY').reduce((s, t) => s + t.amount, 0);

  return (
    <PhoneScreen>
      {editingTx && (
        <EditSheet tx={editingTx} onSave={handleSaveEdit} onClose={() => setEditingTx(null)} />
      )}

      <AppBar
        title="明细"
        subtitle={fmtMonth(month)}
        left={
          <div onClick={() => setMonth((m) => addMonths(m, -1))}
            style={{ fontSize: 20, color: T.textSoft, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>‹</div>
        }
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {month !== currentMonth && (
              <div onClick={() => setMonth(currentMonth)}
                style={{ fontSize: 11, color: T.accent, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: T.accentSoft, cursor: 'pointer' }}>本月</div>
            )}
            <div onClick={() => setMonth((m) => addMonths(m, 1))}
              style={{ fontSize: 20, color: month === currentMonth ? T.textDim : T.textSoft, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: month === currentMonth ? 'default' : 'pointer' }}>›</div>
          </div>
        }
      />

      {!loading && (monthlyExpense > 0 || monthlyIncome > 0) && (
        <div style={{ display: 'flex', gap: 16, padding: '6px 18px 2px', justifyContent: 'flex-end' }}>
          {monthlyExpense > 0 && (
            <span style={{ fontSize: 11, color: T.textSoft }}>
              支出 <span style={{ fontFamily: NUM_FONT, fontWeight: 600, color: T.ink }}>¥{monthlyExpense.toLocaleString()}</span>
            </span>
          )}
          {monthlyIncome > 0 && (
            <span style={{ fontSize: 11, color: T.textSoft }}>
              入账 <span style={{ fontFamily: NUM_FONT, fontWeight: 600, color: T.income }}>+¥{monthlyIncome.toLocaleString()}</span>
            </span>
          )}
        </div>
      )}

      <div style={{ padding: '0 14px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: T.surface, border: `1px solid ${q ? T.accent : T.border}`, borderRadius: 10 }}>
          <span style={{ color: T.textMute, fontSize: 13 }}>⌕</span>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索店铺名称、品目或备注"
            style={{ flex: 1, fontSize: 13, color: T.ink, border: 'none', outline: 'none', background: 'transparent', padding: 0 }}
          />
          {q && (
            <span onClick={() => setSearchQuery('')}
              style={{ fontSize: 16, color: T.textDim, cursor: 'pointer', lineHeight: 1, padding: '0 2px' }}>×</span>
          )}
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
        {/* Sort and filter chips */}
        <div style={{ display: 'flex', gap: 6, marginTop: 8, overflowX: 'auto', paddingBottom: 2 }}>
          <div onClick={cycleSortBy} style={{
            display: 'flex', alignItems: 'center', gap: 3,
            padding: '4px 10px', borderRadius: 20, flexShrink: 0,
            background: sortBy !== 'time-desc' ? T.accentSoft : T.bgSubtle,
            color: sortBy !== 'time-desc' ? T.accent : T.textSoft,
            border: sortBy !== 'time-desc' ? `1px solid ${T.accent}40` : `1px solid transparent`,
            fontSize: 11, fontWeight: 500, cursor: 'pointer',
          }}>
            {SORT_LABELS[sortBy]}
          </div>
          {activePms.map((pm) => {
            const on = filterPmIds.includes(pm.id);
            return (
              <div key={pm.id} onClick={() => togglePmFilter(pm.id)} style={{
                padding: '4px 10px', borderRadius: 20, flexShrink: 0,
                background: on ? T.accentSoft : T.bgSubtle,
                color: on ? T.accent : T.textSoft,
                border: on ? `1px solid ${T.accent}40` : `1px solid transparent`,
                fontSize: 11, fontWeight: 500, cursor: 'pointer',
              }}>
                {pm.name}
              </div>
            );
          })}
          {data.actors.map((actor) => {
            const on = filterActorIds.includes(actor.id);
            return (
              <div key={actor.id} onClick={() => toggleActorFilter(actor.id)} style={{
                padding: '4px 10px', borderRadius: 20, flexShrink: 0,
                background: on ? T.accentSoft : T.bgSubtle,
                color: on ? T.accent : T.textSoft,
                border: on ? `1px solid ${T.accent}40` : `1px solid transparent`,
                fontSize: 11, fontWeight: 500, cursor: 'pointer',
              }}>
                {actor.displayName}
              </div>
            );
          })}
          {hasFilters && (
            <div onClick={() => { setSortBy('time-desc'); setFilterPmIds([]); setFilterActorIds([]); }} style={{
              padding: '4px 10px', borderRadius: 20, flexShrink: 0,
              background: T.dangerSoft, color: T.danger,
              border: `1px solid transparent`,
              fontSize: 11, fontWeight: 500, cursor: 'pointer',
            }}>
              重置
            </div>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '8px 14px 80px' }}>
        {loading && <div style={{ textAlign: 'center', padding: '40px 0', color: T.textMute, fontSize: 13 }}>加载中…</div>}
        {!loading && q && (
          <div style={{ padding: '0 4px 8px', fontSize: 12, color: T.textMute }}>
            找到 {filtered.length} 条记录
          </div>
        )}
        {!loading && !q && filteredPending.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0 4px 6px' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: T.textSoft }}>本月待执行</span>
              <span style={{ fontSize: 11, color: T.textMute }}>{filteredPending.length} 项</span>
            </div>
            <Card pad={4} style={{ border: `1px dashed ${T.border}` }}>
              {filteredPending.map((rule, i) => (
                <div key={rule.id} style={{ padding: '0 8px', borderTop: i === 0 ? 'none' : `1px solid ${T.borderSoft}` }}>
                  <PendingRuleRow
                    rule={rule}
                    expanded={ruleExpanded === rule.id}
                    executing={ruleExecuting === rule.id}
                    onTap={() => { setRuleExpanded(ruleExpanded === rule.id ? null : rule.id); setRuleExecuting(null); }}
                    onExecute={() => setRuleExecuting(rule.id)}
                    onCancel={() => setRuleExecuting(null)}
                    onConfirmExecute={() => handleExecuteRule(rule)}
                  />
                </div>
              ))}
            </Card>
          </div>
        )}
        {!loading && !q && ccPending.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ padding: '0 4px 6px' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: T.warning }}>信用卡待还款</span>
            </div>
            <Card pad={0} style={{ border: `1px dashed ${T.warning}50` }}>
              {ccPending.map((cc, i) => {
                const [, sm] = cc.settleMonth.split('-').map(Number);
                const debitPm = cc.debitPmId ? data.paymentMethod(cc.debitPmId) : null;
                const isExpanded = ccExpanded === cc.id;
                const isExec = ccExecuting === cc.id;
                return (
                  <div key={cc.id} style={{ borderTop: i === 0 ? 'none' : `1px solid ${T.borderSoft}` }}>
                    <div onClick={() => { setCcExpanded(isExpanded ? null : cc.id); setCcExecuting(null); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', cursor: 'pointer' }}>
                      <div style={{ width: 34, height: 34, borderRadius: 10, background: T.warningSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>💳</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: T.ink }}>{cc.name} 还款</div>
                        <div style={{ fontSize: 11, color: T.textMute, marginTop: 2 }}>
                          <span style={{ background: T.warningSoft, color: T.warning, borderRadius: 4, padding: '1px 5px', fontWeight: 600, marginRight: 4 }}>待还</span>
                          {sm}月{cc.settlementDay}日
                          {debitPm && <span style={{ marginLeft: 4 }}>· 从 {debitPm.name}</span>}
                        </div>
                      </div>
                      <Amount value={cc.amount} size={14} weight={600} color={T.warning} />
                      <span style={{ fontSize: 11, color: T.textDim, marginLeft: 4 }}>{isExpanded ? '∨' : '›'}</span>
                    </div>
                    {isExpanded && cc.debitPmId && (
                      <div style={{ padding: '0 12px 10px', display: 'flex', gap: 8 }}>
                        {!isExec ? (
                          <button onClick={(e) => { e.stopPropagation(); setCcExecuting(cc.id); }}
                            style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: `1px solid ${T.warning}`, background: T.warningSoft, fontSize: 12, color: T.warning, cursor: 'pointer', fontWeight: 600 }}>
                            执行还款
                          </button>
                        ) : (
                          <>
                            <button onClick={(e) => { e.stopPropagation(); setCcExecuting(null); }}
                              style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface, fontSize: 12, color: T.textSoft, cursor: 'pointer' }}>
                              取消
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleExecuteCC(cc); }}
                              style={{ flex: 2, padding: '7px 0', borderRadius: 8, border: 'none', background: T.warning, fontSize: 12, color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
                              确认：从 {debitPm?.name} 转 ¥{cc.amount.toLocaleString()}
                            </button>
                          </>
                        )}
                      </div>
                    )}
                    {isExpanded && !cc.debitPmId && (
                      <div style={{ padding: '0 12px 10px', fontSize: 11, color: T.textMute }}>在设置页配置"扣款账户"后可一键执行还款</div>
                    )}
                  </div>
                );
              })}
            </Card>
          </div>
        )}
        {!loading && sortedFiltered.length === 0 && (q || (filteredPending.length === 0 && ccPending.length === 0)) && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: T.textMute, fontSize: 13 }}>
            {q ? '没有匹配的记录' : month === currentMonth ? '暂无记录' : '该月暂无记录'}
          </div>
        )}

        {/* Search or amount sort: flat list */}
        {!loading && (q || isAmountSort) && sortedFiltered.length > 0 && (
          <Card pad={4}>
            {sortedFiltered.map((tx, i) => (
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
        )}

        {/* Time sort: date-grouped */}
        {!loading && !q && !isAmountSort && dates.map((d) => {
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
