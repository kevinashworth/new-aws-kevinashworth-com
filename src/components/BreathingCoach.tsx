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

// macOS novelty and Eloquence voices are "synthetic" and unpleasant, so we filter them out by name.
// (Filtering by voiceURI is unreliable: Firefox and older Safari report every macOS voice, good or bad,
// as com.apple.speech.synthesis.voice.*, while Chrome uses com.apple.voice.* for the good ones.)
const DISALLOWED_VOICE_NAMES = new Set([
  "albert",
  "bad news",
  "bahh",
  "bells",
  "boing",
  "bubbles",
  "cellos",
  "good news",
  "jester",
  "organ",
  "superstar",
  "trinoids",
  "whisper",
  "wobble",
  "zarvox",
  "eddy",
  "flo",
  "grandma",
  "grandpa",
  "reed",
  "rocko",
  "sandy",
  "shelley",
]);

const isEnglishVoice = (voice: SpeechSynthesisVoice) => voice.lang.toLowerCase().startsWith("en");

const isAllowedVoice = (voice: SpeechSynthesisVoice) => {
  if (!isEnglishVoice(voice)) return false;

  const uri = (voice.voiceURI ?? "").toLowerCase();
  if (uri.includes("com.apple.eloquence")) return false;

  // Names may carry a suffix such as "Grandma (English (US))"
  const baseName = voice.name.split(" (")[0].trim().toLowerCase();
  return !DISALLOWED_VOICE_NAMES.has(baseName);
};

const getPreferredVoice = (voices: SpeechSynthesisVoice[]) =>
  voices.find((voice) => voice.name.toLowerCase().includes("karen")) || voices[0] || null;

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

// Speech-end watchdog: "Let's begin 4-7-8 breathing." (28 chars) gets 3s + 28 * 150ms = 7.2s.
const UTTERANCE_TIMEOUT_BASE_MS = 3000;
const UTTERANCE_TIMEOUT_PER_CHAR_MS = 150;

// Pause after cancel() before the next utterance; speaking immediately after a cancel() is unreliable in Firefox.
const CANCEL_SETTLE_MS = 400;

// What the voice is given for one displayed word. Hyphens between digits become spaces, because some voices read
// "4-7-8" as "four seven dash eight"; "4 7 8" is read as "four seven eight".
const toSpokenWord = (word: string) => word.replace(/(\d)-(?=\d)/g, "$1 ");

