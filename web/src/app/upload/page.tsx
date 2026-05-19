import { AppBar } from '@/components/layout/AppBar';
import { BottomNav } from '@/components/layout/BottomNav';
import { PhoneScreen } from '@/components/layout/PhoneScreen';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ReceiptThumb } from '@/components/ui/ReceiptThumb';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { UPLOADS, UploadItem } from '@/lib/data';
import { T } from '@/lib/tokens';
import Link from 'next/link';

const STATUS_META: Record<UploadItem['status'], { label: string; color: string; bg: string }> = {
  queued:        { label: '等待中',   color: T.textMute, bg: T.bgSubtle    },
  recognizing:   { label: '识别中',   color: T.accent,   bg: T.accentSoft  },
  'needs-confirm': { label: '待确认', color: T.warning,  bg: T.warningSoft },
  failed:        { label: '识别失败', color: T.danger,   bg: T.dangerSoft  },
};

const HINT_CHIPS = ['算共通账', '算我的', '算她的', '公司报销', '不要拆分', '人民币支付'];

function UploadRow({ u, first }: { u: UploadItem; first: boolean }) {
  const meta = STATUS_META[u.status];
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 8px', borderTop: first ? 'none' : `1px solid ${T.borderSoft}` }}>
      <ReceiptThumb label="" w={38} h={48} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, color: T.ink, fontWeight: 500 }}>{u.name}</span>
        </div>
        <div style={{ fontSize: 10, color: T.textMute, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>{u.size}</span>
          {u.status === 'recognizing' && (
            <span style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ flex: 1, height: 2, background: T.bgSubtle, borderRadius: 1, overflow: 'hidden' }}>
                <span style={{ display: 'block', width: `${u.progress}%`, height: '100%', background: T.accent }} />
              </span>
              {u.progress}%
            </span>
          )}
        </div>
        {u.hint && (
          <div style={{ marginTop: 5, padding: '3px 7px', borderRadius: 5, background: T.accentSoft, color: T.accent, fontSize: 10, fontWeight: 500, display: 'inline-block' }}>
            💡 {u.hint}
          </div>
        )}
      </div>
      <div style={{ padding: '3px 8px', borderRadius: 999, alignSelf: 'flex-start', background: meta.bg, color: meta.color, fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap' }}>
        {meta.label}
      </div>
    </div>
  );
}

const needsConfirmCount = UPLOADS.filter((u) => u.status === 'needs-confirm').length;

export default function UploadPage() {
  return (
    <PhoneScreen>
      <AppBar
        title="上传小票"
        subtitle="AI 识别后需手动确认"
        left={
          <Link href="/" style={{ textDecoration: 'none' }}>
            <div style={{ fontSize: 18, color: T.textSoft, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</div>
          </Link>
        }
      />

      <div style={{ flex: 1, overflow: 'auto', padding: '8px 16px 80px' }}>
        {/* Drop zone */}
        <div style={{ border: `1.5px dashed ${T.border}`, borderRadius: 14, padding: '22px 16px 18px', background: T.surfaceAlt, textAlign: 'center' }}>
          <div style={{ width: 50, height: 50, borderRadius: 25, margin: '0 auto 8px', background: T.surface, border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: T.accent, fontWeight: 300 }}>↑</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>拖入小票图片</div>
          <div style={{ fontSize: 11, color: T.textMute, marginTop: 4 }}>支持多张同时上传 · JPG / PNG / HEIC</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'center' }}>
            <Button variant="primary" size="md">选择文件</Button>
            <Button variant="secondary" size="md">📷 拍照</Button>
          </div>
        </div>

        {/* AI hint input */}
        <SectionLabel right={<span style={{ color: T.textMute }}>可选</span>}>给 AI 的提示</SectionLabel>
        <Card pad={12} style={{ marginBottom: 4 }}>
          <div style={{ border: `1px solid ${T.border}`, borderRadius: 8, padding: '8px 10px', minHeight: 56, fontSize: 13, color: T.ink, lineHeight: 1.5, background: T.surfaceAlt }}>
            本周食材采购，统一算共通账
            <span className="cursor-blink" style={{ display: 'inline-block', width: 1.5, height: 14, background: T.accent, verticalAlign: -3, marginLeft: 2 }} />
          </div>
          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {HINT_CHIPS.map((s) => (
              <span key={s} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 999, background: T.bgSubtle, color: T.textSoft, border: `1px solid ${T.borderSoft}` }}>{s}</span>
            ))}
          </div>
          <div style={{ marginTop: 8, fontSize: 10, color: T.textMute, lineHeight: 1.5 }}>
            AI 会用这段文字辅助分类（如归角色 / 标记报销 / 选币种）。
          </div>
        </Card>

        {/* Upload queue */}
        <SectionLabel right={`${UPLOADS.length} 项`}>上传队列</SectionLabel>
        <Card pad={4}>
          {UPLOADS.map((u, i) => <UploadRow key={u.id} u={u} first={i === 0} />)}
        </Card>

        {/* Confirm CTA */}
        {needsConfirmCount > 0 && (
          <div style={{ marginTop: 16, padding: 12, background: T.warningSoft, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 22, height: 22, borderRadius: 11, background: T.warning, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
              {needsConfirmCount}
            </div>
            <div style={{ flex: 1, fontSize: 12, color: T.ink, lineHeight: 1.45 }}>
              <strong style={{ fontWeight: 600 }}>{needsConfirmCount} 张</strong> 已识别，等待你确认后才会正式入账。
            </div>
            <Link href="/ai-confirm" style={{ textDecoration: 'none' }}>
              <Button variant="primary" size="sm">去确认</Button>
            </Link>
          </div>
        )}
      </div>

      <BottomNav active="add" />
    </PhoneScreen>
  );
}
