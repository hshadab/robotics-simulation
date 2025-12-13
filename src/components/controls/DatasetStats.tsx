/**
 * Dataset Statistics Dashboard
 *
 * Displays comprehensive statistics and visualizations for recorded datasets,
 * helping users understand their data quality before exporting to LeRobot.
 */

import React, { useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Activity,
  Target,
  Film,
  FileText,
} from 'lucide-react';
import type { Episode } from '../../lib/datasetExporter';
import { getQualityLevel, getQualityColor, type EpisodeQualityMetrics } from '../../lib/teleoperationGuide';

interface DatasetStatsProps {
  episodes: Episode[];
  qualityMetrics?: EpisodeQualityMetrics[];
  hasVideos?: boolean;
}

/**
 * Progress bar component
 */
const ProgressBar: React.FC<{ value: number; max: number; color: string; label: string }> = ({
  value,
  max,
  color,
  label,
}) => {
  const percentage = max > 0 ? Math.min(100, (value / max) * 100) : 0;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="text-white">{value}</span>
      </div>
      <div className="w-full bg-slate-700/50 rounded-full h-1.5">
        <div
          className="h-1.5 rounded-full transition-all"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
};

/**
 * Mini bar chart for distribution visualization
 */
const MiniBarChart: React.FC<{ data: number[]; maxValue?: number; color: string }> = ({
  data,
  maxValue,
  color,
}) => {
  const max = maxValue || Math.max(...data, 1);

  return (
    <div className="flex items-end gap-0.5 h-8">
      {data.map((value, idx) => (
        <div
          key={idx}
          className="flex-1 rounded-t transition-all"
          style={{
            height: `${(value / max) * 100}%`,
            backgroundColor: color,
            minHeight: value > 0 ? '2px' : '0',
          }}
          title={`${value}`}
        />
      ))}
    </div>
  );
};

/**
 * Dataset Statistics Dashboard Component
 */
