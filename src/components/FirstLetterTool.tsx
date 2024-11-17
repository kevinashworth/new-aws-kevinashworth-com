import React, { useEffect, useRef, useState } from "react";
import speech from "./speech";

const minScrollHeight = 90;
const maxScrollHeight = 492;

function firstLetter(str: string) {
  return str.replace(/(\w)[\w'’]*/g, "$1");
}

function FirstLetterTool() {
  const [inputText, setInputText] = useState(speech);
  const [outputText, setOutputText] = useState("");

  useEffect(() => {
    const converted = firstLetter(inputText);
    setOutputText(converted);
  }, []);

  const inputTextareaRef = useRef<HTMLTextAreaElement>(null);
  const outputTextareaRef = useRef<HTMLTextAreaElement>(null);

  function adjustTextareaHeight(ref: React.RefObject<HTMLTextAreaElement>) {
    if (!ref.current) return;
    ref.current.style.height = "auto"; // Reset height to auto to get the correct scrollHeight
    const height = Math.min(Math.max(ref.current.scrollHeight, minScrollHeight), maxScrollHeight);
    ref.current.style.height = `${height}px`;
  }

  function resetTextareaHeight(ref: React.RefObject<HTMLTextAreaElement>) {
    if (!ref.current) return;
    ref.current.style.height = `${minScrollHeight}px`;
  }

  useEffect(() => {
    adjustTextareaHeight(inputTextareaRef);
    adjustTextareaHeight(outputTextareaRef);
  }, [inputText, outputText]);

  function convert() {
    if (inputText) {
      const converted = firstLetter(inputText);
      setOutputText(converted);
    }
  }

  function handleChangeInput(event: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = event.target.value;
    setInputText(value);
    const converted = firstLetter(value);
    setOutputText(converted);
  }

  function handleChangeOutput(event: React.ChangeEvent<HTMLTextAreaElement>) {
    setOutputText(event.target.value);
  }

  function handleClear() {
    setInputText("");
    setOutputText("");
    resetTextareaHeight(inputTextareaRef);
    resetTextareaHeight(outputTextareaRef);
    inputTextareaRef.current?.focus();
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-center">~ ~ ~</p>
      <textarea
        className="rounded-lg border border-gray-300 focus:border-blue-400 focus:ring-blue-400 dark:text-black"
        onChange={handleChangeInput}
        value={inputText}
        ref={inputTextareaRef}
      />
      <div className="xs:flex-row flex flex-col justify-between">
        <button
          onClick={convert}
          className="w-min whitespace-nowrap rounded-md bg-black px-4 py-0 text-base text-white dark:border"
        >
          <span className="hidden sm:inline">↑ Converts Text Above to First Letters Below ↓</span>
          <span className="inline sm:hidden">↑ Converts to First Letters ↓</span>
        </button>
        <button
          onClick={handleClear}
          className="w-min whitespace-nowrap rounded-md bg-black px-4 py-0 text-base text-white dark:border"
        >
          Clear All Fields
        </button>
      </div>
      <textarea
        className="rounded-lg border border-gray-300 font-serif focus:border-blue-400 focus:ring-blue-400 dark:text-black"
        onChange={handleChangeOutput}
        value={outputText}
        ref={outputTextareaRef}
      />
      <p className="text-center">~ ~ ~</p>
    </div>
  );
}

export default FirstLetterTool;
