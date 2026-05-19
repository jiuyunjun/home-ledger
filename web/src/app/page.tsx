import { AppBar } from '@/components/layout/AppBar';
import { BottomNav } from '@/components/layout/BottomNav';
import { PhoneScreen } from '@/components/layout/PhoneScreen';
import { RoleSwitcher } from '@/components/layout/RoleSwitcher';
import { Amount } from '@/components/ui/Amount';
import { Card } from '@/components/ui/Card';
import { CatMark } from '@/components/ui/CatMark';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { TxRow } from '@/components/ui/TxRow';
import {
  ACCOUNTS, ACCT_KIND, BUDGETS, catById, catSummary, monthTotals, roleById, TX,
} from '@/lib/data';
import { T } from '@/lib/tokens';
import Link from 'next/link';

const ACTION_BTNS = [
  { label: '支出', glyph: '−', color: T.ink,      filled: true,  href: '/entry?mode=expense'  },
  { label: '入账', glyph: '+', color: T.income,   filled: false, href: '/entry?mode=income'   },
  { label: '转账', glyph: '⇄', color: T.transfer, filled: false, href: '/entry?mode=transfer' },
  { label: '小票', glyph: '↑', color: T.accent,   filled: false, href: '/upload'               },
];

export default function DashboardPage() {
  const m = monthTotals;
  const recent = TX.slice(0, 6);
  const topCats = catSummary.slice(0, 4);
  const catTotal = catSummary.reduce((a, b) => a + b.amount, 0);

  const budgetAlerts = BUDGETS.filter((b) => b.enabled).map((b) => {
    const pct = b.used / b.limit;
    return { ...b, pct, status: pct >= 1 ? 'over' : pct >= b.threshold ? 'near' : 'ok' };
  });
  const overOrNear = budgetAlerts.filter((b) => b.status !== 'ok');

  return (
    <PhoneScreen>
      <AppBar
        title="家计簿"
        subtitle="2026 年 5 月"
        left={
          <div style={{ width: 32, height: 32, borderRadius: 8, background: T.bgSubtle, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: T.textSoft, fontWeight: 600 }}>家</div>
        }
        right={
          <div style={{ width: 32, height: 32, borderRadius: 16, background: T.surface, border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: T.textSoft }}>≡</div>
        }
      />

      <div style={{ padding: '0 14px 6px' }}>
        <RoleSwitcher active="me" />
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '12px 14px 80px' }}>
        {/* Hero card */}
        <Card pad={14} style={{ background: `linear-gradient(155deg, #FFFFFF 0%, ${T.surfaceAlt} 100%)`, marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: T.textMute, letterSpacing: 0.4, marginBottom: 3 }}>本月总支出</div>
              <Amount value={m.expense} size={26} weight={600} color={T.ink} />
            </div>
            <div style={{ flex: 1, textAlign: 'right', borderLeft: `1px solid ${T.borderSoft}`, paddingLeft: 12 }}>
              <div style={{ fontSize: 10, color: T.textMute, letterSpacing: 0.4, marginBottom: 3 }}>本月入账</div>
              <Amount value={m.income} size={18} weight={600} color={T.income} sign="+" />
              <div style={{ fontSize: 10, color: T.textMute, marginTop: 4 }}>
                结余 <Amount value={m.income - m.expense} size={10} weight={600} color={T.income} sign="+" />
              </div>
            </div>
          </div>
          <div style={{ marginTop: 12, height: 5, background: T.bgSubtle, borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${((m.expense / m.budget) * 100).toFixed(0)}%`, height: '100%', background: T.accent }} />
          </div>
          <div style={{ marginTop: 6, fontSize: 10, color: T.textMute, display: 'flex', justifyContent: 'space-between' }}>
            <span>本月预算 {((m.expense / m.budget) * 100).toFixed(0)}%</span>
            <span>剩余 <Amount value={m.budget - m.expense} size={10} color={T.textSoft} /></span>
          </div>
        </Card>

        {/* Per-role mini cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
          {([['me', m.exMe], ['her', m.exHer], ['family', m.exFamily]] as const).map(([rid, v]) => {
            const r = roleById(rid);
            return (
              <div key={rid} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: '10px 10px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 3, background: r.color }} />
                  <span style={{ fontSize: 11, color: T.textSoft, fontWeight: 500 }}>{r.name}</span>
                </div>
                <Amount value={v} size={15} weight={600} color={T.ink} />
                <div style={{ fontSize: 9, color: T.textMute, marginTop: 2 }}>{((v / m.expense) * 100).toFixed(0)}% 占比</div>
              </div>
            );
          })}
        </div>

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
        <SectionLabel right={<Link href="/settings" style={{ color: T.textMute, textDecoration: 'none' }}>管理 →</Link>}>账户余额</SectionLabel>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '2px 0 10px', marginBottom: 4 }}>
          {ACCOUNTS.filter((a) => a.kind !== 'card').slice(0, 5).map((a) => (
            <div key={a.id} style={{ flex: '0 0 auto', minWidth: 124, background: a.currency === 'CNY' ? '#FAF4EE' : T.surface, border: `1px solid ${a.currency === 'CNY' ? '#E8D9C5' : T.border}`, borderRadius: 12, padding: '10px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                <span style={{ width: 5, height: 5, borderRadius: 1, background: ACCT_KIND[a.kind].color }} />
                <span style={{ fontSize: 10, color: T.textSoft, fontWeight: 500, whiteSpace: 'nowrap' }}>{a.name}</span>
                {a.currency !== 'JPY' && (
                  <span style={{ marginLeft: 'auto', fontSize: 8, background: T.warningSoft, color: T.warning, padding: '1px 4px', borderRadius: 3, fontWeight: 700 }}>{a.currency}</span>
                )}
              </div>
              <Amount value={a.balance ?? 0} size={14} weight={600} currency={a.currency} showCurrency={false} />
            </div>
          ))}
        </div>

        {/* Budget alerts */}
        {overOrNear.length > 0 && (
          <>
            <SectionLabel right={`${overOrNear.length} 项需关注`}>预算预警</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
              {overOrNear.map((b) => {
                const c = catById(b.cat);
                const over = b.status === 'over';
                const accent = over ? T.danger : T.warning;
                const accentSoft = over ? T.dangerSoft : T.warningSoft;
                return (
                  <div key={b.id} style={{ background: T.surface, border: `1px solid ${accent}30`, borderRadius: 10, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <CatMark cat={c} size={26} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <span style={{ fontSize: 12, color: T.ink, fontWeight: 500 }}>
                          {c.name}
                          {b.role !== 'all' && <span style={{ fontSize: 10, color: T.textMute, marginLeft: 4 }}>· {roleById(b.role).name}</span>}
                        </span>
                        <span style={{ fontSize: 10, color: accent, fontWeight: 600 }}>{over ? '超出 ' : '已用 '}{Math.round(b.pct * 100)}%</span>
                      </div>
                      <div style={{ marginTop: 4, height: 4, background: accentSoft, borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(100, b.pct * 100)}%`, height: '100%', background: accent }} />
                      </div>
                      <div style={{ marginTop: 4, fontSize: 10, color: T.textMute, display: 'flex', justifyContent: 'space-between' }}>
                        <Amount value={b.used} size={10} color={T.textSoft} />
                        <span>预算 <Amount value={b.limit} size={10} color={T.textSoft} /></span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Category breakdown */}
        <SectionLabel right="本月">分类支出</SectionLabel>
        <Card pad={12} style={{ marginBottom: 14 }}>
          {topCats.map((row, i) => {
            const c = catById(row.cat);
            const pct = (row.amount / catTotal) * 100;
            return (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderTop: i === 0 ? 'none' : `1px solid ${T.borderSoft}` }}>
                <CatMark cat={c} size={26} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: 13, color: T.ink }}>{c.name}</span>
                    <Amount value={row.amount} size={13} weight={500} />
                  </div>
                  <div style={{ marginTop: 4, height: 3, background: T.bgSubtle, borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: c.tint, borderRadius: 2 }} />
                  </div>
                </div>
              </div>
            );
          })}
        </Card>

        {/* Recent transactions */}
        <SectionLabel right={<Link href="/transactions" style={{ color: T.textMute, textDecoration: 'none' }}>查看全部 →</Link>}>最近</SectionLabel>
        <Card pad={4}>
          {recent.map((tx, i) => (
            <div key={tx.id} style={{ borderTop: i === 0 ? 'none' : `1px solid ${T.borderSoft}`, padding: '0 8px' }}>
              <TxRow tx={tx} showDate />
            </div>
          ))}
        </Card>
      </div>

      <BottomNav active="home" />
    </PhoneScreen>
  );
}
