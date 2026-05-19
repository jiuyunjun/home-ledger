import { AppBar } from '@/components/layout/AppBar';
import { BottomNav } from '@/components/layout/BottomNav';
import { PhoneScreen } from '@/components/layout/PhoneScreen';
import { AccountChip } from '@/components/ui/AccountChip';
import { Amount } from '@/components/ui/Amount';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CatMark } from '@/components/ui/CatMark';
import { ReceiptThumb } from '@/components/ui/ReceiptThumb';
import { RolePill } from '@/components/ui/RolePill';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { TypeBadge } from '@/components/ui/TypeBadge';
import { acctById, catById, CURRENCIES, fmtAmount, LineItem, RECEIPT_DRAFTS, roleById } from '@/lib/data';
import { NUM_FONT, T } from '@/lib/tokens';
import Link from 'next/link';

function ConfBadge({ v }: { v: number }) {
  const color = v >= 0.9 ? T.success : v >= 0.7 ? T.warning : T.danger;
  const soft  = v >= 0.9 ? T.successSoft : v >= 0.7 ? T.warningSoft : T.dangerSoft;
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 999, background: soft, color, fontSize: 10, fontWeight: 600, fontFamily: NUM_FONT }}>
      <span style={{ width: 4, height: 4, borderRadius: 2, background: color }} />
      {(v * 100).toFixed(0)}%
    </div>
  );
}

function ConfRow({ label, conf, warn, children, first }: { label: string; conf: number; warn?: boolean; children: React.ReactNode; first?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 10px', borderTop: first ? 'none' : `1px solid ${T.borderSoft}`, background: warn ? `${T.warningSoft}66` : 'transparent' }}>
      <div style={{ width: 40, fontSize: 11, color: T.textSoft, fontWeight: 500 }}>{label}</div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center' }}>{children}</div>
      <ConfBadge v={conf} />
      <span style={{ color: T.textDim, fontSize: 12, marginLeft: 4 }}>›</span>
    </div>
  );
}

function ItemRow({ it, first, currency }: { it: LineItem; first: boolean; currency: string }) {
  const c = catById(it.cat);
  const excluded = !it.include;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderTop: first ? 'none' : `1px solid ${T.borderSoft}`, background: it.warn ? `${T.warningSoft}55` : 'transparent', opacity: excluded ? 0.4 : 1 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, position: 'relative', flexShrink: 0 }}>
        <CatMark cat={c} size={30} />
        <div style={{ fontSize: 9, color: T.textSoft, fontWeight: 500 }}>{c.name}</div>
        {it.warn && (
          <div style={{ position: 'absolute', top: -3, right: -5, width: 14, height: 14, borderRadius: 7, background: T.warning, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, border: '1.5px solid #fff' }}>!</div>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: T.ink, fontWeight: 500, textDecoration: excluded ? 'line-through' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontStyle: it.isAdjust ? 'italic' : 'normal' }}>{it.name}</div>
        <div style={{ marginTop: 3, display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: T.textMute }}>
          <ConfBadge v={it.conf} />
          {it.warn && <span style={{ color: T.warning, fontWeight: 500 }}>建议核对</span>}
          {it.isAdjust && <span>合并到上一项</span>}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
        <Amount value={it.price} size={14} weight={600} currency={currency} showCurrency={false} color={it.price < 0 ? T.success : T.ink} />
        <div style={{ fontSize: 10, color: T.textMute }}>
          {excluded ? <span style={{ color: T.danger }}>已排除</span> : <span>编辑 ›</span>}
        </div>
      </div>
    </div>
  );
}

