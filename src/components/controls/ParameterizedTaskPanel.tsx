/**
 * Parameterized Task Panel
 *
 * Allows users to configure and run parameterized task templates
 * with randomizable parameters for generating diverse training data.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Settings,
  Play,
  Pause,
  Square,
  ChevronDown,
  ChevronUp,
  Shuffle,
  RotateCcw,
  Sliders,
  Package,
  Target,
  Eye,
} from 'lucide-react';
import { Button } from '../common';
import { useAppStore } from '../../stores/useAppStore';
import { useTrajectoryExecution } from '../../hooks/useTrajectoryExecution';
import {
  PARAMETERIZED_TEMPLATES,
  resolveTaskTemplate,
  getDefaultParameterValues,
  type ParameterizedTaskTemplate,
  type TaskParameter,
} from '../../lib/taskTemplates';

interface ParameterSliderProps {
  param: TaskParameter;
  value: number;
  onChange: (value: number) => void;
  onRandomizeToggle: (randomize: boolean) => void;
}

const ParameterSlider: React.FC<ParameterSliderProps> = ({
  param,
  value,
  onChange,
  onRandomizeToggle,
}) => {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-xs text-slate-300">{param.description}</label>
        <button
          onClick={() => onRandomizeToggle(!param.randomize)}
          className={`p-1 rounded transition-colors ${
            param.randomize
              ? 'text-orange-400 bg-orange-400/20'
              : 'text-slate-500 hover:text-slate-400'
          }`}
          title={param.randomize ? 'Randomization ON' : 'Randomization OFF'}
        >
          <Shuffle className="w-3 h-3" />
        </button>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={param.min}
          max={param.max}
          step={(param.max - param.min) / 100}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer
                     [&::-webkit-slider-thumb]:appearance-none
                     [&::-webkit-slider-thumb]:w-3
                     [&::-webkit-slider-thumb]:h-3
                     [&::-webkit-slider-thumb]:rounded-full
                     [&::-webkit-slider-thumb]:bg-blue-500"
        />
        <span className="text-xs text-slate-400 w-16 text-right">
          {value.toFixed(param.unit === 'x' ? 1 : 0)}
          {param.unit}
        </span>
      </div>
      {param.randomize && (
        <div className="text-xs text-orange-400/70">
          Range: {param.min}{param.unit} to {param.max}{param.unit}
        </div>
      )}
    </div>
  );
};

export const ParameterizedTaskPanel: React.FC = () => {
  const { isAnimating, activeRobotType } = useAppStore();
  const { state, executeWaypoints, pause, resume, stop } = useTrajectoryExecution();

  const [expanded, setExpanded] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<ParameterizedTaskTemplate | null>(null);
  const [showParameters, setShowParameters] = useState(false);
  const [parameterValues, setParameterValues] = useState<Record<string, number>>({});
  const [parameterConfig, setParameterConfig] = useState<Record<string, TaskParameter>>({});

  // Initialize parameters when template is selected
  const handleSelectTemplate = useCallback((template: ParameterizedTaskTemplate) => {
    setSelectedTemplate(template);
    setParameterValues(getDefaultParameterValues(template));
    // Create a mutable copy of parameters for randomize toggles
    const config: Record<string, TaskParameter> = {};
    template.parameters.forEach((p) => {
      config[p.name] = { ...p };
    });
    setParameterConfig(config);
    setShowParameters(true);
  }, []);

  // Update parameter value
  const handleParameterChange = useCallback((name: string, value: number) => {
    setParameterValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  // Toggle randomization for a parameter
  const handleRandomizeToggle = useCallback((name: string, randomize: boolean) => {
    setParameterConfig((prev) => ({
      ...prev,
      [name]: { ...prev[name], randomize },
    }));
  }, []);

  // Reset to default values
  const handleResetDefaults = useCallback(() => {
    if (selectedTemplate) {
      setParameterValues(getDefaultParameterValues(selectedTemplate));
    }
  }, [selectedTemplate]);

  // Run the task with current or randomized parameters
  const handleRunTask = useCallback(
    (useRandomization = false) => {
      if (!selectedTemplate) return;

      // Create template with updated randomize flags
      const templateWithConfig: ParameterizedTaskTemplate = {
        ...selectedTemplate,
        parameters: selectedTemplate.parameters.map((p) => ({
          ...p,
          randomize: useRandomization && (parameterConfig[p.name]?.randomize ?? p.randomize),
        })),
      };

      // Resolve with current values (or randomize if enabled)
      const resolved = resolveTaskTemplate(
        templateWithConfig,
        useRandomization ? undefined : parameterValues
      );

      // Update displayed values to show what was actually used
      if (useRandomization) {
        setParameterValues(resolved.parameterValues);
      }

      executeWaypoints(resolved.waypoints, resolved.durations, 'cubic');
    },
    [selectedTemplate, parameterValues, parameterConfig, executeWaypoints]
  );

  const handleStop = useCallback(() => {
    stop();
  }, [stop]);

  // Group templates by category
  const templatesByCategory = useMemo(() => {
    const groups: Record<string, ParameterizedTaskTemplate[]> = {
      manipulation: [],
      navigation: [],
      inspection: [],
    };
    PARAMETERIZED_TEMPLATES.forEach((t) => {
      groups[t.category].push(t);
    });
    return groups;
  }, []);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'manipulation':
        return <Package className="w-3 h-3" />;
      case 'inspection':
        return <Eye className="w-3 h-3" />;
      default:
        return <Target className="w-3 h-3" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'manipulation':
        return 'text-blue-400';
      case 'navigation':
        return 'text-green-400';
      case 'inspection':
        return 'text-purple-400';
      default:
        return 'text-slate-400';
    }
  };

  // Only show for arm robot
  if (activeRobotType !== 'arm') return null;

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Sliders className="w-4 h-4 text-purple-400" />
          Parameterized Tasks
        </h3>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1 text-slate-400 hover:text-white transition-colors"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {expanded && (
        <>
          {/* Execution status */}
          {state.isExecuting && (
            <div className="mb-3 p-2 bg-slate-900/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400">Running task...</span>
                <div className="flex gap-1">
                  <button
                    onClick={state.isPaused ? resume : pause}
                    className="p-1 text-slate-400 hover:text-white transition-colors"
                  >
                    {state.isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                  </button>
                  <button
                    onClick={handleStop}
                    className="p-1 text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Square className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 transition-all duration-100"
                  style={{ width: `${state.progress * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Template selection */}
          {!selectedTemplate && (
            <div className="space-y-3">
              {Object.entries(templatesByCategory).map(([category, templates]) =>
                templates.length > 0 ? (
                  <div key={category}>
                    <div className={`text-xs font-medium mb-2 flex items-center gap-1 ${getCategoryColor(category)}`}>
                      {getCategoryIcon(category)}
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </div>
                    <div className="space-y-1">
                      {templates.map((template) => (
                        <button
                          key={template.id}
                          onClick={() => handleSelectTemplate(template)}
                          className="w-full p-2 text-left rounded-lg bg-slate-900/50 border border-slate-700/50
                                   hover:border-purple-500/50 hover:bg-purple-500/10 transition-colors"
                        >
                          <div className="text-sm font-medium text-white">{template.name}</div>
                          <div className="text-xs text-slate-400">{template.description}</div>
                          <div className="text-xs text-slate-500 mt-1">
                            {template.parameters.length} parameters, {template.waypoints.length} waypoints
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null
              )}
            </div>
          )}

          {/* Parameter configuration */}
          {selectedTemplate && (
            <div className="space-y-3">
              {/* Back button and template name */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    setSelectedTemplate(null);
                    setShowParameters(false);
                  }}
                  className="text-xs text-slate-400 hover:text-white transition-colors"
                >
                  &larr; Back to templates
                </button>
                <button
                  onClick={() => setShowParameters(!showParameters)}
                  className="p-1 text-slate-400 hover:text-white transition-colors"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>

              <div className="p-2 bg-slate-900/50 rounded-lg">
                <div className="text-sm font-medium text-white">{selectedTemplate.name}</div>
                <div className="text-xs text-slate-400">{selectedTemplate.description}</div>
              </div>

              {/* Parameters */}
              {showParameters && (
                <div className="space-y-3 p-3 bg-slate-900/30 rounded-lg border border-slate-700/30">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-300">Parameters</span>
                    <button
                      onClick={handleResetDefaults}
                      className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reset
                    </button>
                  </div>

                  {selectedTemplate.parameters.map((param) => (
                    <ParameterSlider
                      key={param.name}
                      param={{ ...param, randomize: parameterConfig[param.name]?.randomize ?? param.randomize }}
                      value={parameterValues[param.name] ?? param.defaultValue}
                      onChange={(value) => handleParameterChange(param.name, value)}
                      onRandomizeToggle={(randomize) => handleRandomizeToggle(param.name, randomize)}
                    />
                  ))}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleRunTask(false)}
                  disabled={isAnimating || state.isExecuting}
                  className="flex-1"
                >
                  <Play className="w-3 h-3 mr-1" />
                  Run
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleRunTask(true)}
                  disabled={isAnimating || state.isExecuting}
                  className="flex-1"
                  title="Run with randomized parameters"
                >
                  <Shuffle className="w-3 h-3 mr-1" />
                  Randomize & Run
                </Button>
              </div>

              {/* Info about randomization */}
              <div className="text-xs text-slate-500 text-center">
                Click shuffle icon on each parameter to enable/disable randomization
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="mt-3 pt-3 border-t border-slate-700/50 flex gap-4 text-xs">
            <span className="text-blue-400">Manipulation</span>
            <span className="text-green-400">Navigation</span>
            <span className="text-purple-400">Inspection</span>
          </div>
        </>
      )}
    </div>
  );
};
