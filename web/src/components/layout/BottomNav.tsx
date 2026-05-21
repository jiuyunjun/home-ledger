'use client';

import { apiUpload } from '@/lib/api';
import { T } from '@/lib/tokens';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

type NavId = 'home' | 'list' | 'add' | 'budget' | 'me';

interface Props {
  active?: NavId;
}

const navItems: { id: NavId; label: string; icon: string; href: string }[] = [
  { id: 'home',   label: '首页', icon: '⊞', href: '/' },
  { id: 'list',   label: '明细', icon: '≡', href: '/transactions' },
  { id: 'budget', label: '预算', icon: '◎', href: '/budget' },
  { id: 'me',     label: '设置', icon: '◉', href: '/settings' },
];

interface VoiceEntryResult {
  transactionType: string;
  amount: number;
  currency: string;
  merchantName: string;
  title: string;
  categoryId: string;
  paymentMethodId: string;
  memo: string;
  transcript: string;
}

type VoiceState = 'idle' | 'recording' | 'processing';

function VoicePlusButton() {
  const router = useRouter();
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const isLongPressRef = useRef(false);

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function processRecording() {
    const recorder = recorderRef.current;
    if (!recorder) return;

    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      recorder.stop();
    });
    stopStream();

    const mimeType = recorderRef.current?.mimeType || 'audio/webm';
    const blob = new Blob(chunksRef.current, { type: mimeType });
    setVoiceState('processing');

    try {
      const form = new FormData();
      const ext = mimeType.includes('mp4') ? 'm4a' : 'webm';
      form.append('audio', blob, `audio.${ext}`);
      const result = await apiUpload<VoiceEntryResult>('/api/voice/entry', form);
      sessionStorage.setItem('voice_prefill', JSON.stringify(result));
      const mode = result.transactionType === 'income' ? 'income'
        : result.transactionType === 'transfer' ? 'transfer'
        : 'expense';
      router.push(`/entry?mode=${mode}`);
    } catch (err) {
      console.error('voice entry failed', err);
    } finally {
      setVoiceState('idle');
    }
  }

  function handlePointerDown(e: React.PointerEvent) {
    e.preventDefault();
    isLongPressRef.current = false;

    pressTimerRef.current = setTimeout(async () => {
      isLongPressRef.current = true;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        const preferredType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', '']
          .find((t) => !t || MediaRecorder.isTypeSupported(t)) ?? '';
        const recorder = new MediaRecorder(stream, preferredType ? { mimeType: preferredType } : undefined);
        recorderRef.current = recorder;
        chunksRef.current = [];
        recorder.ondataavailable = (ev) => { if (ev.data.size > 0) chunksRef.current.push(ev.data); };
        recorder.start();
        setVoiceState('recording');
      } catch {
        isLongPressRef.current = false;
      }
    }, 400);
  }

  function handlePointerUp() {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    if (!isLongPressRef.current) {
      if (voiceState === 'idle') router.push('/entry');
      return;
    }
    if (voiceState === 'recording') processRecording();
  }

  function handlePointerCancel() {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    if (voiceState === 'recording') {
      recorderRef.current?.stop();
      stopStream();
      setVoiceState('idle');
    }
  }

  const isRecording = voiceState === 'recording';
  const isProcessing = voiceState === 'processing';

  return (
    <>
      <style>{`
        @keyframes voicePulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(220,38,38,0.5), 0 4px 12px rgba(220,38,38,0.4); }
          50% { box-shadow: 0 0 0 8px rgba(220,38,38,0), 0 4px 12px rgba(220,38,38,0.4); }
        }
        @keyframes voiceSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        style={{
          width: 48, height: 48, borderRadius: 24,
          background: isRecording ? '#DC2626' : T.accent,
          color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: isRecording ? 18 : 22,
          fontWeight: 300,
          marginTop: -16,
          boxShadow: isRecording
            ? '0 0 0 0 rgba(220,38,38,0.5)'
            : '0 4px 12px rgba(61, 90, 108, 0.3)',
          cursor: 'pointer',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          touchAction: 'none',
          transition: 'background 0.2s',
          animation: isRecording ? 'voicePulse 1s ease-in-out infinite' : 'none',
          position: 'relative',
          flexShrink: 0,
        }}
      >
        {isRecording ? '●' : isProcessing ? (
          <div style={{
            width: 20, height: 20, borderRadius: 10,
            border: '2.5px solid rgba(255,255,255,0.3)',
            borderTopColor: '#fff',
            animation: 'voiceSpin 0.7s linear infinite',
          }} />
        ) : '+'}
      </div>
    </>
  );
}

export function BottomNav({ active = 'home' }: Props) {
  const leftItems = navItems.slice(0, 2);
  const rightItems = navItems.slice(2);

  return (
    <div
      style={{
        borderTop: `1px solid ${T.borderSoft}`,
        background: 'rgba(251, 248, 242, 0.92)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: '8px 8px 14px',
        position: 'sticky',
        bottom: 0,
      }}
    >
      {leftItems.map((it) => {
        const on = active === it.id;
        return (
          <Link key={it.id} href={it.href} style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, color: on ? T.accent : T.textMute, width: 56 }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: on ? T.accentSoft : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600 }}>
                {it.icon}
              </div>
              <div style={{ fontSize: 10, fontWeight: on ? 600 : 400 }}>{it.label}</div>
            </div>
          </Link>
        );
      })}

      <VoicePlusButton />

      {rightItems.map((it) => {
        const on = active === it.id;
        return (
          <Link key={it.id} href={it.href} style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, color: on ? T.accent : T.textMute, width: 56 }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: on ? T.accentSoft : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600 }}>
                {it.icon}
              </div>
              <div style={{ fontSize: 10, fontWeight: on ? 600 : 400 }}>{it.label}</div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