// Builds the text to speak from the displayed text, and records where each displayed word starts in it, so boundary
// events (whose charIndex refers to the spoken text) still highlight the right displayed word.
const toSpeech = (text: string) => {
  const spokenStarts: number[] = [];
  let spokenText = "";
  for (const { word } of getWordOffsets(text)) {
    if (spokenText) spokenText += " ";
    spokenStarts.push(spokenText.length);
    spokenText += toSpokenWord(word);
  }
  return { spokenText, spokenStarts };
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
  const [voicesLoaded, setVoicesLoaded] = useState<boolean>(false);

  const [transcriptWords, setTranscriptWords] = useState<TranscriptWord[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState<number | null>(null);

  const transcriptContainerRef = useRef<HTMLDivElement | null>(null);
  const beatDurationRef = useRef<number>(1000);
  const eventQueueRef = useRef<ScheduledEvent[]>([]);
  const intervalIdRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);
  const speechSynthesisRef = useRef<SpeechSynthesis | null>(null);
  // The utterance we're waiting on. We track this ourselves rather than trusting synth.speaking, because Firefox
  // updates speaking asynchronously, and queueing a second utterance while the first is starting hangs its macOS engine.
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  // When we last called cancel(). Firefox needs a moment after cancel() before it will speak again.
  const lastCancelAtRef = useRef<number>(-Infinity);
  // Bumped on every Start and Stop, so a word still finishing from an old session can't move the transcript highlight.
  const sessionIdRef = useRef<number>(0);

  const quarterNoteBpm = Math.round(60000 / beatDuration);

  const loadVoices = useCallback(() => {
    if (!speechSynthesisRef.current) return;
    const loadedVoices = speechSynthesisRef.current.getVoices();
    let englishVoices = loadedVoices.filter(isAllowedVoice);
    // Never let the filter leave the dropdown empty when the browser does have voices.
    if (englishVoices.length === 0) englishVoices = loadedVoices.filter(isEnglishVoice);
    if (englishVoices.length === 0) englishVoices = [...loadedVoices];
    englishVoices.sort((a, b) => a.name.localeCompare(b.name));
    console.group("Available English Voices");
    englishVoices.forEach(logVoice);
    console.groupEnd();
    setVoices(englishVoices);
    if (loadedVoices.length > 0) setVoicesLoaded(true);
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

    // If the browser never reports any voices, stop showing "Loading voices..." and use its default voice.
    const voicesTimeoutId = window.setTimeout(() => setVoicesLoaded(true), 3000);

    return () => {
      window.clearTimeout(voicesTimeoutId);
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
    const synth = speechSynthesisRef.current;
    if (!synth) return;
    if (interrupt) {
      cancelSpeech();
    }

    const { spokenText, spokenStarts } = toSpeech(text);
    const utterance = new SpeechSynthesisUtterance(spokenText);
    const selectedVoice = getSelectedVoice();
    const sessionId = sessionIdRef.current;

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
      if (sessionId !== sessionIdRef.current) return;
      if (spokenStarts.length > 0) {
        setCurrentWordIndex(transcriptOffset);
      }
    };

    utterance.onboundary = (event: SpeechSynthesisEvent) => {
      if (sessionId !== sessionIdRef.current) return;
      if (typeof event.charIndex !== "number") return;
      // The displayed word is the last one starting at or before charIndex in the spoken text.
      let wordIndex = -1;
      for (let i = 0; i < spokenStarts.length && spokenStarts[i] <= event.charIndex; i += 1) wordIndex = i;
      if (wordIndex !== -1) {
        setCurrentWordIndex(transcriptOffset + wordIndex);
      }
    };

    let watchdogId: number | undefined;
    const finish = () => {
      window.clearTimeout(watchdogId);
      if (activeUtteranceRef.current === utterance) activeUtteranceRef.current = null;
    };

    utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
      finish();
      if (event.error === "canceled" || event.error === "interrupted") return;
      console.warn(
        `Speech error "${event.error}" speaking "${text}" with`,
        utterance.voice?.voiceURI ?? "default voice",
      );
    };

    utterance.onend = () => {
      finish();
      onEnd?.();
    };

    activeUtteranceRef.current = utterance;
    synth.speak(utterance);

    // If the engine never reports the end of this utterance (seen with Firefox on macOS), give up on it after a
    // generous allowance for its length so the session moves on instead of stalling.
    watchdogId = window.setTimeout(
      () => {
        if (activeUtteranceRef.current !== utterance) return;
        console.warn(`Speech timed out speaking "${text}"; moving on`);
        cancelSpeech(true);
      },
      UTTERANCE_TIMEOUT_BASE_MS + text.length * UTTERANCE_TIMEOUT_PER_CHAR_MS,
    );
  };

  // Only cancel when one of our utterances is in flight. We don't trust synth.speaking: Firefox can keep reporting
  // true after a cancel(), and a second cancel() right before speak() leaves its macOS engine silent.
  const cancelSpeech = (force = false) => {
    const synth = speechSynthesisRef.current;
    if (!synth || (!force && !activeUtteranceRef.current)) return;
    activeUtteranceRef.current = null;
    synth.cancel();
    lastCancelAtRef.current = performance.now();
  };

  const clearScheduled = () => {
    if (intervalIdRef.current !== null) {
      window.clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
    eventQueueRef.current = [];
    setCurrentWordIndex(null);
  };

  // Stop doesn't cancel() the word being spoken: cancelling mid-word leaves Firefox's macOS engine permanently
  // silent. We stop scheduling and let that one short word finish; a new Start waits for it (see activeUtteranceRef).
  const stop = () => {
    sessionIdRef.current += 1;
    clearScheduled();
    setIsRunning(false);
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

      // Never queue a second utterance behind one that hasn't finished (see activeUtteranceRef).
      if (activeUtteranceRef.current) {
        return;
      }

      // Let the engine settle after a cancel() (Stop, then Start again) before speaking.
      if (now - lastCancelAtRef.current < CANCEL_SETTLE_MS) {
        lastTickRef.current = now;
        return;
      }

      if (!nextEvent.pacing) {

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
        // If a slow utterance made us fall behind, resync instead of rushing through the backlog.
        if (now - lastTickRef.current > beatDurationRef.current) {
          lastTickRef.current = now;
        }
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
                } disabled:cursor-not-allowed disabled:opacity-50`}>
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
                  value={selectedVoiceName}>
                  {voices.length === 0 ? (
                    <option value="">{voicesLoaded ? "Default voice" : "Loading voices..."}</option>
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
            className="overflow-y-auto px-3 py-2 text-sm wrap-break-word whitespace-pre-wrap text-slate-700">
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
                      className={`${volumeClass} ${index === currentWordIndex ? "font-semibold text-slate-900" : ""}`}>
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
          type="button">
          Start
        </button>
        <button
          className="rounded-3xl bg-red-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-800"
          onClick={stop}
          type="button">
          Stop
        </button>
      </div>
    </div>
  );
}

export default BreathingCoach;
