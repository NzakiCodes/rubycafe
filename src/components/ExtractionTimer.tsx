import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  SkipForward,
  Star,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { formatSeconds } from '../data/presets';
import type { BaristaRecipe, BrewStep } from '../types/coffee';

interface ExtractionTimerProps {
  recipe: BaristaRecipe;
  onLogBrew: (payload: {
    recipe: BaristaRecipe;
    actualSeconds: number;
    targetSeconds: number;
    doseGrams: number;
    waterMl: number;
    rating: number;
    notes: string;
    isFavorite: boolean;
    alsoShareToFeed: boolean;
  }) => Promise<void>;
}

function playChime(kind: 'stage' | 'complete') {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const freqs = kind === 'complete' ? [523.25, 659.25, 783.99] : [587.33];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.11);
      gain.gain.setValueAtTime(0.001, now + idx * 0.11);
      gain.gain.exponentialRampToValueAtTime(0.09, now + idx * 0.11 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.11 + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.11);
      osc.stop(now + idx * 0.11 + 0.5);
    });
  } catch {
    // Ignore audio context blocks
  }
}

export function ExtractionTimer({ recipe, onLogBrew }: ExtractionTimerProps) {
  const [doseGrams, setDoseGrams] = useState<number>(recipe.brewMethod.doseGrams);
  const [targetSeconds, setTargetSeconds] = useState<number>(
    recipe.brewMethod.totalTimeSeconds
  );
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [soundOn, setSoundOn] = useState<boolean>(true);
  const [showLogPanel, setShowLogPanel] = useState<boolean>(false);
  const [rating, setRating] = useState<number>(5);
  const [notes, setNotes] = useState<string>('');
  const [isFavorite, setIsFavorite] = useState<boolean>(true);
  const [alsoShareToFeed, setAlsoShareToFeed] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const lastTickRef = useRef<number | null>(null);
  const lastStageIdxRef = useRef<number>(0);
  const completedRef = useRef<boolean>(false);

  // Sync timer defaults whenever a new recipe is loaded
  useEffect(() => {
    setIsRunning(false);
    setElapsedMs(0);
    setDoseGrams(recipe.brewMethod.doseGrams);
    setTargetSeconds(recipe.brewMethod.totalTimeSeconds);
    lastStageIdxRef.current = 0;
    completedRef.current = false;
    setShowLogPanel(false);
    setSavedNotice(null);
  }, [recipe]);

  const ratioMultiplier = useMemo(() => {
    if (!recipe.brewMethod.doseGrams) return 16;
    return recipe.brewMethod.waterMl / recipe.brewMethod.doseGrams;
  }, [recipe]);

  const scaledWaterMl = Math.round(doseGrams * ratioMultiplier);

  const scaledSteps: BrewStep[] = useMemo(() => {
    const baseTotal = Math.max(1, recipe.brewMethod.totalTimeSeconds);
    const timeScale = targetSeconds / baseTotal;
    const waterScale =
      recipe.brewMethod.waterMl > 0 ? scaledWaterMl / recipe.brewMethod.waterMl : 1;

    return recipe.brewMethod.steps.map((step, i, arr) => ({
      ...step,
      startSec: Math.round(step.startSec * timeScale),
      endSec:
        i === arr.length - 1 ? targetSeconds : Math.round(step.endSec * timeScale),
      waterTargetMl: Math.round(step.waterTargetMl * waterScale),
    }));
  }, [recipe, targetSeconds, scaledWaterMl]);

  const elapsedSec = Math.floor(elapsedMs / 1000);

  const activeStageIndex = useMemo(() => {
    const idx = scaledSteps.findIndex(
      (step) => elapsedSec >= step.startSec && elapsedSec < step.endSec
    );
    if (idx !== -1) return idx;
    if (elapsedSec >= targetSeconds) return Math.max(0, scaledSteps.length - 1);
    return 0;
  }, [scaledSteps, elapsedSec, targetSeconds]);

  useEffect(() => {
    if (!isRunning) {
      lastTickRef.current = null;
      return;
    }

    lastTickRef.current = Date.now();
    const interval = window.setInterval(() => {
      const now = Date.now();
      const delta = now - (lastTickRef.current ?? now);
      lastTickRef.current = now;
      setElapsedMs((prev) => prev + delta);
    }, 100);

    return () => window.clearInterval(interval);
  }, [isRunning]);

  // Trigger audio cues on stage transitions & completion
  useEffect(() => {
    if (!isRunning) return;
    if (activeStageIndex > lastStageIdxRef.current) {
      lastStageIdxRef.current = activeStageIndex;
      if (soundOn) playChime('stage');
    }
    if (elapsedSec >= targetSeconds && !completedRef.current) {
      completedRef.current = true;
      if (soundOn) playChime('complete');
    }
  }, [activeStageIndex, elapsedSec, targetSeconds, isRunning, soundOn]);

  const handleReset = () => {
    setIsRunning(false);
    setElapsedMs(0);
    lastStageIdxRef.current = 0;
    completedRef.current = false;
  };

  const handleSkipStage = () => {
    const nextIdx = activeStageIndex + 1;
    if (nextIdx < scaledSteps.length) {
      const nextStart = scaledSteps[nextIdx].startSec;
      setElapsedMs(nextStart * 1000);
      lastStageIdxRef.current = nextIdx;
    } else {
      setElapsedMs(targetSeconds * 1000);
      setIsRunning(false);
      completedRef.current = true;
    }
  };

  const handleSubmitLog = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const recordedSeconds = elapsedSec > 0 ? elapsedSec : targetSeconds;
      await onLogBrew({
        recipe,
        actualSeconds: recordedSeconds,
        targetSeconds,
        doseGrams,
        waterMl: scaledWaterMl,
        rating,
        notes,
        isFavorite,
        alsoShareToFeed,
      });
      setSavedNotice('Brew saved to your log.');
      setShowLogPanel(false);
      setNotes('');
    } finally {
      setIsSaving(false);
    }
  };

  const progressRatio = Math.min(1, elapsedMs / 1000 / Math.max(1, targetSeconds));
  const isOverTarget = elapsedSec > targetSeconds;
  const activeStage = scaledSteps[activeStageIndex] ?? scaledSteps[0];
  const stageRemaining = Math.max(0, (activeStage?.endSec ?? targetSeconds) - elapsedSec);

  const circleRadius = 96;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circumference * (1 - progressRatio);

  return (
    <section id="timer" className="py-16 bg-[#141517] text-[#F7F7F5]">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <p className="text-xs font-medium tracking-wide text-[#F59E0B] mb-2">
              02. Precision Extraction Timer
            </p>
            <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight text-white text-balance">
              {recipe.brewMethod.methodName} · {recipe.title}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSoundOn((v) => !v)}
              aria-label={soundOn ? 'Mute stage chimes' : 'Enable stage chimes'}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-[#E5E4DF] bg-white/6 hover:bg-white/12 border border-white/12 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {soundOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span>{soundOn ? 'Chimes On' : 'Muted'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsRunning(false);
                setShowLogPanel((v) => !v);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#141517] bg-[#F59E0B] hover:bg-[#D97706] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Log Completed Brew</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Dial & Transport Controls */}
          <div className="lg:col-span-5 bg-[#1B1D20] border border-white/10 rounded-xl p-6 flex flex-col items-center justify-between gap-6">
            <div className="w-full flex items-center justify-between text-xs text-[#A1A09A]">
              <span>{recipe.recommendedBean.origin}</span>
              <span className="font-mono tabular-nums">
                {recipe.brewMethod.waterTempC}°C · {recipe.brewMethod.ratio}
              </span>
            </div>

            {/* SVG Circular Extraction Gauge */}
            <div className="relative w-56 h-56 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 220 220">
                <circle
                  cx="110"
                  cy="110"
                  r={circleRadius}
                  fill="none"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="8"
                />
                <circle
                  cx="110"
                  cy="110"
                  r={circleRadius}
                  fill="none"
                  stroke={isOverTarget ? '#EF4444' : '#F59E0B'}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-[stroke-dashoffset] duration-150 ease-linear"
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[11px] font-medium tracking-wide text-[#A1A09A] mb-1">
                  {elapsedSec >= targetSeconds
                    ? isOverTarget
                      ? 'Over Target'
                      : 'Target Reached'
                    : activeStage?.label || 'Ready'}
                </span>
                <span className="font-mono text-4xl font-semibold tracking-tight text-white tabular-nums">
                  {formatSeconds(elapsedSec)}
                </span>
                <span className="font-mono text-xs text-[#A1A09A] mt-1 tabular-nums">
                  Target {formatSeconds(targetSeconds)}
                </span>
              </div>
            </div>

            {/* Transport Row */}
            <div className="flex items-center gap-3 w-full justify-center">
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium text-[#E5E4DF] bg-white/6 hover:bg-white/12 border border-white/10 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>

              <button
                type="button"
                onClick={() => setIsRunning((r) => !r)}
                className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-[#141517] bg-white hover:bg-[#EAE8E3] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {isRunning ? (
                  <>
                    <Pause className="w-4 h-4" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>{elapsedSec > 0 ? 'Resume' : 'Start Brew'}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleSkipStage}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium text-[#E5E4DF] bg-white/6 hover:bg-white/12 border border-white/10 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <SkipForward className="w-3.5 h-3.5" />
                <span>Next</span>
              </button>
            </div>

            {/* Fine-tune Dose & Target Time */}
            <div className="w-full pt-4 border-t border-white/10 grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between bg-white/4 rounded-lg px-3 py-2">
                <div>
                  <div className="text-[11px] text-[#A1A09A]">Dose · Water</div>
                  <div className="font-mono text-xs font-semibold text-white tabular-nums">
                    {doseGrams}g / {scaledWaterMl}ml
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Decrease dose by 1 gram"
                    onClick={() => setDoseGrams((d) => Math.max(8, d - 1))}
                    className="p-1.5 rounded bg-white/8 hover:bg-white/15 text-white cursor-pointer"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    aria-label="Increase dose by 1 gram"
                    onClick={() => setDoseGrams((d) => Math.min(60, d + 1))}
                    className="p-1.5 rounded bg-white/8 hover:bg-white/15 text-white cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between bg-white/4 rounded-lg px-3 py-2">
                <div>
                  <div className="text-[11px] text-[#A1A09A]">Target Time</div>
                  <div className="font-mono text-xs font-semibold text-white tabular-nums">
                    {formatSeconds(targetSeconds)}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Decrease target time by 5 seconds"
                    onClick={() => setTargetSeconds((t) => Math.max(15, t - 5))}
                    className="p-1.5 rounded bg-white/8 hover:bg-white/15 text-white cursor-pointer"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    aria-label="Increase target time by 5 seconds"
                    onClick={() => setTargetSeconds((t) => Math.min(600, t + 5))}
                    className="p-1.5 rounded bg-white/8 hover:bg-white/15 text-white cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel: Extraction Stage Timeline & Log Drawer */}
          <div className="lg:col-span-7 bg-[#1B1D20] border border-white/10 rounded-xl p-6 flex flex-col justify-between gap-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">
                  Pour &amp; Extraction Stages
                </h3>
                <span className="font-mono text-xs text-[#F59E0B] tabular-nums">
                  {elapsedSec >= targetSeconds
                    ? 'Extraction complete'
                    : `Next cue in ${formatSeconds(stageRemaining)}`}
                </span>
              </div>

              <div className="divide-y divide-white/8">
                {scaledSteps.map((step, index) => {
                  const isCurrent = index === activeStageIndex && elapsedSec < targetSeconds;
                  const isDone = elapsedSec >= step.endSec;

                  return (
                    <div
                      key={`${step.label}-${index}`}
                      className={`py-4 px-3 rounded-lg transition-colors ${
                        isCurrent ? 'bg-white/8' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4 mb-1.5">
                        <div className="flex items-center gap-3">
                          <span
                            className={`font-mono text-xs tabular-nums ${
                              isCurrent
                                ? 'text-[#F59E0B] font-semibold'
                                : isDone
                                  ? 'text-[#A1A09A]'
                                  : 'text-[#6B6A65]'
                            }`}
                          >
                            0{index + 1}.
                          </span>
                          <span
                            className={`text-sm font-semibold ${
                              isCurrent
                                ? 'text-white'
                                : isDone
                                  ? 'text-[#C8C7C2]'
                                  : 'text-[#E5E4DF]'
                            }`}
                          >
                            {step.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 font-mono text-xs tabular-nums">
                          <span className="text-[#F59E0B]">{step.waterTargetMl} ml</span>
                          <span className="text-[#A1A09A]">
                            {formatSeconds(step.startSec)}–{formatSeconds(step.endSec)}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-[#B5B4AE] leading-relaxed pl-7">
                        {step.instruction}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {savedNotice ? (
              <div className="p-3 rounded-lg bg-[#16A34A]/15 border border-[#16A34A]/35 text-xs text-[#BBF7D0]">
                {savedNotice}
              </div>
            ) : null}

            {showLogPanel ? (
              <form
                onSubmit={handleSubmitLog}
                className="p-4 rounded-xl bg-white/5 border border-white/12 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">
                    Record Tasting Notes ({formatSeconds(elapsedSec > 0 ? elapsedSec : targetSeconds)})
                  </span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        aria-label={`Rate ${star} stars`}
                        onClick={() => setRating(star)}
                        className="p-1 cursor-pointer"
                      >
                        <Star
                          className={`w-4 h-4 ${
                            star <= rating
                              ? 'fill-[#F59E0B] text-[#F59E0B]'
                              : 'text-[#6B6A65]'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="How did the cup taste? Sweetness, clarity, body, or grind adjustments for next time..."
                  className="w-full px-3 py-2 text-xs bg-[#141517] border border-white/15 rounded-lg text-white placeholder:text-[#7A7974] focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/40 resize-none"
                />

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-4 text-xs text-[#D5D4CE]">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isFavorite}
                        onChange={(e) => setIsFavorite(e.target.checked)}
                        className="accent-[#F59E0B]"
                      />
                      <span>Save as Favorite</span>
                    </label>
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={alsoShareToFeed}
                        onChange={(e) => setAlsoShareToFeed(e.target.checked)}
                        className="accent-[#F59E0B]"
                      />
                      <span>Share to Community Feed</span>
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowLogPanel(false)}
                      className="px-3 py-1.5 text-xs text-[#A1A09A] hover:text-white cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-4 py-2 text-xs font-semibold text-[#141517] bg-[#F59E0B] hover:bg-[#D97706] disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {isSaving ? 'Saving...' : 'Save Brew Log'}
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-[#A1A09A]">
                <span>
                  Milk pairing: {recipe.milkPairing.milkType}
                  {recipe.milkPairing.temperatureC
                    ? ` (${recipe.milkPairing.temperatureC}°C)`
                    : ''}
                </span>
                <span>Grind: {recipe.brewMethod.grindSize}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
