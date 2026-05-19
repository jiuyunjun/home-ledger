'use client';

import { AppBar } from '@/components/layout/AppBar';
import { BottomNav } from '@/components/layout/BottomNav';
import { PhoneScreen } from '@/components/layout/PhoneScreen';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ReceiptThumb } from '@/components/ui/ReceiptThumb';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { T } from '@/lib/tokens';
import Link from 'next/link';
import { DragEvent, useRef, useState } from 'react';

// ── Image compression (ADR-010) ───────────────────────────────────────────────
// Max long edge 1600px, JPEG quality 85% — sufficient for AI text recognition.

async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const MAX = 1600;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width > height) {
          height = Math.round((height * MAX) / width);
          width = MAX;
        } else {
          width = Math.round((width * MAX) / height);
          height = MAX;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
        },
        'image/jpeg',
        0.85,
      );
    };

    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

// ── Types ─────────────────────────────────────────────────────────────────────

type QueueStatus = 'queued' | 'compressing' | 'ready';

interface QueueItem {
  id: string;
  name: string;
  originalSize: string;
  compressedSize?: string;
  status: QueueStatus;
  preview?: string;
}

const STATUS_META: Record<QueueStatus, { label: string; color: string; bg: string }> = {
  queued:      { label: '等待中', color: T.textMute, bg: T.bgSubtle   },
  compressing: { label: '压缩中', color: T.accent,   bg: T.accentSoft },
  ready:       { label: '已就绪', color: T.success,  bg: T.successSoft },
};

const HINT_CHIPS = ['算共通账', '算我的', '算她的', '公司报销', '不要拆分', '人民币支付'];

const ACCEPTED = 'image/jpeg,image/png,image/heic,image/heif,image/webp';

function fmtSize(bytes: number) {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// ── Queue row ─────────────────────────────────────────────────────────────────

function QueueRow({ item, first, onRemove }: { item: QueueItem; first: boolean; onRemove: () => void }) {
  const meta = STATUS_META[item.status];
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 8px', borderTop: first ? 'none' : `1px solid ${T.borderSoft}` }}>
      <ReceiptThumb label="" w={38} h={48} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: T.ink, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
        <div style={{ fontSize: 10, color: T.textMute, marginTop: 2 }}>
          {item.originalSize}
          {item.compressedSize && item.compressedSize !== item.originalSize && (
            <span style={{ color: T.success, marginLeft: 5 }}>→ {item.compressedSize}</span>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <div style={{ padding: '3px 8px', borderRadius: 999, background: meta.bg, color: meta.color, fontSize: 10, fontWeight: 600 }}>
          {meta.label}
        </div>
        <div onClick={onRemove} style={{ color: T.textDim, fontSize: 16, cursor: 'pointer', lineHeight: 1, padding: '0 2px' }}>×</div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function UploadPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [hint, setHint] = useState('');
  const [dragging, setDragging] = useState(false);

  async function processFiles(files: FileList | File[]) {
    const arr = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (arr.length === 0) return;

    // Add to queue as 'compressing'
    const items: QueueItem[] = arr.map((f) => ({
      id: `q_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      name: f.name,
      originalSize: fmtSize(f.size),
      status: 'compressing' as QueueStatus,
    }));
    setQueue((prev) => [...prev, ...items]);

    // Compress each and update status
    for (let i = 0; i < arr.length; i++) {
      const compressed = await compressImage(arr[i]);
      const id = items[i].id;
      setQueue((prev) =>
        prev.map((q) =>
          q.id === id
            ? { ...q, status: 'ready', compressedSize: fmtSize(compressed.size) }
            : q,
        ),
      );
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) processFiles(e.target.files);
    e.target.value = '';
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files) processFiles(e.dataTransfer.files);
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(true);
  }

  function appendChip(chip: string) {
    setHint((prev) => (prev ? prev + ' ' + chip : chip));
  }

  function removeItem(id: string) {
    setQueue((prev) => prev.filter((q) => q.id !== id));
  }

  const readyCount = queue.filter((q) => q.status === 'ready').length;

  return (
    <PhoneScreen>
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED}
        multiple
        style={{ display: 'none' }}
        onChange={handleFileInput}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept={ACCEPTED}
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleFileInput}
      />

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
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={() => setDragging(false)}
          style={{
            border: `1.5px dashed ${dragging ? T.accent : T.border}`,
            borderRadius: 14,
            padding: '22px 16px 18px',
            background: dragging ? T.accentSoft : T.surfaceAlt,
            textAlign: 'center',
            transition: 'background 0.15s, border-color 0.15s',
          }}
        >
          <div style={{ width: 50, height: 50, borderRadius: 25, margin: '0 auto 8px', background: T.surface, border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: T.accent, fontWeight: 300 }}>↑</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>拖入小票图片</div>
          <div style={{ fontSize: 11, color: T.textMute, marginTop: 4 }}>支持多张同时上传 · JPG / PNG / HEIC · 自动压缩</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'center' }}>
            <Button variant="primary" size="md" onClick={() => fileInputRef.current?.click()}>选择文件</Button>
            <Button variant="secondary" size="md" onClick={() => cameraInputRef.current?.click()}>📷 拍照</Button>
          </div>
        </div>

        {/* AI hint input */}
        <SectionLabel right={<span style={{ color: T.textMute }}>可选</span>}>给 AI 的提示</SectionLabel>
        <Card pad={12} style={{ marginBottom: 4 }}>
          <textarea
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            placeholder="例：本周食材，算共通账；或：这是人民币支付"
            rows={2}
            style={{
              width: '100%',
              border: `1px solid ${T.border}`,
              borderRadius: 8,
              padding: '8px 10px',
              fontSize: 13,
              color: T.ink,
              lineHeight: 1.5,
              background: T.surfaceAlt,
              resize: 'none',
              outline: 'none',
              boxSizing: 'border-box',
              fontFamily: 'inherit',
            }}
          />
          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {HINT_CHIPS.map((s) => (
              <span
                key={s}
                onClick={() => appendChip(s)}
                style={{ fontSize: 11, padding: '3px 9px', borderRadius: 999, background: T.bgSubtle, color: T.textSoft, border: `1px solid ${T.borderSoft}`, cursor: 'pointer' }}
              >
                {s}
              </span>
            ))}
          </div>
          <div style={{ marginTop: 8, fontSize: 10, color: T.textMute, lineHeight: 1.5 }}>
            AI 会用这段文字辅助分类（如归角色 / 标记报销 / 选币种）。
          </div>
        </Card>

        {/* Upload queue */}
        {queue.length > 0 && (
          <>
            <SectionLabel right={`${queue.length} 项`}>上传队列</SectionLabel>
            <Card pad={4}>
              {queue.map((item, i) => (
                <QueueRow key={item.id} item={item} first={i === 0} onRemove={() => removeItem(item.id)} />
              ))}
            </Card>
          </>
        )}

        {/* Submit CTA */}
        {readyCount > 0 && (
          <div style={{ marginTop: 16 }}>
            <Button
              variant="primary"
              size="lg"
              style={{ width: '100%' }}
            >
              上传 {readyCount} 张并开始识别
            </Button>
            <div style={{ marginTop: 8, fontSize: 11, color: T.textMute, textAlign: 'center' }}>
              识别完成后需手动确认，AI 不会自动入账
            </div>
          </div>
        )}
      </div>

      <BottomNav active="add" />
    </PhoneScreen>
  );
}
