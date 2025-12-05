import React, { useState } from 'react';
import {
  Download,
  X,
  Copy,
  Check,
  AlertTriangle,
  ChevronDown,
  ExternalLink,
  Cpu,
} from 'lucide-react';
import { Button } from '../common';
import { useAppStore } from '../../stores/useAppStore';
import {
  exportCode,
  downloadCode,
  copyCodeToClipboard,
  getSupportedExports,
  type ExportLanguage,
  type ExportResult,
} from '../../lib/codeExporter';
import { getHardwareKit } from '../../config/hardwareKits';
import { ROBOT_PROFILES } from '../../config/robots';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({ isOpen, onClose }) => {
  const { code, selectedRobotId, activeRobotType } = useAppStore();

  const [selectedKitId, setSelectedKitId] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<ExportLanguage>('arduino');
  const [includeComments, setIncludeComments] = useState(true);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [showKitDropdown, setShowKitDropdown] = useState(false);

  // Get supported exports for current robot
  const supportedExports = getSupportedExports(selectedRobotId);
  const robot = ROBOT_PROFILES.find(r => r.id === selectedRobotId);

  // Derive selected kit - auto-select first when dialog opens
  const effectiveKitId = selectedKitId || (isOpen && supportedExports.length > 0 ? supportedExports[0].kitId : '');
  const selectedKit = getHardwareKit(effectiveKitId);

  // Derive selected language - ensure compatibility with kit
  const effectiveLanguage = selectedKit && !selectedKit.programmingLanguages.includes(selectedLanguage)
    ? (selectedKit.programmingLanguages[0] as ExportLanguage)
    : selectedLanguage;

  const handleExport = () => {
    if (!robot || !effectiveKitId) return;

    const result = exportCode(code.source, robot, {
      language: effectiveLanguage,
      robotId: selectedRobotId,
      hardwareKitId: effectiveKitId,
      includeComments,
      includeSetupInstructions: true,
    });

    setExportResult(result);
  };

  const handleDownload = () => {
    if (exportResult?.success) {
      downloadCode(exportResult);
    }
  };

  const handleCopy = async () => {
    if (exportResult?.success) {
      const success = await copyCodeToClipboard(exportResult);
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Dialog */}
      <div className="relative bg-slate-800 rounded-xl border border-slate-700 shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-slate-200">Export to Hardware</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Robot Info */}
          <div className="bg-slate-900/50 rounded-lg p-3">
            <div className="text-xs text-slate-500 uppercase mb-1">Exporting Code For</div>
            <div className="text-sm font-medium text-slate-200">
              {robot?.name || 'Unknown Robot'} ({activeRobotType})
            </div>
          </div>

          {supportedExports.length === 0 ? (
            <div className="bg-amber-900/20 border border-amber-700/30 rounded-lg p-4">
              <div className="flex items-center gap-2 text-amber-400">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-medium">No Hardware Mappings Available</span>
              </div>
              <p className="text-sm text-slate-400 mt-2">
                There are no pre-configured hardware mappings for this robot type yet.
                Check back later or create a custom mapping.
              </p>
            </div>
          ) : (
            <>
              {/* Hardware Kit Selection */}
              <div>
                <label className="block text-xs text-slate-400 uppercase mb-2">
                  Target Hardware
                </label>
                <div className="relative">
                  <button
                    onClick={() => setShowKitDropdown(!showKitDropdown)}
                    className="w-full flex items-center justify-between bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2.5 text-left hover:border-slate-600 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-blue-400" />
                      <div>
                        <div className="text-sm text-slate-200">
                          {selectedKit?.name || 'Select Hardware Kit'}
                        </div>
                        {selectedKit && (
                          <div className="text-xs text-slate-500">
                            {selectedKit.processor} | {selectedKit.voltage}V
                          </div>
                        )}
                      </div>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showKitDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {showKitDropdown && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowKitDropdown(false)} />
                      <div className="absolute left-0 right-0 top-full mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-20 max-h-64 overflow-y-auto">
                        {supportedExports.map(({ kitId, kitName }) => {
                          const kit = getHardwareKit(kitId);
                          return (
                            <button
                              key={kitId}
                              onClick={() => {
                                setSelectedKitId(kitId);
                                setShowKitDropdown(false);
                                setExportResult(null);
                              }}
                              className={`w-full text-left px-3 py-2.5 hover:bg-slate-700/50 ${
                                kitId === effectiveKitId ? 'bg-blue-600/20 border-l-2 border-blue-500' : ''
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <Cpu className="w-4 h-4 text-slate-400" />
                                <div>
                                  <div className="text-sm text-slate-200">{kitName}</div>
                                  {kit && (
                                    <div className="text-xs text-slate-500">
                                      {kit.processor} | {kit.flashKb}KB Flash
                                    </div>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Language Selection */}
              {selectedKit && (
                <div>
                  <label className="block text-xs text-slate-400 uppercase mb-2">
                    Export Language
                  </label>
                  <div className="flex gap-2">
                    {selectedKit.programmingLanguages.map(lang => (
                      <button
                        key={lang}
                        onClick={() => {
                          setSelectedLanguage(lang as ExportLanguage);
                          setExportResult(null);
                        }}
                        className={`flex-1 px-3 py-2 rounded-lg border transition-colors ${
                          effectiveLanguage === lang
                            ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                            : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        <div className="text-sm font-medium">
                          {lang === 'arduino' ? 'Arduino C++' :
                           lang === 'micropython' ? 'MicroPython' :
                           lang === 'circuitpython' ? 'CircuitPython' : lang}
                        </div>
                        <div className="text-xs opacity-70">
                          {lang === 'arduino' ? '.ino' : '.py'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Options */}
              <div>
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeComments}
                    onChange={e => setIncludeComments(e.target.checked)}
                    className="rounded border-slate-600 bg-slate-900 text-blue-500 focus:ring-blue-500"
                  />
                  Include explanatory comments
                </label>
              </div>

              {/* Generate Button */}
              <Button
                variant="primary"
                className="w-full"
                onClick={handleExport}
                disabled={!effectiveKitId}
              >
                Generate Code
              </Button>

              {/* Export Result */}
              {exportResult && (
                <div className="space-y-3">
                  {/* Warnings */}
                  {exportResult.warnings.length > 0 && (
                    <div className="bg-amber-900/20 border border-amber-700/30 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-amber-400 text-sm font-medium mb-1">
                        <AlertTriangle className="w-4 h-4" />
                        Warnings
                      </div>
                      <ul className="text-xs text-slate-400 space-y-1">
                        {exportResult.warnings.map((w, i) => (
                          <li key={i}>- {w}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Errors */}
                  {exportResult.errors.length > 0 && (
                    <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-red-400 text-sm font-medium mb-1">
                        <AlertTriangle className="w-4 h-4" />
                        Errors
                      </div>
                      <ul className="text-xs text-slate-400 space-y-1">
                        {exportResult.errors.map((e, i) => (
                          <li key={i}>- {e}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Generated Code Preview */}
                  {exportResult.success && (
                    <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700 bg-slate-800/50">
                        <div className="text-sm text-slate-300 font-mono">
                          {exportResult.filename}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCopy}
                            title="Copy to Clipboard"
                          >
                            {copied ? (
                              <Check className="w-4 h-4 text-green-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleDownload}
                            title="Download File"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <pre className="p-3 text-xs font-mono text-slate-300 overflow-x-auto max-h-64 overflow-y-auto">
                        {exportResult.code}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* Help Links */}
              {selectedKit?.documentationUrl && (
                <div className="pt-2 border-t border-slate-700">
                  <a
                    href={selectedKit.documentationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {selectedKit.name} Documentation
                  </a>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-700 bg-slate-800/50">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Generated code is a starting point. Always verify pin connections before uploading!
            </p>
            <Button variant="secondary" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
