import { useCallback, useEffect, useRef, useState } from "react";

const PRESETS = [
  { name: "4-7-8 Breathing", inhale: 4, holdIn: 7, exhale: 8, holdOut: 0, tempo: 1000, cycles: 10 },
  { name: "Box Breathing", inhale: 3, holdIn: 3, exhale: 3, holdOut: 3, tempo: 1600, cycles: 10 },
  { name: "Slow Breathing", inhale: 6, holdIn: 0, exhale: 6, holdOut: 0, tempo: 1100, cycles: 5 },
] as const;

function logVoice(voice: SpeechSynthesisVoice | null) {
  if (!voice) {
    console.log("No voice selected");
    return;
  }
  console.log(`${voice.name} (${voice.lang}) — ${voice.voiceURI}`);
}

type ScheduledEvent = {
  text: string;
  interrupt: boolean;
  volume: number;
  pacing: boolean;
};

// Some voices are "synthetic" and unpleasant, so we filter them out. We also prefer certain voices when available.
const isAllowedVoice = (voice: SpeechSynthesisVoice) => {
  const isEnglish = voice.lang.toLowerCase().startsWith("en");
  if (!isEnglish) return false;

  const uri = (voice.voiceURI ?? "").toLowerCase();
  if (uri.includes("com.apple")) {
    if (uri.includes("com.apple.voice")) return true;
    return false;
  }

  return true;
};

const getPreferredVoice = (voices: SpeechSynthesisVoice[]) => {
  const englishVoices = voices.filter(isAllowedVoice);
  return englishVoices.find((voice) => voice.name.toLowerCase().includes("karen")) || englishVoices[0] || null;
};

