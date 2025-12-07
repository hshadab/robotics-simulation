/**
 * Visual Randomization Panel
 *
 * Provides UI controls for domain randomization settings:
 * - Lighting controls (intensity, color, position)
 * - Material properties (robot colors, floor appearance)
 * - Preset lighting conditions
 * - Randomization for sim-to-real transfer
 */

import React, { useState, useCallback } from 'react';
import {
  Sun,
  Palette,
  Shuffle,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Lightbulb,
  Sparkles,
} from 'lucide-react';
import { Button } from '../common';
import {
  LIGHTING_PRESETS,
  type LightingConfig,
  type MaterialConfig,
} from '../../lib/domainRandomization';
import { useVisualStore } from '../../stores/useVisualStore';

interface SliderControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
}

const SliderControl: React.FC<SliderControlProps> = ({
  label,
  value,
  min,
  max,
  step = 0.1,
  unit = '',
  onChange,
}) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="text-xs text-slate-300">
        {value.toFixed(step < 1 ? 2 : 0)}{unit}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer
                 [&::-webkit-slider-thumb]:appearance-none
                 [&::-webkit-slider-thumb]:w-3
                 [&::-webkit-slider-thumb]:h-3
                 [&::-webkit-slider-thumb]:rounded-full
                 [&::-webkit-slider-thumb]:bg-blue-500"
    />
  </div>
);

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ label, value, onChange }) => (
  <div className="flex items-center justify-between">
    <span className="text-xs text-slate-400">{label}</span>
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-6 h-6 rounded cursor-pointer bg-transparent border border-slate-600"
      />
      <span className="text-xs text-slate-500 font-mono">{value}</span>
    </div>
  </div>
);

