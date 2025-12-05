import React, { useState } from 'react';
import { Cpu, ChevronDown, ExternalLink, Check } from 'lucide-react';
import { Button } from '../common';
import {
  HARDWARE_KITS,
  getHardwareKitsForRobot,
  getPinMapping,
  type HardwareKit,
} from '../../config/hardwareKits';
import { useAppStore } from '../../stores/useAppStore';

interface HardwareKitSelectorProps {
  selectedKitId: string | null;
  onSelectKit: (kitId: string) => void;
}

export const HardwareKitSelector: React.FC<HardwareKitSelectorProps> = ({
  selectedKitId,
  onSelectKit,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { selectedRobotId, activeRobotType } = useAppStore();

  // Get kits compatible with current robot
  const compatibleKits = getHardwareKitsForRobot(selectedRobotId);
  const allKits = HARDWARE_KITS;

  // Check if a kit has a pre-defined pin mapping for current robot
  const hasPinMapping = (kitId: string) => {
    return !!getPinMapping(selectedRobotId, kitId);
  };

  const selectedKit = HARDWARE_KITS.find(k => k.id === selectedKitId);

  return (
    <div className="relative">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between"
      >
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-blue-400" />
          <span className="truncate">
            {selectedKit ? selectedKit.name : 'Select Hardware'}
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 right-0 top-full mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-20 max-h-96 overflow-y-auto">
            {/* Recommended kits section */}
            {compatibleKits.length > 0 && (
              <div className="p-2 border-b border-slate-700">
                <div className="text-xs font-semibold text-green-400 mb-2 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Recommended for {activeRobotType}
                </div>
                {compatibleKits.map(kit => (
                  <KitOption
                    key={kit.id}
                    kit={kit}
                    isSelected={kit.id === selectedKitId}
                    hasMapping={hasPinMapping(kit.id)}
                    onClick={() => {
                      onSelectKit(kit.id);
                      setIsOpen(false);
                    }}
                  />
                ))}
              </div>
            )}

            {/* All kits section */}
            <div className="p-2">
              <div className="text-xs font-semibold text-slate-400 mb-2">
                All Hardware Kits
              </div>
              {allKits
                .filter(k => !compatibleKits.find(ck => ck.id === k.id))
                .map(kit => (
                  <KitOption
                    key={kit.id}
                    kit={kit}
                    isSelected={kit.id === selectedKitId}
                    hasMapping={hasPinMapping(kit.id)}
                    onClick={() => {
                      onSelectKit(kit.id);
                      setIsOpen(false);
                    }}
                  />
                ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

interface KitOptionProps {
  kit: HardwareKit;
  isSelected: boolean;
  hasMapping: boolean;
  onClick: () => void;
}

const KitOption: React.FC<KitOptionProps> = ({ kit, isSelected, hasMapping, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
        isSelected
          ? 'bg-blue-600/30 border border-blue-500/50'
          : 'hover:bg-slate-700/50'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-200">{kit.name}</span>
            {hasMapping && (
              <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">
                Ready
              </span>
            )}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            {kit.manufacturer} | {kit.processor}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-slate-500">
              {kit.voltage}V | {kit.flashKb}KB Flash | {kit.ramKb}KB RAM
            </span>
          </div>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {kit.supportedProtocols.slice(0, 4).map(protocol => (
              <span
                key={protocol}
                className="text-[10px] bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded"
              >
                {protocol}
              </span>
            ))}
            {kit.supportedProtocols.length > 4 && (
              <span className="text-[10px] text-slate-500">
                +{kit.supportedProtocols.length - 4} more
              </span>
            )}
          </div>
        </div>
        {kit.documentationUrl && (
          <a
            href={kit.documentationUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="text-slate-500 hover:text-blue-400 p-1"
            title="Documentation"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </button>
  );
};

// Hardware Kit Details Panel
interface HardwareKitDetailsProps {
  kitId: string;
}

export const HardwareKitDetails: React.FC<HardwareKitDetailsProps> = ({ kitId }) => {
  const kit = HARDWARE_KITS.find(k => k.id === kitId);
  const { selectedRobotId } = useAppStore();
  const mapping = getPinMapping(selectedRobotId, kitId);

  if (!kit) return null;

  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-3">
      <div className="flex items-center gap-2 mb-3">
        <Cpu className="w-5 h-5 text-blue-400" />
        <div>
          <h3 className="text-sm font-semibold text-slate-200">{kit.name}</h3>
          <p className="text-xs text-slate-400">{kit.description}</p>
        </div>
      </div>

      {/* Specs */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-slate-900/50 rounded p-2">
          <div className="text-[10px] text-slate-500 uppercase">Processor</div>
          <div className="text-xs text-slate-300">{kit.processor}</div>
        </div>
        <div className="bg-slate-900/50 rounded p-2">
          <div className="text-[10px] text-slate-500 uppercase">Clock</div>
          <div className="text-xs text-slate-300">{kit.clockSpeedMhz} MHz</div>
        </div>
        <div className="bg-slate-900/50 rounded p-2">
          <div className="text-[10px] text-slate-500 uppercase">Flash</div>
          <div className="text-xs text-slate-300">{kit.flashKb} KB</div>
        </div>
        <div className="bg-slate-900/50 rounded p-2">
          <div className="text-[10px] text-slate-500 uppercase">RAM</div>
          <div className="text-xs text-slate-300">{kit.ramKb} KB</div>
        </div>
      </div>

      {/* Pin Mapping Status */}
      {mapping ? (
        <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-2">
          <div className="flex items-center gap-2 text-green-400 text-xs font-medium">
            <Check className="w-3 h-3" />
            Pin mapping ready
          </div>
          <p className="text-[10px] text-slate-400 mt-1">{mapping.description}</p>
          <div className="mt-2 space-y-1">
            <div className="text-[10px] text-slate-500">
              {mapping.motorConfigs.length} motors | {mapping.servoConfigs.length} servos | {mapping.sensorConfigs.length} sensors
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-amber-900/20 border border-amber-700/30 rounded-lg p-2">
          <div className="text-amber-400 text-xs font-medium">
            Custom mapping required
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            You'll need to configure pin mappings for this combination.
          </p>
        </div>
      )}

      {/* Supported Languages */}
      <div className="mt-3">
        <div className="text-[10px] text-slate-500 uppercase mb-1">Export Languages</div>
        <div className="flex gap-1">
          {kit.programmingLanguages.map(lang => (
            <span
              key={lang}
              className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded"
            >
              {lang === 'arduino' ? 'Arduino C++' : lang === 'micropython' ? 'MicroPython' : lang}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