export const DatasetStatsDashboard: React.FC<DatasetStatsProps> = ({
  episodes,
  qualityMetrics = [],
  hasVideos = false,
}) => {
  // Calculate statistics
  const stats = useMemo(() => {
    if (episodes.length === 0) {
      return null;
    }

    const totalFrames = episodes.reduce((sum, ep) => sum + ep.frames.length, 0);
    const totalDuration = episodes.reduce((sum, ep) => sum + ep.metadata.duration, 0) / 1000;
    const successCount = episodes.filter(ep => ep.metadata.success).length;
    const successRate = (successCount / episodes.length) * 100;

    // Frame distribution
    const frameCounts = episodes.map(ep => ep.frames.length);
    const avgFrames = totalFrames / episodes.length;
    const minFrames = Math.min(...frameCounts);
    const maxFrames = Math.max(...frameCounts);

    // Duration distribution
    const durations = episodes.map(ep => ep.metadata.duration / 1000);
    const avgDuration = totalDuration / episodes.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);

    // Create histogram bins for frame distribution
    const numBins = Math.min(10, episodes.length);
    const binSize = (maxFrames - minFrames) / numBins || 1;
    const frameHistogram: number[] = new Array(numBins).fill(0);
    frameCounts.forEach(count => {
      const bin = Math.min(numBins - 1, Math.floor((count - minFrames) / binSize));
      frameHistogram[bin]++;
    });

    // Quality statistics
    const avgQuality = qualityMetrics.length > 0
      ? qualityMetrics.reduce((sum, m) => sum + m.overallScore, 0) / qualityMetrics.length
      : null;
    const avgSmoothness = qualityMetrics.length > 0
      ? qualityMetrics.reduce((sum, m) => sum + m.smoothness, 0) / qualityMetrics.length
      : null;

    // Task distribution
    const taskCounts: Record<string, number> = {};
    episodes.forEach(ep => {
      const task = ep.metadata.task || 'unspecified';
      taskCounts[task] = (taskCounts[task] || 0) + 1;
    });

    // Language instruction coverage
    const withInstruction = episodes.filter(ep => ep.metadata.languageInstruction).length;
    const instructionCoverage = (withInstruction / episodes.length) * 100;

    return {
      episodeCount: episodes.length,
      totalFrames,
      totalDuration,
      successCount,
      successRate,
      avgFrames,
      minFrames,
      maxFrames,
      avgDuration,
      minDuration,
      maxDuration,
      frameHistogram,
      avgQuality,
      avgSmoothness,
      taskCounts,
      withInstruction,
      instructionCoverage,
    };
  }, [episodes, qualityMetrics]);

  if (!stats) {
    return (
      <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 text-center">
        <BarChart3 className="w-8 h-8 text-slate-600 mx-auto mb-2" />
        <p className="text-sm text-slate-400">No episodes recorded yet</p>
        <p className="text-xs text-slate-500 mt-1">Statistics will appear after recording episodes</p>
      </div>
    );
  }

  const qualityLevel = stats.avgQuality ? getQualityLevel(stats.avgQuality) : null;
  const qualityColor = qualityLevel ? getQualityColor(qualityLevel) : '#64748b';

  return (
    <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-purple-400" />
          Dataset Statistics
        </h3>
        {stats.avgQuality !== null && (
          <span
            className="text-sm font-bold px-2 py-0.5 rounded"
            style={{ backgroundColor: `${qualityColor}20`, color: qualityColor }}
          >
            {Math.round(stats.avgQuality)}% Quality
          </span>
        )}
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-2 bg-slate-900/50 rounded-lg">
          <div className="flex items-center gap-1 text-xs text-slate-400 mb-1">
            <Film className="w-3 h-3" />
            Episodes
          </div>
          <div className="text-lg font-bold text-white">{stats.episodeCount}</div>
          <div className="flex items-center gap-1 mt-1 text-xs">
            <CheckCircle className="w-3 h-3 text-green-400" />
            <span className="text-green-400">{stats.successCount}</span>
            <XCircle className="w-3 h-3 text-red-400 ml-1" />
            <span className="text-red-400">{stats.episodeCount - stats.successCount}</span>
          </div>
        </div>

        <div className="p-2 bg-slate-900/50 rounded-lg">
          <div className="flex items-center gap-1 text-xs text-slate-400 mb-1">
            <Activity className="w-3 h-3" />
            Total Frames
          </div>
          <div className="text-lg font-bold text-white">{stats.totalFrames.toLocaleString()}</div>
          <div className="text-xs text-slate-500">
            ~{Math.round(stats.totalFrames / 30 / 60)} min @ 30fps
          </div>
        </div>

        <div className="p-2 bg-slate-900/50 rounded-lg">
          <div className="flex items-center gap-1 text-xs text-slate-400 mb-1">
            <Clock className="w-3 h-3" />
            Total Duration
          </div>
          <div className="text-lg font-bold text-white">{stats.totalDuration.toFixed(1)}s</div>
          <div className="text-xs text-slate-500">
            Avg: {stats.avgDuration.toFixed(1)}s/episode
          </div>
        </div>

        <div className="p-2 bg-slate-900/50 rounded-lg">
          <div className="flex items-center gap-1 text-xs text-slate-400 mb-1">
            <Target className="w-3 h-3" />
            Success Rate
          </div>
          <div className="text-lg font-bold" style={{ color: stats.successRate >= 50 ? '#22c55e' : '#ef4444' }}>
            {stats.successRate.toFixed(0)}%
          </div>
          <div className="text-xs text-slate-500">
            {stats.successCount}/{stats.episodeCount} episodes
          </div>
        </div>
      </div>

      {/* Frame Distribution */}
      <div className="p-2 bg-slate-900/50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-400">Frame Count Distribution</span>
          <span className="text-xs text-slate-500">
            {stats.minFrames} - {stats.maxFrames} frames
          </span>
        </div>
        <MiniBarChart data={stats.frameHistogram} color="#8b5cf6" />
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>{stats.minFrames}</span>
          <span>Avg: {Math.round(stats.avgFrames)}</span>
          <span>{stats.maxFrames}</span>
        </div>
      </div>

      {/* Quality Metrics */}
      {qualityMetrics.length > 0 && (
        <div className="p-2 bg-slate-900/50 rounded-lg space-y-2">
          <div className="flex items-center gap-1 text-xs text-slate-400 mb-2">
            <TrendingUp className="w-3 h-3" />
            Quality Metrics
          </div>
          <ProgressBar
            value={Math.round(stats.avgQuality || 0)}
            max={100}
            color={qualityColor}
            label="Overall Quality"
          />
          <ProgressBar
            value={Math.round(stats.avgSmoothness || 0)}
            max={100}
            color="#3b82f6"
            label="Motion Smoothness"
          />
        </div>
      )}

      {/* Language Instruction Coverage */}
      <div className="p-2 bg-slate-900/50 rounded-lg">
        <div className="flex items-center gap-1 text-xs text-slate-400 mb-2">
          <FileText className="w-3 h-3" />
          Language Instruction Coverage
        </div>
        <ProgressBar
          value={stats.withInstruction}
          max={stats.episodeCount}
          color={stats.instructionCoverage >= 80 ? '#22c55e' : stats.instructionCoverage >= 50 ? '#f59e0b' : '#ef4444'}
          label={`${stats.instructionCoverage.toFixed(0)}% of episodes`}
        />
        {stats.instructionCoverage < 100 && (
          <p className="text-xs text-yellow-400/80 mt-1">
            Tip: Add language instructions for better RT-1/OpenVLA training
          </p>
        )}
      </div>

      {/* Task Distribution */}
      {Object.keys(stats.taskCounts).length > 0 && (
        <div className="p-2 bg-slate-900/50 rounded-lg">
          <div className="text-xs text-slate-400 mb-2">Task Distribution</div>
          <div className="space-y-1">
            {Object.entries(stats.taskCounts).map(([task, count]) => (
              <div key={task} className="flex items-center justify-between text-xs">
                <span className="text-slate-300">{task}</span>
                <span className="text-slate-500">{count} episodes</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Data Readiness Checklist */}
      <div className="p-2 bg-slate-900/50 rounded-lg">
        <div className="text-xs text-slate-400 mb-2">LeRobot Readiness</div>
        <div className="space-y-1.5">
          <ChecklistItem
            label="Minimum episodes (≥10)"
            checked={stats.episodeCount >= 10}
            value={`${stats.episodeCount}/10`}
          />
          <ChecklistItem
            label="Success rate (≥50%)"
            checked={stats.successRate >= 50}
            value={`${stats.successRate.toFixed(0)}%`}
          />
          <ChecklistItem
            label="Consistent frame counts"
            checked={stats.maxFrames - stats.minFrames < stats.avgFrames * 0.5}
            value={`±${Math.round(((stats.maxFrames - stats.minFrames) / stats.avgFrames) * 100)}%`}
          />
          <ChecklistItem
            label="Language instructions"
            checked={stats.instructionCoverage >= 80}
            value={`${stats.instructionCoverage.toFixed(0)}%`}
          />
          {hasVideos && (
            <ChecklistItem
              label="Video recordings"
              checked={true}
              value="Enabled"
            />
          )}
        </div>
      </div>

      {/* Recommendations */}
      {getRecommendations(stats).length > 0 && (
        <div className="p-2 bg-amber-900/20 border border-amber-700/30 rounded-lg">
          <div className="text-xs text-amber-400 font-medium mb-1">Recommendations</div>
          <ul className="text-xs text-amber-300/80 space-y-0.5">
            {getRecommendations(stats).map((rec, idx) => (
              <li key={idx}>• {rec}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

/**
 * Checklist item component
 */
const ChecklistItem: React.FC<{ label: string; checked: boolean; value: string }> = ({
  label,
  checked,
  value,
}) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-1.5">
      {checked ? (
        <CheckCircle className="w-3 h-3 text-green-400" />
      ) : (
        <XCircle className="w-3 h-3 text-red-400" />
      )}
      <span className={`text-xs ${checked ? 'text-slate-300' : 'text-slate-400'}`}>{label}</span>
    </div>
    <span className={`text-xs ${checked ? 'text-green-400' : 'text-red-400'}`}>{value}</span>
  </div>
);

/**
 * Generate recommendations based on stats
 */
function getRecommendations(stats: {
  episodeCount: number;
  successRate: number;
  avgFrames: number;
  minFrames: number;
  maxFrames: number;
  instructionCoverage: number;
  avgQuality: number | null;
}): string[] {
  const recommendations: string[] = [];

  if (stats.episodeCount < 10) {
    recommendations.push(`Record ${10 - stats.episodeCount} more episodes for effective training`);
  } else if (stats.episodeCount < 50) {
    recommendations.push('Consider recording 50+ episodes for better generalization');
  }

  if (stats.successRate < 50) {
    recommendations.push('Improve success rate by practicing the task before recording');
  }

  if (stats.maxFrames - stats.minFrames > stats.avgFrames * 0.5) {
    recommendations.push('Try to keep episode lengths more consistent');
  }

  if (stats.instructionCoverage < 80) {
    recommendations.push('Add language instructions to all episodes for language-conditioned learning');
  }

  if (stats.avgQuality !== null && stats.avgQuality < 60) {
    recommendations.push('Focus on smoother, more controlled movements');
  }

  return recommendations;
}

export default DatasetStatsDashboard;