export const VisualRandomizationPanel: React.FC = () => {
  const [expanded, setExpanded] = useState(true);
  const [activeSection, setActiveSection] = useState<'lighting' | 'materials' | 'presets'>('lighting');

  // Use the visual store
  const { config, updateLighting: storeUpdateLighting, updateMaterials: storeUpdateMaterials, randomize, reset, applyPreset } = useVisualStore();

  // Update lighting property
  const updateLighting = useCallback(
    (key: keyof LightingConfig, value: number | string) => {
      storeUpdateLighting({ [key]: value });
    },
    [storeUpdateLighting]
  );

  // Update material property
  const updateMaterial = useCallback(
    (key: keyof MaterialConfig, value: number | string) => {
      storeUpdateMaterials({ [key]: value });
    },
    [storeUpdateMaterials]
  );

  // Handlers that use store actions
  const handleRandomize = useCallback(() => {
    randomize();
  }, [randomize]);

  const handleReset = useCallback(() => {
    reset();
  }, [reset]);

  const handleApplyPreset = useCallback(
    (presetName: keyof typeof LIGHTING_PRESETS) => {
      applyPreset(presetName);
    },
    [applyPreset]
  );

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-yellow-400" />
          Visual Randomization
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={handleRandomize}
            className="p-1 text-orange-400 hover:text-orange-300 transition-colors"
            title="Randomize all"
          >
            <Shuffle className="w-4 h-4" />
          </button>
          <button
            onClick={handleReset}
            className="p-1 text-slate-400 hover:text-white transition-colors"
            title="Reset to defaults"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 text-slate-400 hover:text-white transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <>
          {/* Section tabs */}
          <div className="flex gap-1 mb-3">
            {(['lighting', 'materials', 'presets'] as const).map((section) => (
              <button
                key={section}
                onClick={() => setActiveSection(section)}
                className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  activeSection === section
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700/50 text-slate-400 hover:text-white'
                }`}
              >
                {section === 'lighting' && <Sun className="w-3 h-3 inline mr-1" />}
                {section === 'materials' && <Palette className="w-3 h-3 inline mr-1" />}
                {section === 'presets' && <Lightbulb className="w-3 h-3 inline mr-1" />}
                {section.charAt(0).toUpperCase() + section.slice(1)}
              </button>
            ))}
          </div>

          {/* Lighting controls */}
          {activeSection === 'lighting' && (
            <div className="space-y-3">
              <div className="p-3 bg-slate-900/50 rounded-lg space-y-3">
                <div className="text-xs font-medium text-slate-300 mb-2">Key Light</div>
                <SliderControl
                  label="Intensity"
                  value={config.lighting.keyLightIntensity}
                  min={0}
                  max={5}
                  onChange={(v) => updateLighting('keyLightIntensity', v)}
                />
                <ColorPicker
                  label="Color"
                  value={config.lighting.keyLightColor}
                  onChange={(v) => updateLighting('keyLightColor', v)}
                />
                <div className="grid grid-cols-3 gap-2">
                  <SliderControl
                    label="X"
                    value={config.lighting.keyLightX}
                    min={-10}
                    max={10}
                    step={1}
                    onChange={(v) => updateLighting('keyLightX', v)}
                  />
                  <SliderControl
                    label="Y"
                    value={config.lighting.keyLightY}
                    min={1}
                    max={15}
                    step={1}
                    onChange={(v) => updateLighting('keyLightY', v)}
                  />
                  <SliderControl
                    label="Z"
                    value={config.lighting.keyLightZ}
                    min={-10}
                    max={10}
                    step={1}
                    onChange={(v) => updateLighting('keyLightZ', v)}
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-900/50 rounded-lg space-y-3">
                <div className="text-xs font-medium text-slate-300 mb-2">Fill & Rim Lights</div>
                <SliderControl
                  label="Fill Intensity"
                  value={config.lighting.fillLightIntensity}
                  min={0}
                  max={3}
                  onChange={(v) => updateLighting('fillLightIntensity', v)}
                />
                <ColorPicker
                  label="Fill Color"
                  value={config.lighting.fillLightColor}
                  onChange={(v) => updateLighting('fillLightColor', v)}
                />
                <SliderControl
                  label="Rim Intensity"
                  value={config.lighting.rimLightIntensity}
                  min={0}
                  max={2}
                  onChange={(v) => updateLighting('rimLightIntensity', v)}
                />
                <ColorPicker
                  label="Rim Color"
                  value={config.lighting.rimLightColor}
                  onChange={(v) => updateLighting('rimLightColor', v)}
                />
              </div>

              <div className="p-3 bg-slate-900/50 rounded-lg space-y-3">
                <div className="text-xs font-medium text-slate-300 mb-2">Ambient</div>
                <SliderControl
                  label="Intensity"
                  value={config.lighting.ambientIntensity}
                  min={0}
                  max={1}
                  onChange={(v) => updateLighting('ambientIntensity', v)}
                />
                <ColorPicker
                  label="Color"
                  value={config.lighting.ambientColor}
                  onChange={(v) => updateLighting('ambientColor', v)}
                />
              </div>
            </div>
          )}

          {/* Materials controls */}
          {activeSection === 'materials' && (
            <div className="space-y-3">
              <div className="p-3 bg-slate-900/50 rounded-lg space-y-3">
                <div className="text-xs font-medium text-slate-300 mb-2">Robot Materials</div>
                <ColorPicker
                  label="Base Color"
                  value={config.materials.robotBaseColor}
                  onChange={(v) => updateMaterial('robotBaseColor', v)}
                />
                <ColorPicker
                  label="Accent Color"
                  value={config.materials.robotAccentColor}
                  onChange={(v) => updateMaterial('robotAccentColor', v)}
                />
                <SliderControl
                  label="Metallic"
                  value={config.materials.robotMetallic}
                  min={0}
                  max={1}
                  onChange={(v) => updateMaterial('robotMetallic', v)}
                />
                <SliderControl
                  label="Roughness"
                  value={config.materials.robotRoughness}
                  min={0}
                  max={1}
                  onChange={(v) => updateMaterial('robotRoughness', v)}
                />
              </div>

              <div className="p-3 bg-slate-900/50 rounded-lg space-y-3">
                <div className="text-xs font-medium text-slate-300 mb-2">Floor</div>
                <ColorPicker
                  label="Color"
                  value={config.materials.floorColor}
                  onChange={(v) => updateMaterial('floorColor', v)}
                />
                <SliderControl
                  label="Roughness"
                  value={config.materials.floorRoughness}
                  min={0}
                  max={1}
                  onChange={(v) => updateMaterial('floorRoughness', v)}
                />
              </div>

              <div className="p-3 bg-slate-900/50 rounded-lg space-y-3">
                <div className="text-xs font-medium text-slate-300 mb-2">Objects</div>
                <ColorPicker
                  label="Default Color"
                  value={config.materials.objectColor}
                  onChange={(v) => updateMaterial('objectColor', v)}
                />
                <SliderControl
                  label="Metallic"
                  value={config.materials.objectMetallic}
                  min={0}
                  max={1}
                  onChange={(v) => updateMaterial('objectMetallic', v)}
                />
              </div>
            </div>
          )}

          {/* Presets */}
          {activeSection === 'presets' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400 mb-2">
                Quick presets for different lighting conditions:
              </p>
              <div className="grid grid-cols-2 gap-2">
                {Object.keys(LIGHTING_PRESETS).map((presetName) => (
                  <button
                    key={presetName}
                    onClick={() => handleApplyPreset(presetName as keyof typeof LIGHTING_PRESETS)}
                    className="p-2 text-left rounded-lg bg-slate-900/50 border border-slate-700/50
                             hover:border-blue-500/50 hover:bg-blue-500/10 transition-colors"
                  >
                    <div className="text-sm font-medium text-white capitalize">{presetName}</div>
                    <div className="text-xs text-slate-400">
                      {presetName === 'studio' && 'Neutral lighting'}
                      {presetName === 'daylight' && 'Bright sunny day'}
                      {presetName === 'overcast' && 'Diffuse cloudy'}
                      {presetName === 'sunset' && 'Warm golden hour'}
                      {presetName === 'night' && 'Low light indoor'}
                      {presetName === 'industrial' && 'Warehouse style'}
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-4 p-3 bg-slate-900/50 rounded-lg">
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                  <Shuffle className="w-3 h-3" />
                  Domain Randomization
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  Randomize visual properties to improve sim-to-real transfer.
                  Policies trained with varied lighting and materials generalize better.
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleRandomize}
                  className="w-full"
                >
                  <Shuffle className="w-3 h-3 mr-2" />
                  Randomize All Properties
                </Button>
              </div>
            </div>
          )}

          {/* Info footer */}
          <div className="mt-3 pt-3 border-t border-slate-700/50">
            <p className="text-xs text-slate-500">
              Visual randomization helps policies generalize to real-world conditions.
              Use "Randomize" when recording training data.
            </p>
          </div>
        </>
      )}
    </div>
  );
};
