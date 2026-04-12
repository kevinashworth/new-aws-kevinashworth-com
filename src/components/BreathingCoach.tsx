import React, { useEffect, useRef, useState } from "react";

function logVoice(voice: SpeechSynthesisVoice | null) {
  if (!voice) {
    console.log("No voice selected");
    return;
  }
  console.log(`${voice.name} (${voice.lang}) — ${voice.voiceURI}`);
}

const BreathingCoach: React.FC = () => {
  const [inhalationCount, setInhalationCount] = useState<number>(4);
  const [holdCount, setHoldCount] = useState<number>(7);
  const [exhalationCount, setExhalationCount] = useState<number>(8);
  const [holdAfterExhaleCount, setHoldAfterExhaleCount] = useState<number>(0);
  const [repetitions, setRepetitions] = useState<number>(1);
  const [beatDuration, setBeatDuration] = useState<number>(1000);
  const beatDurationRef = useRef<number>(1000);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>("");

  const speechSynthesisRef = useRef<SpeechSynthesis | null>(null);
  type ScheduledEvent = {
    text: string;
    interrupt: boolean;
    volume: number;
    pacing: boolean;
  };
  const eventQueueRef = useRef<ScheduledEvent[]>([]);
  const intervalIdRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);

  // Some voices are very "synthetic" and unpleasant, so we filter them out. We also prefer certain voices when available.
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

  const loadVoices = () => {
    if (!speechSynthesisRef.current) return;
    const loadedVoices = speechSynthesisRef.current.getVoices();
    // console.log("loaded voices:", loadedVoices);
    const englishVoices = loadedVoices.filter(isAllowedVoice).sort((a, b) => a.name.localeCompare(b.name));
    // console.log("en voices:", englishVoices);
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
  };

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
    if (isNaN(inhalationCount) || isNaN(holdCount) || isNaN(exhalationCount) || isNaN(repetitions)) {
      alert("Please enter valid numbers.");
      return;
    }

    stop();
    setIsRunning(true);

    eventQueueRef.current = [];

    for (let i = 0; i < repetitions; i++) {
      eventQueueRef.current.push(...schedulePhase("Inhale", inhalationCount));
      eventQueueRef.current.push(...schedulePhase("Hold", holdCount));
      eventQueueRef.current.push(...schedulePhase("Exhale", exhalationCount));
      eventQueueRef.current.push(...schedulePhase("Hold", holdAfterExhaleCount));
    }

    eventQueueRef.current.push({ text: "Good work.", interrupt: false, volume: 1, pacing: false });
    speak("Let's begin.", true, 1, startScheduler);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        <label className="flex flex-col gap-2">
          <span>Inhale</span>
          <input
            type="number"
            value={inhalationCount}
            min={1}
            onChange={(e) => setInhalationCount(Number(e.target.value))}
            className="w-16 rounded border px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span>Hold</span>
          <input
            type="number"
            value={holdCount}
            min={1}
            onChange={(e) => setHoldCount(Number(e.target.value))}
            className="w-16 rounded border px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span>Exhale</span>
          <input
            type="number"
            value={exhalationCount}
            min={1}
            onChange={(e) => setExhalationCount(Number(e.target.value))}
            className="w-16 rounded border px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span>Hold</span>
          <input
            type="number"
            value={holdAfterExhaleCount}
            min={0}
            onChange={(e) => setHoldAfterExhaleCount(Number(e.target.value))}
            className="w-16 rounded border px-3 py-2"
          />
        </label>

        <label className="col-span-4 flex flex-col gap-2">
          <span>Number of Cycles to Speak</span>
          <input
            type="number"
            value={repetitions}
            min={1}
            onChange={(e) => setRepetitions(Number(e.target.value))}
            className="w-16 rounded border px-3 py-2"
          />
        </label>
      </div>

      <div className="flex flex-col gap-4">
        <label className="flex max-w-xl flex-col gap-2">
          <span>Pacing</span>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={400}
              max={1600}
              step={100}
              value={beatDuration}
              onChange={(e) => {
                const next = Number(e.target.value);
                setBeatDuration(next);
                beatDurationRef.current = next;
                if (intervalIdRef.current !== null) {
                  lastTickRef.current = performance.now();
                }
              }}
              className="w-full"
            />
            <span className="min-w-16 text-right">{beatDuration}ms</span>
          </div>
        </label>

        <label className="flex max-w-xl flex-col gap-2">
          <span>Voice</span>
          <select
            value={selectedVoiceName}
            onChange={(e) => setSelectedVoiceName(e.target.value)}
            className="w-96 rounded border px-3 py-2"
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
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={breathe}
          disabled={isRunning}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          Start the Coaching
        </button>
        <button type="button" onClick={stop} className="rounded bg-red-500 px-4 py-2 text-white">
          Stop
        </button>
      </div>
    </div>
  );
};

export default BreathingCoach;
