import React, { useState, useRef, useEffect } from 'react';
import { Circle, Square, Download, Trash2, Save } from 'lucide-react';
import { Button } from '../common';
import { useAppStore } from '../../stores/useAppStore';
import { DatasetRecorder as Recorder, downloadDataset, type Episode } from '../../lib/datasetExporter';

export const DatasetRecorderPanel: React.FC = () => {
  const { joints, activeRobotType, selectedRobotId, wheeledRobot, drone, humanoid } = useAppStore();
  const [isRecording, setIsRecording] = useState(false);
  const [frameCount, setFrameCount] = useState(0);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const recorderRef = useRef<Recorder | null>(null);
  const intervalRef = useRef<number | null>(null);

  // Get current state based on robot type
  const getCurrentState = () => {
    switch (activeRobotType) {
      case 'wheeled': return wheeledRobot;
      case 'drone': return drone;
      case 'humanoid': return humanoid;
      default: return joints;
    }
  };

  const startRecording = () => {
    recorderRef.current = new Recorder(activeRobotType, selectedRobotId);
    recorderRef.current.startEpisode();
    setIsRecording(true);
    setFrameCount(0);

    // Record frames at 30 FPS
    intervalRef.current = window.setInterval(() => {
      if (recorderRef.current?.recording) {
        recorderRef.current.recordFrame(getCurrentState());
        setFrameCount(recorderRef.current.frameCount);
      }
    }, 33);
  };

  const stopRecording = (success = true) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (recorderRef.current) {
      const episode = recorderRef.current.endEpisode(success, 'Manual Recording');
      setEpisodes(prev => [...prev, episode]);
    }

    setIsRecording(false);
  };

  const clearEpisodes = () => {
    setEpisodes([]);
  };

  const exportDataset = () => {
    if (episodes.length > 0) {
      const name = `robosim_${activeRobotType}_${Date.now()}`;
      downloadDataset(episodes, name, 'json');
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
      <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
        <Save className="w-4 h-4 text-purple-400" />
        Dataset Recording
      </h3>

      {/* Recording Controls */}
      <div className="flex items-center gap-2 mb-3">
        {!isRecording ? (
          <Button
            variant="primary"
            size="sm"
            onClick={startRecording}
            leftIcon={<Circle className="w-3 h-3 fill-current" />}
          >
            Record
          </Button>
        ) : (
          <Button
            variant="danger"
            size="sm"
            onClick={() => stopRecording(true)}
            leftIcon={<Square className="w-3 h-3 fill-current" />}
          >
            Stop
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={exportDataset}
          disabled={episodes.length === 0}
          leftIcon={<Download className="w-4 h-4" />}
        >
          Export
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={clearEpisodes}
          disabled={episodes.length === 0 || isRecording}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Status */}
      <div className="text-xs text-slate-400 space-y-1">
        {isRecording && (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span>Recording: {frameCount} frames</span>
          </div>
        )}
        <div>Episodes: {episodes.length}</div>
        {episodes.length > 0 && (
          <div>
            Total frames: {episodes.reduce((sum, ep) => sum + ep.frames.length, 0)}
          </div>
        )}
      </div>
    </div>
  );
};