function BreathingCoach() {
  const [inhalationCount, setInhalationCount] = useState<number>(4);
  const [holdAfterInhaleCount, setHoldAfterInhaleCount] = useState<number>(7);
  const [exhalationCount, setExhalationCount] = useState<number>(8);
  const [holdAfterExhaleCount, setHoldAfterExhaleCount] = useState<number>(0);
  const [cycles, setCycles] = useState<number>(2);
  const [beatDuration, setBeatDuration] = useState<number>(1000);

  const [activePresetIndex, setActivePresetIndex] = useState<number | null>(0);

  const [isRunning, setIsRunning] = useState<boolean>(false);

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>("");

  const beatDurationRef = useRef<number>(1000);
  const eventQueueRef = useRef<ScheduledEvent[]>([]);
  const intervalIdRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);
  const speechSynthesisRef = useRef<SpeechSynthesis | null>(null);

  const quarterNoteBpm = Math.round(60000 / beatDuration);

  const loadVoices = useCallback(() => {
    if (!speechSynthesisRef.current) return;
    const loadedVoices = speechSynthesisRef.current.getVoices();
    const englishVoices = loadedVoices.filter(isAllowedVoice).sort((a, b) => a.name.localeCompare(b.name));
    console.group("Available English Voices");
    englishVoices.forEach(logVoice);
    console.groupEnd();
    setVoices(englishVoices);
    if (englishVoices.length > 0) {
      const preferred = getPreferredVoice(englishVoices);
      if (preferred) {
        setSelectedVoiceName((current) => current || preferred.name);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      speechSynthesisRef.current = window.speechSynthesis;
      loadVoices();
      if (speechSynthesisRef.current) {
        speechSynthesisRef.current.onvoiceschanged = loadVoices;
      }
    }

    return () => {
      clearScheduled();
      speechSynthesisRef.current?.cancel();
      if (speechSynthesisRef.current) {
        speechSynthesisRef.current.onvoiceschanged = null;
      }
    };
  }, []);

  useEffect(() => {
    beatDurationRef.current = beatDuration;
  }, [beatDuration]);

  useEffect(() => {
    const matchedIndex = PRESETS.findIndex(
      (p) =>
        p.inhale === inhalationCount &&
        p.holdIn === holdAfterInhaleCount &&
        p.exhale === exhalationCount &&
        p.holdOut === holdAfterExhaleCount &&
        p.tempo === beatDuration,
    );
    setActivePresetIndex(matchedIndex === -1 ? null : matchedIndex);
  }, [inhalationCount, holdAfterInhaleCount, exhalationCount, holdAfterExhaleCount, beatDuration]);

  const getSelectedVoice = () => {
    if (!speechSynthesisRef.current) return null;
    const availableVoices = voices.length ? voices : speechSynthesisRef.current.getVoices();
    return availableVoices.find((voice) => voice.name === selectedVoiceName) || null;
  };

  const speak = (text: string, interrupt = false, volume = 1, onEnd?: () => void) => {
    if (!speechSynthesisRef.current) return;
    if (interrupt) {
      speechSynthesisRef.current.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    const selectedVoice = getSelectedVoice();

    if (selectedVoice) {
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang;
    } else {
      utterance.lang = "en-US";
    }

    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = volume;
    if (onEnd) {
      utterance.onend = onEnd;
    }
    speechSynthesisRef.current.speak(utterance);
  };

  const clearScheduled = () => {
    if (intervalIdRef.current !== null) {
      window.clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
    eventQueueRef.current = [];
  };

  const stop = () => {
    clearScheduled();
    speechSynthesisRef.current?.cancel();
    setIsRunning(false);
  };

  const applyPreset = (index: number) => {
    const preset = PRESETS[index];
    setInhalationCount(preset.inhale);
    setHoldAfterInhaleCount(preset.holdIn);
    setExhalationCount(preset.exhale);
    setHoldAfterExhaleCount(preset.holdOut);
    setBeatDuration(preset.tempo);
    setCycles(preset.cycles);
  };

  const schedulePhase = (label: string, seconds: number) => {
    if (seconds <= 0) return [];

    const events: ScheduledEvent[] = [{ text: label, interrupt: true, volume: 1, pacing: false }];
    for (let i = seconds; i >= 1; i--) {
      events.push({ text: String(i), interrupt: false, volume: 0.8, pacing: true });
    }
    return events;
  };

  const startScheduler = () => {
    if (intervalIdRef.current !== null) return;

    lastTickRef.current = performance.now();
    intervalIdRef.current = window.setInterval(() => {
      const now = performance.now();
      const nextEvent = eventQueueRef.current[0];
      if (!nextEvent) {
        clearScheduled();
        setIsRunning(false);
        return;
      }

      if (!nextEvent.pacing) {
        if (speechSynthesisRef.current?.speaking) {
          return;
        }

        eventQueueRef.current.shift();
        speak(nextEvent.text, nextEvent.interrupt, nextEvent.volume);
        if (eventQueueRef.current.length === 0) {
          clearScheduled();
          setIsRunning(false);
          return;
        }

        lastTickRef.current = now;
        return;
      }

      if (now - lastTickRef.current >= beatDurationRef.current) {
        eventQueueRef.current.shift();
        speak(nextEvent.text, nextEvent.interrupt, nextEvent.volume);
        if (eventQueueRef.current.length === 0) {
          clearScheduled();
          setIsRunning(false);
          return;
        }

        lastTickRef.current += beatDurationRef.current;
      }
    }, 50);
  };

  const breathe = () => {
    if (isNaN(inhalationCount) || isNaN(holdAfterInhaleCount) || isNaN(exhalationCount) || isNaN(cycles)) {
      alert("Please enter valid numbers.");
      return;
    }

    stop();
    setIsRunning(true);

    eventQueueRef.current = [];

    for (let i = 0; i < cycles; i++) {
      eventQueueRef.current.push(...schedulePhase("Inhale", inhalationCount));
      eventQueueRef.current.push(...schedulePhase("Hold", holdAfterInhaleCount));
      eventQueueRef.current.push(...schedulePhase("Exhale", exhalationCount));
      eventQueueRef.current.push(...schedulePhase("Hold", holdAfterExhaleCount));
    }

    eventQueueRef.current.push({ text: "Good work.", interrupt: false, volume: 1, pacing: false });
    const startText =
      activePresetIndex !== null ? `Let's begin ${PRESETS[activePresetIndex].name.toLowerCase()}.` : "Let's begin.";
    speak(startText, true, 1, startScheduler);
  };

  return (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm shadow-slate-200/20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xl font-semibold text-slate-900">Counting Coach</div>
          <div className="mt-1 text-sm text-slate-500">
            Set your breath counts, tempo, and voice for a guided breathing session.
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <section className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
            <div className="text-sm font-semibold text-slate-500 uppercase">Presets</div>
            {activePresetIndex === null && (
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">Custom</span>
            )}
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
            {PRESETS.map((preset, index) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => applyPreset(index)}
                disabled={isRunning}
                className={`rounded-3xl px-4 py-2 text-sm font-semibold transition ${
                  activePresetIndex === index
                    ? "bg-blue-800 text-white"
                    : "border border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-100"
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {preset.name}
              </button>
            ))}
          </div>

          <div className="mb-3 border-b border-slate-200 pb-2">
            <div className="text-sm font-semibold text-slate-500 uppercase">Breath timing</div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col items-center gap-2 rounded-3xl border border-slate-200 bg-white p-3">
              <span className="text-xs font-semibold text-slate-500 uppercase">
                <br />
                Inhale
              </span>
              <input
                type="number"
                value={inhalationCount}
                min={1}
                onChange={(e) => setInhalationCount(Number(e.target.value))}
                className="w-20 rounded-xl border border-slate-300 px-3 py-2"
              />
            </label>

            <label className="flex flex-col items-center gap-2 rounded-3xl border border-slate-200 bg-white p-3">
              <span className="text-center text-xs font-semibold text-nowrap text-slate-500 uppercase">
                Hold <br />
                after inhale
              </span>
              <input
                type="number"
                value={holdAfterInhaleCount}
                min={1}
                onChange={(e) => setHoldAfterInhaleCount(Number(e.target.value))}
                className="w-20 rounded-xl border border-slate-300 px-3 py-2"
              />
            </label>

            <label className="flex flex-col items-center gap-2 rounded-3xl border border-slate-200 bg-white p-3">
              <span className="text-xs font-semibold text-slate-500 uppercase">
                <br />
                Exhale
              </span>
              <input
                type="number"
                value={exhalationCount}
                min={1}
                onChange={(e) => setExhalationCount(Number(e.target.value))}
                className="w-20 rounded-xl border border-slate-300 px-3 py-2"
              />
            </label>

            <label className="flex flex-col items-center gap-2 rounded-3xl border border-slate-200 bg-white p-3">
              <span className="text-center text-xs font-semibold text-nowrap text-slate-500 uppercase">
                Hold <br />
                after exhale
              </span>
              <input
                type="number"
                value={holdAfterExhaleCount}
                min={0}
                onChange={(e) => setHoldAfterExhaleCount(Number(e.target.value))}
                className="w-20 rounded-xl border border-slate-300 px-3 py-2"
              />
            </label>

            <label className="col-span-2 flex flex-col items-center gap-2 rounded-3xl border border-slate-200 bg-white p-3">
              <span className="text-xs font-semibold text-slate-500 uppercase">Number of Counting Cycles</span>
              <input
                type="number"
                value={cycles}
                min={1}
                onChange={(e) => setCycles(Number(e.target.value))}
                className="w-20 rounded-xl border border-slate-300 px-3 py-2"
              />
            </label>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-4 border-b border-slate-200 pb-3">
            <div className="text-sm font-semibold text-slate-500  uppercase">Session settings</div>
          </div>
          <div className="space-y-6">
            <label className="flex flex-col items-center gap-2 rounded-3xl border border-slate-200 bg-white p-3">
              <span className="text-xs font-semibold text-slate-500 uppercase">Pacing</span>
              <div className="w-full px-2">
                <input
                  type="range"
                  min={400}
                  max={1600}
                  step={50}
                  value={beatDuration}
                  onChange={(e) => {
                    setBeatDuration(Number(e.target.value));
                    if (intervalIdRef.current !== null) {
                      lastTickRef.current = performance.now();
                    }
                  }}
                  className="w-full"
                />
              </div>
              <div className="flex w-full flex-row justify-around text-xs font-medium text-slate-700">
                <div>{beatDuration}ms</div>
                <div>Tempo ♩ = {quarterNoteBpm}</div>
              </div>
            </label>

            <label className="flex flex-col items-center gap-2 rounded-3xl border border-slate-200 bg-white p-3">
              <span className="text-xs font-semibold text-slate-500 uppercase">Voice</span>
              <div className="w-full px-2">
                <select
                  className="w-full rounded-xl border border-slate-300 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isRunning}
                  onChange={(e) => setSelectedVoiceName(e.target.value)}
                  value={selectedVoiceName}
                >
                  {voices.length === 0 ? (
                    <option>Loading voices...</option>
                  ) : (
                    voices.map((voice) => (
                      <option key={voice.voiceURI} value={voice.name}>
                        {voice.name} ({voice.lang})
                      </option>
                    ))
                  )}
                </select>
              </div>
            </label>
          </div>
        </section>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          className="rounded-3xl bg-blue-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isRunning}
          onClick={breathe}
          type="button"
        >
          Start
        </button>
        <button
          className="rounded-3xl bg-red-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-800"
          onClick={stop}
          type="button"
        >
          Stop
        </button>
      </div>
    </div>
  );
}

export default BreathingCoach;
