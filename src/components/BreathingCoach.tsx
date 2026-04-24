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
  transcriptOffset?: number;
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

type TranscriptWord = {
  word: string;
  lineBreakBefore: boolean;
  lineBreakAfter: boolean;
  volume: number;
};

const getWordOffsets = (text: string) => {
  const offsets: Array<{ word: string; index: number }> = [];
  const regex = /\S+/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    offsets.push({ word: match[0], index: match.index });
  }

  return offsets;
};

const isNumeric = (text: string) => /^\d+$/.test(text);

const buildTranscriptWords = (events: ScheduledEvent[]) => {
  const tokens: TranscriptWord[] = [];

  for (let i = 0; i < events.length; i += 1) {
    const event = events[i];
    const words = getWordOffsets(event.text);
    const nextEvent = events[i + 1];
    const isStartText = i === 0 && event.text.includes(" ");
    const isGoodWork = event.text.toLowerCase().startsWith("good work");
    const isCycleStart = event.text === "Inhale" && i > 1;
    const isNextGoodWork = nextEvent?.text.toLowerCase().startsWith("good work");

    for (let wordIndex = 0; wordIndex < words.length; wordIndex += 1) {
      const isLastWord = wordIndex === words.length - 1;
      let lineBreakAfter = false;
      let lineBreakBefore = isCycleStart && wordIndex === 0;

      if (isLastWord && (isStartText || isGoodWork || isNextGoodWork)) {
        lineBreakAfter = true;
      }

      if (
        isLastWord &&
        isNumeric(event.text) &&
        i > 0 &&
        events[i - 1].text === "Exhale" &&
        (!nextEvent || !isNumeric(nextEvent.text))
      ) {
        lineBreakAfter = true;
      }

      tokens.push({
        word: words[wordIndex].word,
        lineBreakBefore,
        lineBreakAfter,
        volume: event.volume,
      });
    }
  }

  return tokens;
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

  const [transcriptWords, setTranscriptWords] = useState<TranscriptWord[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState<number | null>(null);

  const transcriptContainerRef = useRef<HTMLDivElement | null>(null);
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
    if (transcriptWords.length === 0) return;
    transcriptContainerRef.current?.scrollTo({ top: 0 });
  }, [transcriptWords]);

  useEffect(() => {
    if (currentWordIndex === null || currentWordIndex === 0) return;
    const container = transcriptContainerRef.current;
    if (!container) return;
    if (container.scrollHeight <= container.clientHeight) return;

    const currentElement = container.querySelector<HTMLElement>(`[data-transcript-index='${currentWordIndex}']`);
    const nextElement = container.querySelector<HTMLElement>(`[data-transcript-index='${currentWordIndex + 1}']`);
    if (!currentElement || !nextElement) return;

    const containerRect = container.getBoundingClientRect();
    const nextRect = nextElement.getBoundingClientRect();

    const nextVisibleBottom = containerRect.bottom - container.clientHeight * 0.05;
    if (nextRect.top <= nextVisibleBottom) {
      return;
    }

    const targetTop = currentElement.offsetTop - container.clientHeight * 0.5;
    const normalizedTop = Math.max(0, Math.min(targetTop, container.scrollHeight - container.clientHeight));
    container.scrollTo({ top: normalizedTop, behavior: "smooth" });
  }, [currentWordIndex]);

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

  const speak = (text: string, interrupt = false, volume = 1, onEnd?: () => void, transcriptOffset = 0) => {
    if (!speechSynthesisRef.current) return;
    if (interrupt) {
      speechSynthesisRef.current.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    const selectedVoice = getSelectedVoice();
    const wordOffsets = getWordOffsets(text);

    if (selectedVoice) {
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang;
    } else {
      utterance.lang = "en-US";
    }

    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = volume;

    utterance.onstart = () => {
      if (wordOffsets.length > 0) {
        setCurrentWordIndex(transcriptOffset);
      }
    };

    utterance.onboundary = (event: SpeechSynthesisEvent) => {
      if (typeof event.charIndex !== "number") return;
      const wordIndex = wordOffsets.findIndex((word, index) => {
        const start = word.index;
        const end = index + 1 < wordOffsets.length ? wordOffsets[index + 1].index : text.length;
        return event.charIndex >= start && event.charIndex < end;
      });
      if (wordIndex !== -1) {
        setCurrentWordIndex(transcriptOffset + wordIndex);
      }
    };

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
    setCurrentWordIndex(null);
  };

  const stop = () => {
    clearScheduled();
    speechSynthesisRef.current?.cancel();
    setIsRunning(false);
    setCurrentWordIndex(null);
  };

  const clearTranscript = () => {
    setTranscriptWords([]);
    setCurrentWordIndex(null);
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
        speak(nextEvent.text, nextEvent.interrupt, nextEvent.volume, undefined, nextEvent.transcriptOffset ?? 0);
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
        speak(nextEvent.text, nextEvent.interrupt, nextEvent.volume, undefined, nextEvent.transcriptOffset ?? 0);
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

    const startText =
      activePresetIndex !== null ? `Let's begin ${PRESETS[activePresetIndex].name.toLowerCase()}.` : "Let's begin.";
    const events: ScheduledEvent[] = [];
    let transcriptOffset = 0;

    events.push({
      text: startText,
      interrupt: true,
      volume: 1,
      pacing: false,
      transcriptOffset,
    });
    transcriptOffset += getWordOffsets(startText).length;

    for (let i = 0; i < cycles; i++) {
      for (const phase of [
        schedulePhase("Inhale", inhalationCount),
        schedulePhase("Hold", holdAfterInhaleCount),
        schedulePhase("Exhale", exhalationCount),
        schedulePhase("Hold", holdAfterExhaleCount),
      ]) {
        for (const event of phase) {
          events.push({ ...event, transcriptOffset });
          transcriptOffset += getWordOffsets(event.text).length;
        }
      }
    }

    events.push({
      text: "Good work.",
      interrupt: false,
      volume: 1,
      pacing: false,
      transcriptOffset,
    });

    setTranscriptWords(buildTranscriptWords(events));
    setCurrentWordIndex(0);
    eventQueueRef.current = events;
    transcriptContainerRef.current?.scrollTo({ top: 0 });
    setIsRunning(true);
    startScheduler();
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

      <div className="rounded-3xl border border-slate-200 bg-white p-4">
        <div className="text-sm font-semibold text-slate-500 uppercase">Spoken text</div>
        <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
          <div
            ref={transcriptContainerRef}
            style={{ height: "7rem" }}
            className="overflow-y-auto px-3 py-2 text-sm wrap-break-word whitespace-pre-wrap text-slate-700"
          >
            {transcriptWords.length === 0 ? (
              <span className="text-slate-500">The spoken transcript will appear here when you start a session.</span>
            ) : (
              transcriptWords.map((token, index) => {
                const volumeClass =
                  token.volume >= 1
                    ? "text-slate-900"
                    : token.volume >= 0.9
                      ? "text-slate-700"
                      : token.volume >= 0.8
                        ? "text-slate-500"
                        : "text-slate-400";

                return (
                  <span key={`${token.word}-${index}`} data-transcript-index={index}>
                    {token.lineBreakBefore ? <br /> : null}
                    <span
                      className={`${volumeClass} ${index === currentWordIndex ? "font-semibold text-slate-900" : ""}`}
                    >
                      {token.word}
                    </span>
                    {token.lineBreakAfter ? <br /> : " "}
                  </span>
                );
              })
            )}
          </div>
        </div>
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
        <button
          className="rounded-3xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isRunning || transcriptWords.length === 0}
          onClick={clearTranscript}
          type="button"
        >
          Clear text
        </button>
      </div>
    </div>
  );
}

export default BreathingCoach;