export default function AIConfirmPage() {
  const d = RECEIPT_DRAFTS[0];
  const r = roleById(d.fields.role.value);
  const a = acctById(d.fields.acct.value);
  const txType = d.fields.type.value;
  const cc = d.fields.currency.value;

  const includedItems = d.items.filter((it) => it.include);
  const total = includedItems.reduce((acc, it) => acc + it.price, 0);
  const lowConfCount = includedItems.filter((it) => it.warn).length;

  const byCat: Record<string, number> = {};
  includedItems.forEach((it) => { byCat[it.cat] = (byCat[it.cat] ?? 0) + it.price; });
  const catDist = Object.entries(byCat)
    .map(([cid, amt]) => ({ cat: catById(cid), amount: amt }))
    .sort((a, b) => b.amount - a.amount);

  return (
    <PhoneScreen>
      <AppBar
        title="确认入账"
        subtitle="1 / 1 · 每项 AI 已分类，请核对"
        left={
          <Link href="/upload" style={{ textDecoration: 'none' }}>
            <div style={{ fontSize: 18, color: T.textSoft, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</div>
          </Link>
        }
        right={<div style={{ fontSize: 12, color: T.textMute }}>1/1</div>}
      />

      <div style={{ flex: 1, overflow: 'auto', padding: '4px 16px 80px' }}>
        {/* Receipt preview */}
        <div style={{ display: 'flex', gap: 12, padding: 12, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, marginBottom: 10 }}>
          <ReceiptThumb w={72} h={100} label="" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 5, flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 999, background: T.warningSoft, color: T.warning, fontSize: 10, fontWeight: 600 }}>
                <span style={{ width: 4, height: 4, borderRadius: 2, background: T.warning }} />
                待确认 · AI 草稿
              </span>
              <TypeBadge type={txType} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.fields.title.value}</div>
            <div style={{ fontSize: 10, color: T.textMute, marginBottom: 5 }}>{d.fields.date.value} · 共 {includedItems.length} 项</div>
            <Amount value={total} size={20} weight={600} color={T.ink} currency={cc} />
            <div style={{ marginTop: 4, fontSize: 10, color: T.textSoft }}>查看原图 <span style={{ color: T.textDim }}>›</span></div>
          </div>
        </div>

        {/* User hint card */}
        {d.userHint && (
          <div style={{ padding: 10, marginBottom: 12, background: T.accentSoft, borderRadius: 10, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <div style={{ width: 20, height: 20, borderRadius: 10, flexShrink: 0, background: T.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>i</div>
            <div style={{ flex: 1, fontSize: 11, color: T.ink, lineHeight: 1.5 }}>
              <div style={{ fontSize: 9, color: T.accent, fontWeight: 600, marginBottom: 2, letterSpacing: 0.3 }}>你上传时的提示</div>
              {d.userHint}
            </div>
            <div style={{ fontSize: 11, color: T.accent, fontWeight: 500, flexShrink: 0 }}>编辑</div>
          </div>
        )}

        {/* Shared fields */}
        <SectionLabel right="可逐项覆盖">所有项共用</SectionLabel>
        <Card pad={4} style={{ marginBottom: 12 }}>
          <ConfRow label="类型" conf={d.fields.type.conf} first>
            <TypeBadge type={txType} size="md" />
          </ConfRow>
          <ConfRow label="角色" warn={d.fields.role.warn} conf={d.fields.role.conf}>
            <RolePill role={r} size="md" />
          </ConfRow>
          <ConfRow label="账户" warn={d.fields.acct.warn} conf={d.fields.acct.conf}>
            <AccountChip acct={a} size="md" />
            <span style={{ fontSize: 10, color: T.warning, marginLeft: 6 }}>建议核对</span>
          </ConfRow>
          <ConfRow label="日期" conf={d.fields.date.conf}>
            <span style={{ fontSize: 14, color: T.ink }}>{d.fields.date.value}</span>
            <span style={{ fontSize: 11, color: T.textMute, marginLeft: 6 }}>周一</span>
          </ConfRow>
          <ConfRow label="币种" conf={d.fields.currency.conf}>
            <span style={{ fontFamily: NUM_FONT, fontSize: 13, fontWeight: 600, color: T.ink }}>{cc}</span>
            <span style={{ fontSize: 10, color: T.textMute, marginLeft: 6 }}>{CURRENCIES[cc]?.symbol}</span>
          </ConfRow>
          <ConfRow label="店铺" conf={d.fields.title.conf}>
            <span style={{ fontSize: 14, color: T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.fields.title.value}</span>
          </ConfRow>
        </Card>

        {/* Category distribution */}
        <SectionLabel right={<Amount value={total} size={11} color={T.textSoft} weight={600} currency={cc} />}>
          分类汇总 · 将生成 {includedItems.length} 笔交易
        </SectionLabel>
        <Card pad={12} style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {catDist.map(({ cat, amount }) => (
              <div key={cat.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 9px 5px 5px', borderRadius: 999, background: T.bgSubtle, fontSize: 11, color: T.ink }}>
                <CatMark cat={cat} size={20} />
                <span style={{ fontWeight: 500 }}>{cat.name}</span>
                <Amount value={amount} size={11} weight={600} color={T.textSoft} currency={cc} showCurrency={false} />
              </div>
            ))}
          </div>
        </Card>

        {/* Per-item list */}
        <SectionLabel right={<span style={{ color: T.accent, fontWeight: 600 }}>批量改分类 →</span>}>每项分类（AI）</SectionLabel>
        <Card pad={0} style={{ marginBottom: 12, overflow: 'hidden' }}>
          {d.items.map((it, i) => <ItemRow key={it.id} it={it} first={i === 0} currency={cc} />)}
        </Card>

        {lowConfCount > 0 && (
          <div style={{ background: T.warningSoft, padding: 12, borderRadius: 10, display: 'flex', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 18, height: 18, borderRadius: 9, flexShrink: 0, background: T.warning, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>!</div>
            <div style={{ fontSize: 11, color: T.ink, lineHeight: 1.5 }}>
              <strong>{lowConfCount} 个商品</strong>分类置信度较低。请点开核对，AI 不会自动入账。
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: '10px 16px 18px', borderTop: `1px solid ${T.borderSoft}`, background: 'rgba(251,248,242,0.96)', display: 'flex', gap: 8, alignItems: 'stretch' }}>
        <Button variant="danger" size="lg" style={{ flex: 1 }}>拒绝</Button>
        <Button variant="success" size="lg" style={{ flex: 2, flexDirection: 'column', gap: 0, padding: '6px 10px', height: 48 }}>
          <span style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.1 }}>确认入账</span>
          <span style={{ fontSize: 10, opacity: 0.85, lineHeight: 1.1, marginTop: 2 }}>{includedItems.length} 笔 · {fmtAmount(total, cc)}</span>
        </Button>
      </div>

      <BottomNav />
    </PhoneScreen>
  );
}
