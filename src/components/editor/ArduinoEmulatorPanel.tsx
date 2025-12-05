import React, { useState, useRef, useEffect } from 'react';
import { Cpu, Play, Square, Terminal, Upload, Trash2 } from 'lucide-react';
import { Button } from '../common';
import { useArduinoEmulator } from '../../hooks/useArduinoEmulator';

export const ArduinoEmulatorPanel: React.FC = () => {
  const { isRunning, serialOutput, loadHex, start, stop, reset } = useArduinoEmulator();
  const [hexInput, setHexInput] = useState('');
  const [showHexInput, setShowHexInput] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [serialOutput]);

  const handleLoadHex = () => {
    if (hexInput.trim()) {
      loadHex(hexInput.trim());
      setHexInput('');
      setShowHexInput(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const hex = event.target?.result as string;
        loadHex(hex);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4 h-full flex flex-col">
      <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
        <Cpu className="w-4 h-4 text-cyan-400" />
        Arduino Emulator (ATmega328p)
      </h3>

      {/* Controls */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {!isRunning ? (
          <Button
            variant="primary"
            size="sm"
            onClick={start}
            leftIcon={<Play className="w-4 h-4" />}
          >
            Run
          </Button>
        ) : (
          <Button
            variant="danger"
            size="sm"
            onClick={stop}
            leftIcon={<Square className="w-4 h-4" />}
          >
            Stop
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={reset}
          disabled={isRunning}
        >
          Reset
        </Button>

        <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-md text-slate-300 hover:bg-slate-700/50 transition">
          <input
            type="file"
            accept=".hex"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Upload className="w-4 h-4" />
          Load .hex
        </label>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowHexInput(!showHexInput)}
        >
          Paste Hex
        </Button>
      </div>

      {/* Hex Input */}
      {showHexInput && (
        <div className="mb-3">
          <textarea
            value={hexInput}
            onChange={(e) => setHexInput(e.target.value)}
            placeholder="Paste Intel HEX data here..."
            className="w-full h-20 p-2 text-xs bg-slate-900 border border-slate-600 rounded text-white font-mono placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
          />
          <div className="flex gap-2 mt-1">
            <Button variant="primary" size="sm" onClick={handleLoadHex}>
              Load
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowHexInput(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Serial Terminal */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Terminal className="w-3 h-3" />
            Serial Output (9600 baud)
          </span>
          <button
            onClick={reset}
            className="p-1 text-slate-400 hover:text-white transition"
            title="Clear output"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
        <div
          ref={terminalRef}
          className="flex-1 bg-slate-950 rounded border border-slate-700 p-2 font-mono text-xs text-green-400 overflow-y-auto min-h-[100px]"
        >
          {serialOutput || <span className="text-slate-600">No output yet...</span>}
        </div>
      </div>

      {/* Status */}
      <div className="mt-2 flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`} />
        <span className="text-xs text-slate-400">
          {isRunning ? 'Running' : 'Stopped'}
        </span>
      </div>

      {/* Info */}
      <p className="text-xs text-slate-500 mt-2">
        Compile Arduino sketches to .hex and load them here. Servo outputs on pins 9-12 control robot joints.
      </p>
    </div>
  );
};
