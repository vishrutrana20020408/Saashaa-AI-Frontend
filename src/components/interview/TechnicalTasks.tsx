"use client";

import React, { useState, useEffect } from "react";
import { 
  Keyboard, 
  Code2, 
  Timer, 
  CheckCircle2, 
  AlertTriangle,
  Play
} from "lucide-react";
import Editor from "@monaco-editor/react";

interface TypingTestProps {
  onComplete: (stats: { wpm: number, accuracy: number }) => void;
}

export function TypingTest({ onComplete }: TypingTestProps) {
  const text = "The quick brown fox jumps over the lazy dog. Programming is the art of telling another human being what one wants the computer to do. Clean code always looks like it was written by someone who cares.";
  const [input, setInput] = useState("");
  const [startTime, setStartTime] = useState<number | null>(null);
  const [wpm, setWpm] = useState(0);

  useEffect(() => {
    if (input.length === 1 && !startTime) setStartTime(Date.now());
    if (input.length === text.length) {
      const duration = (Date.now() - (startTime || 0)) / 60000;
      const calculatedWpm = Math.round((text.length / 5) / duration);
      setWpm(calculatedWpm);
      onComplete({ wpm: calculatedWpm, accuracy: 100 });
    }
  }, [input, startTime, text.length, onComplete]);

  return (
    <div className="space-y-4 p-4 sm:p-6 bg-slate-900 rounded-3xl border border-white/10 text-white max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2"><Keyboard /> Typing Speed Test</h3>
        <div className="px-3 py-1 bg-indigo-600 rounded-lg text-xs font-bold self-start">WPM: {wpm}</div>
      </div>
      <p className="p-3 sm:p-4 bg-white/5 rounded-xl border border-white/10 font-mono leading-relaxed select-none text-sm sm:text-base">{text}</p>
      <textarea 
        className="w-full p-3 sm:p-4 bg-white/10 rounded-xl border border-white/20 focus:border-indigo-500 outline-none font-mono text-sm sm:text-base resize-none"
        rows={4}
        value={input}
        onChange={(e) => {
          const nextValue = e.target.value;
          if (nextValue.length === 1 && !startTime) {
            setStartTime(Date.now());
          }
          setInput(nextValue);
        }}
        placeholder="Start typing the text above..."
      />
    </div>
  );
}

interface CodeEditorProps {
  onComplete: (code: string) => void;
}

export function CodeEditor({ onComplete }: CodeEditorProps) {
  const [code, setCode] = useState("// Write your solution here\nfunction solve(n) {\n  return n * 2;\n}");

  return (
    <div className="space-y-4 p-4 sm:p-6 bg-[#1e1e1e] rounded-3xl border border-white/10 text-white h-96 sm:h-125 flex flex-col max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2"><Code2 /> Online Code Compiler</h3>
        <button 
          onClick={() => onComplete(code)}
          className="px-4 sm:px-6 py-2 bg-emerald-600 rounded-xl font-bold hover:bg-emerald-700 transition flex items-center gap-2 self-start sm:self-auto"
        >
          <Play size={16} /> Run & Submit
        </button>
      </div>
      <div className="flex-1 rounded-xl overflow-hidden border border-white/10 min-h-64 sm:min-h-80">
        <Editor
          height="100%"
          defaultLanguage="javascript"
          theme="vs-dark"
          value={code}
          onChange={(val) => setCode(val || "")}
          options={{ 
            fontSize: 12, 
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: 'on'
          }}
        />
      </div>
    </div>
  );
}
