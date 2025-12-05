import React, { useState } from 'react';
import { Share2, Copy, Check, Link, X, AlertTriangle } from 'lucide-react';
import { Button } from '../common';
import { useAppStore } from '../../stores/useAppStore';
import {
  generateShareUrl,
  estimateUrlSize,
  compressCode,
} from '../../lib/stateSerializer';

interface ShareButtonProps {
  className?: string;
}

export const ShareButton: React.FC<ShareButtonProps> = ({ className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [urlSize, setUrlSize] = useState<{ bytes: number; isLarge: boolean; warning?: string } | null>(null);

  const {
    selectedRobotId,
    activeRobotType,
    code,
    joints,
    wheeledRobot,
    drone,
    currentEnvironment,
  } = useAppStore();

  const handleOpen = () => {
    // Generate the share URL
    const options = {
      robotId: selectedRobotId,
      activeRobotType,
      code: compressCode(code.source),
      joints,
      wheeledRobot,
      drone,
      environment: currentEnvironment,
    };

    const url = generateShareUrl(options);
    const size = estimateUrlSize(options);

    setShareUrl(url);
    setUrlSize(size);
    setIsOpen(true);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setCopied(false);
  };

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={handleOpen}
        className={className}
        title="Share Simulation"
      >
        <Share2 className="w-4 h-4 mr-1.5" />
        Share
      </Button>

      {/* Share Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60" onClick={handleClose} />

          {/* Dialog */}
          <div className="relative bg-slate-800 rounded-xl border border-slate-700 shadow-2xl w-full max-w-lg p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-blue-400" />
                <h2 className="text-lg font-semibold text-slate-200">Share Simulation</h2>
              </div>
              <button
                onClick={handleClose}
                className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="space-y-4">
              <p className="text-sm text-slate-400">
                Share your simulation setup with others. The link includes your code,
                robot settings, and environment configuration.
              </p>

              {/* URL Size Warning */}
              {urlSize?.isLarge && (
                <div className="bg-amber-900/20 border border-amber-700/30 rounded-lg p-3 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-300">
                    {urlSize.warning}
                  </div>
                </div>
              )}

              {/* URL Input */}
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <Link className="w-4 h-4 text-slate-500" />
                  </div>
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-3 py-2 text-sm text-slate-300 font-mono truncate"
                  />
                </div>
                <Button
                  variant="primary"
                  onClick={handleCopy}
                  className="flex-shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-1.5" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-1.5" />
                      Copy
                    </>
                  )}
                </Button>
              </div>

              {/* What's Included */}
              <div className="bg-slate-900/50 rounded-lg p-3">
                <div className="text-xs text-slate-500 uppercase mb-2">Includes</div>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Robot: {activeRobotType}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Environment: {currentEnvironment}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Code: {code.source.length} chars
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Position state
                  </div>
                </div>
              </div>

              {/* Size Info */}
              {urlSize && (
                <div className="text-xs text-slate-500 text-center">
                  URL size: {urlSize.bytes} bytes
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
