'use client';

import { AppBar } from '@/components/layout/AppBar';
import { BottomNav } from '@/components/layout/BottomNav';
import { PhoneScreen } from '@/components/layout/PhoneScreen';
import { Amount } from '@/components/ui/Amount';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ReceiptThumb } from '@/components/ui/ReceiptThumb';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { useData } from '@/context/DataContext';
import { apiGet, apiPost } from '@/lib/api';
import { catDisplay } from '@/lib/catDisplay';
import { CN_FONT, NUM_FONT, T } from '@/lib/tokens';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

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

function ConfBadge({ v }: { v: number }) {
  const color = v >= 0.85 ? T.success : v >= 0.65 ? T.warning : T.danger;
  const soft  = v >= 0.85 ? T.successSoft : v >= 0.65 ? T.warningSoft : T.dangerSoft;
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 999, background: soft, color, fontSize: 10, fontWeight: 600, fontFamily: NUM_FONT }}>
      <span style={{ width: 4, height: 4, borderRadius: 2, background: color }} />
      {(v * 100).toFixed(0)}% 置信
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px', borderTop: `1px solid ${T.borderSoft}` }}>
      <div style={{ width: 44, fontSize: 11, color: T.textSoft, fontWeight: 500, flexShrink: 0 }}>{label}</div>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}

export default function AIConfirmPage() {
  const router = useRouter();
  const data = useData();

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [idx, setIdx] = useState(0);

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

  const c = candidates[idx];

  if (loading) {
    return (
      <PhoneScreen>
        <AppBar title="确认入账" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.textMute, fontSize: 13 }}>加载中…</div>
        <BottomNav />
      </PhoneScreen>
    );
  }

  if (!c) {
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

  const cat = data.category(c.suggestedCategoryId);
  const actor = data.actor(c.suggestedActorId);
  const { mark, tint } = catDisplay(cat?.name ?? '');
  const isIncome = c.suggestedTransactionType === 'income';

  async function handleConfirm() {
    if (acting) return;
    setActing(true);
    try {
      await apiPost(`/api/transaction-candidates/${c.id}/confirm`, {});
      const next = candidates.filter((_, i) => i !== idx);
      setCandidates(next);
      setIdx(Math.min(idx, next.length - 1));
      if (next.length === 0) router.push('/transactions');
    } catch (e) {
      console.error(e);
    } finally {
      setActing(false);
    }
  }

  async function handleReject() {
    if (acting) return;
    setActing(true);
    try {
      await apiPost(`/api/transaction-candidates/${c.id}/reject`, {});
      const next = candidates.filter((_, i) => i !== idx);
      setCandidates(next);
      setIdx(Math.min(idx, next.length - 1));
    } catch (e) {
      console.error(e);
    } finally {
      setActing(false);
    }
  }

  const total = candidates.length;

  return (
    <PhoneScreen>
      <AppBar
        title="确认入账"
        subtitle={`${idx + 1} / ${total} · AI 草稿，请核对后确认`}
        left={
          <Link href="/upload" style={{ textDecoration: 'none' }}>
            <div style={{ fontSize: 18, color: T.textSoft, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</div>
          </Link>
        }
        right={<ConfBadge v={c.confidence} />}
      />

      <div style={{ flex: 1, overflow: 'auto', padding: '8px 16px 80px' }}>
        {/* Summary card */}
        <div style={{ display: 'flex', gap: 12, padding: 14, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, marginBottom: 12, alignItems: 'center' }}>
          <ReceiptThumb w={60} h={80} label="" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: isIncome ? T.income : T.textMute, fontWeight: 600, marginBottom: 4 }}>
              {isIncome ? '入账' : '支出'} · {c.suggestedTransactionDate}
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: T.ink, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {c.merchantName || cat?.name || '—'}
            </div>
            <Amount value={c.suggestedAmount} size={22} weight={700} currency={c.suggestedCurrency as 'JPY' | 'CNY'} color={isIncome ? T.income : T.ink} sign={isIncome ? '+' : ''} />
          </div>
        </div>

        {/* User hint */}
        {c.aiUserNote && (
          <div style={{ padding: '8px 12px', marginBottom: 12, background: T.accentSoft, borderRadius: 10, fontSize: 11, color: T.ink, lineHeight: 1.5 }}>
            <span style={{ fontSize: 9, color: T.accent, fontWeight: 700, marginRight: 6 }}>你的提示</span>
            {c.aiUserNote}
          </div>
        )}

        <SectionLabel>AI 识别字段</SectionLabel>
        <Card pad={0} style={{ marginBottom: 14 }}>
          <div style={{ padding: '11px 12px' }}>
            <div style={{ fontSize: 11, color: T.textSoft, fontWeight: 500, marginBottom: 6 }}>分类</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: tint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, fontFamily: CN_FONT, color: T.ink }}>{mark}</div>
              <span style={{ fontSize: 14, fontWeight: 500, color: T.ink }}>{cat?.name ?? '—'}</span>
            </div>
          </div>

          <Row label="金额">
            <Amount value={c.suggestedAmount} size={16} weight={600} currency={c.suggestedCurrency as 'JPY' | 'CNY'} color={isIncome ? T.income : T.ink} />
          </Row>
          <Row label="日期">
            <span style={{ fontSize: 14, color: T.ink }}>{c.suggestedTransactionDate}</span>
          </Row>
          <Row label="币种">
            <span style={{ fontFamily: NUM_FONT, fontSize: 13, fontWeight: 600, color: T.ink }}>{c.suggestedCurrency}</span>
          </Row>
          {c.merchantName && (
            <Row label="店铺">
              <span style={{ fontSize: 13, color: T.ink }}>{c.merchantName}</span>
            </Row>
          )}
          {actor && (
            <Row label="角色">
              <span style={{ fontSize: 13, color: T.ink }}>{actor.displayName}</span>
            </Row>
          )}
        </Card>

        {/* Navigation between candidates */}
        {total > 1 && (
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 12 }}>
            {candidates.map((_, i) => (
              <div key={i} onClick={() => setIdx(i)} style={{ width: 8, height: 8, borderRadius: 4, background: i === idx ? T.accent : T.borderSoft, cursor: 'pointer', transition: 'background 0.15s' }} />
            ))}
          </div>
        )}
      </div>

      <div style={{ padding: '10px 16px 18px', borderTop: `1px solid ${T.borderSoft}`, background: 'rgba(251,248,242,0.96)', display: 'flex', gap: 8 }}>
        <Button variant="danger" size="lg" style={{ flex: 1 }} onClick={handleReject} disabled={acting}>拒绝</Button>
        <Button variant="success" size="lg" style={{ flex: 2 }} onClick={handleConfirm} disabled={acting}>
          {acting ? '处理中…' : '确认入账'}
        </Button>
      </div>

      <BottomNav />
    </PhoneScreen>
  );
}
