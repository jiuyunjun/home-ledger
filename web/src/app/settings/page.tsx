import { AppBar } from '@/components/layout/AppBar';
import { BottomNav } from '@/components/layout/BottomNav';
import { PhoneScreen } from '@/components/layout/PhoneScreen';
import { RoleSwitcher } from '@/components/layout/RoleSwitcher';
import { Card } from '@/components/ui/Card';
import { CatMark } from '@/components/ui/CatMark';
import { TypeBadge } from '@/components/ui/TypeBadge';
import { ACCOUNTS, ACCT_KIND, EXPENSE_CATS, INCOME_CATS, fmtAmount, ROLES } from '@/lib/data';
import { NUM_FONT, T } from '@/lib/tokens';

const DATA_ACTIONS = [
  { t: '导出 CSV',    sub: 'UTF-8 with BOM · Excel 可读', acc: T.success },
  { t: '导出 JSON',   sub: 'UTF-8 · 完整结构备份',       acc: T.accent  },
  { t: '导入历史数据', sub: 'CSV / JSON',                 acc: T.warning },
];

export default function SettingsPage() {
  return (
    <PhoneScreen>
      <AppBar title="设置" />
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 16px 80px' }}>
        {/* Default role */}
        <div style={{ fontSize: 12, fontWeight: 500, color: T.textSoft, letterSpacing: 0.3, padding: '0 4px', marginBottom: 8 }}>本浏览器默认角色</div>
        <Card pad={12} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: T.textMute, marginBottom: 8 }}>新增支出 / 入账时默认填入此角色，可随时修改</div>
          <RoleSwitcher active="me" />
        </Card>

        {/* Roles */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '0 4px', marginBottom: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: T.textSoft }}>角色管理</div>
          <div style={{ fontSize: 12, color: T.textMute }}>编辑</div>
        </div>
        <Card pad={4} style={{ marginBottom: 16 }}>
          {ROLES.map((r, i) => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 10px', borderTop: i === 0 ? 'none' : `1px solid ${T.borderSoft}` }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: r.soft, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: r.color, fontWeight: 600 }}>{r.short}</div>
              <div style={{ flex: 1, fontSize: 14, color: T.ink }}>{r.name}</div>
              <div style={{ width: 14, height: 14, borderRadius: 7, background: r.color }} />
              <span style={{ color: T.textDim, fontSize: 12 }}>›</span>
            </div>
          ))}
          <div style={{ borderTop: `1px solid ${T.borderSoft}`, padding: '12px 10px', fontSize: 13, color: T.accent, fontWeight: 500 }}>+ 添加角色</div>
        </Card>

        {/* Accounts */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '0 4px', marginBottom: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: T.textSoft }}>账户 &amp; 支付方式</div>
          <div style={{ fontSize: 12, color: T.textMute }}>{ACCOUNTS.length} 项</div>
        </div>
        <Card pad={4} style={{ marginBottom: 16 }}>
          {ACCOUNTS.map((a, i) => {
            const k = ACCT_KIND[a.kind];
            return (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 10px', borderTop: i === 0 ? 'none' : `1px solid ${T.borderSoft}` }}>
                <div style={{ width: 32, height: 24, borderRadius: 4, background: k.color, color: '#fff', fontSize: 8, fontWeight: 700, letterSpacing: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{k.label}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, color: T.ink, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {a.name}
                    {a.currency !== 'JPY' && (
                      <span style={{ fontSize: 8, fontFamily: NUM_FONT, background: T.warningSoft, color: T.warning, padding: '1px 4px', borderRadius: 3, fontWeight: 700 }}>{a.currency}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: T.textMute, marginTop: 2, fontFamily: NUM_FONT }}>
                    {a.tail ? `•••• ${a.tail}` : a.balance !== undefined ? `余额 ${fmtAmount(a.balance, a.currency)}` : ''}
                  </div>
                </div>
                <span style={{ color: T.textDim, fontSize: 12 }}>›</span>
              </div>
            );
          })}
          <div style={{ borderTop: `1px solid ${T.borderSoft}`, padding: '12px 10px', fontSize: 13, color: T.accent, fontWeight: 500 }}>+ 添加账户 / 支付方式</div>
        </Card>

        {/* Categories — expense */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '0 4px', marginBottom: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: T.textSoft }}>分类管理</div>
          <div style={{ fontSize: 12, color: T.textMute }}>支出</div>
        </div>
        <Card pad={12} style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {EXPENSE_CATS.map((c) => (
              <div key={c.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 8px 4px 4px', borderRadius: 999, background: T.bgSubtle, fontSize: 12, color: T.ink }}>
                <CatMark cat={c} size={20} />
                {c.name}
              </div>
            ))}
            <div style={{ padding: '4px 10px', borderRadius: 999, border: `1px dashed ${T.border}`, fontSize: 12, color: T.textSoft }}>+ 新分类</div>
          </div>
        </Card>
        {/* Categories — income */}
        <Card pad={12} style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <TypeBadge type="income" />
            <span style={{ fontSize: 11, color: T.textSoft }}>入账分类</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {INCOME_CATS.map((c) => (
              <div key={c.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 8px 4px 4px', borderRadius: 999, background: T.incomeSoft, fontSize: 12, color: T.ink }}>
                <CatMark cat={c} size={20} />
                {c.name}
              </div>
            ))}
            <div style={{ padding: '4px 10px', borderRadius: 999, border: `1px dashed ${T.border}`, fontSize: 12, color: T.textSoft }}>+ 新分类</div>
          </div>
        </Card>

        {/* Data */}
        <div style={{ fontSize: 12, fontWeight: 500, color: T.textSoft, padding: '0 4px', marginBottom: 8 }}>数据</div>
        <Card pad={4} style={{ marginBottom: 16 }}>
          {DATA_ACTIONS.map((it, i) => (
            <div key={it.t} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 10px', borderTop: i === 0 ? 'none' : `1px solid ${T.borderSoft}` }}>
              <div style={{ width: 6, height: 6, borderRadius: 3, background: it.acc }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, color: T.ink }}>{it.t}</div>
                <div style={{ fontSize: 11, color: T.textMute, marginTop: 2 }}>{it.sub}</div>
              </div>
              <span style={{ color: T.textDim, fontSize: 12 }}>›</span>
            </div>
          ))}
        </Card>

        <div style={{ textAlign: 'center', padding: '10px 0 6px', fontSize: 10, color: T.textDim }}>
          家计簿 v0.1 · made with care
        </div>
      </div>
      <BottomNav active="me" />
    </PhoneScreen>
  );
}
