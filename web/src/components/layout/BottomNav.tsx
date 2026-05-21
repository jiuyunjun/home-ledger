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

const BAR_COUNT = 5;
// Which frequency bins to sample for each bar (spread across voice range 100–3000 Hz)
const BIN_INDICES = [3, 6, 11, 18, 28];

function VoicePlusButton() {
  const router = useRouter();
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [bars, setBars] = useState<number[]>(Array(BAR_COUNT).fill(0));

  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recorderRef   = useRef<MediaRecorder | null>(null);
  const streamRef     = useRef<MediaStream | null>(null);
  const chunksRef     = useRef<Blob[]>([]);
  const isLongPressRef = useRef(false);
  const audioCtxRef   = useRef<AudioContext | null>(null);
  const analyserRef   = useRef<AnalyserNode | null>(null);
  const rafRef        = useRef<number | null>(null);

  function startViz(stream: MediaStream) {
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    ctx.createMediaStreamSource(stream).connect(analyser);
    audioCtxRef.current = ctx;
    analyserRef.current = analyser;

    const data = new Uint8Array(analyser.frequencyBinCount);

    function tick() {
      analyser.getByteFrequencyData(data);
      const heights = BIN_INDICES.map((bin) => {
        const v = data[Math.min(bin, data.length - 1)] / 255; // 0–1
        return Math.round(8 + v * 28); // 8–36 px
      });
      setBars(heights);
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
  }

  function stopViz() {
    if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    analyserRef.current = null;
    setBars(Array(BAR_COUNT).fill(0));
  }

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
    stopViz();
    stopStream();

    const mimeType = recorder.mimeType || 'audio/webm';
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

        startViz(stream);
        setVoiceState('recording');
      } catch {
        isLongPressRef.current = false;
      }
    }, 400);
  }

  function handlePointerUp() {
    if (pressTimerRef.current) { clearTimeout(pressTimerRef.current); pressTimerRef.current = null; }
    if (!isLongPressRef.current) {
      if (voiceState === 'idle') router.push('/entry');
      return;
    }
    if (voiceState === 'recording') processRecording();
  }

  function handlePointerCancel() {
    if (pressTimerRef.current) { clearTimeout(pressTimerRef.current); pressTimerRef.current = null; }
    if (voiceState === 'recording') {
      recorderRef.current?.stop();
      stopViz();
      stopStream();
      setVoiceState('idle');
    }
  }

  const isRecording  = voiceState === 'recording';
  const isProcessing = voiceState === 'processing';

  return (
    <>
      <style>{`
        @keyframes voiceSpin { to { transform: rotate(360deg); } }
        @keyframes voiceBarIdle {
          0%,100% { height: 8px; } 50% { height: 14px; }
        }
      `}</style>

      {/* Recording overlay — visible above the nav bar, not blocked by finger */}
      {(isRecording || isProcessing) && (
        <div style={{
          position: 'fixed',
          bottom: 70,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'calc(100% - 32px)',
          maxWidth: 358,
          height: 56,
          background: 'rgba(255,255,255,0.96)',
          backdropFilter: 'blur(12px)',
          borderRadius: 16,
          boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          zIndex: 200,
        }}>
          {/* Left: mic icon + label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 14,
              background: isProcessing ? T.accentSoft : '#FEE2E2',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13,
            }}>
              {isProcessing ? (
                <div style={{ width: 14, height: 14, borderRadius: 7, border: '2px solid rgba(0,0,0,0.15)', borderTopColor: T.accent, animation: 'voiceSpin 0.7s linear infinite' }} />
              ) : '🎙'}
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: isProcessing ? T.textSoft : '#DC2626' }}>
              {isProcessing ? 'AI 识别中…' : '松开停止'}
            </span>
          </div>

          {/* Centre: volume bars */}
          {isRecording && (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 36 }}>
              {bars.map((h, i) => (
                <div key={i} style={{
                  width: 4,
                  height: h,
                  borderRadius: 2,
                  background: '#DC2626',
                  opacity: 0.7 + i * 0.06,
                  transition: 'height 0.08s ease-out',
                }} />
              ))}
            </div>
          )}
          {isProcessing && (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 36 }}>
              {Array(BAR_COUNT).fill(0).map((_, i) => (
                <div key={i} style={{
                  width: 4, borderRadius: 2,
                  background: T.accent, opacity: 0.4,
                  animation: `voiceBarIdle 1.2s ease-in-out ${i * 0.15}s infinite`,
                  height: 10,
                }} />
              ))}
            </div>
          )}

          {/* Right: duration or hint */}
          <span style={{ fontSize: 11, color: T.textMute, minWidth: 32, textAlign: 'right' }}>
            {isProcessing ? '' : '声音'}
          </span>
        </div>
      )}

      {/* The + button */}
      <div
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        style={{
          width: 48, height: 48, borderRadius: 24,
          background: isRecording ? '#DC2626' : T.accent,
          color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, fontWeight: 300,
          marginTop: -16,
          boxShadow: isRecording
            ? '0 0 0 6px rgba(220,38,38,0.18), 0 4px 12px rgba(220,38,38,0.4)'
            : '0 4px 12px rgba(61, 90, 108, 0.3)',
          cursor: 'pointer',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          touchAction: 'none',
          transition: 'background 0.2s, box-shadow 0.2s',
          flexShrink: 0,
        }}
      >
        {isProcessing ? (
          <div style={{ width: 20, height: 20, borderRadius: 10, border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'voiceSpin 0.7s linear infinite' }} />
        ) : isRecording ? '●' : '+'}
      </div>
    </>
  );
}

export function BottomNav({ active = 'home' }: Props) {
  const leftItems  = navItems.slice(0, 2);
  const rightItems = navItems.slice(2);

  return (
    <div style={{
      borderTop: `1px solid ${T.borderSoft}`,
      background: 'rgba(251, 248, 242, 0.92)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      padding: '8px 8px 14px',
      position: 'sticky',
      bottom: 0,
    }}>
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
