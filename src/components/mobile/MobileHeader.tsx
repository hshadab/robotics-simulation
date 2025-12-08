/**
 * Mobile Header Component
 *
 * Compact header for mobile devices with:
 * - Logo/title
 * - Status indicators
 * - Menu button
 */

import React from 'react';
import { Menu, Wifi, WifiOff, Battery, BatteryLow, Bot } from 'lucide-react';

interface MobileHeaderProps {
  title?: string;
  onMenuClick?: () => void;
  isConnected?: boolean;
  batteryLevel?: number;
  showStatus?: boolean;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  title = 'RoboSim',
  onMenuClick,
  isConnected = false,
  batteryLevel,
  showStatus = true,
}) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700 safe-area-top">
      <div className="flex items-center justify-between h-12 px-3">
        {/* Menu button */}
        <button
          onClick={onMenuClick}
          className="p-2 -ml-2 rounded-lg hover:bg-gray-800 transition-colors"
        >
          <Menu className="w-5 h-5 text-gray-300" />
        </button>

        {/* Logo and Title */}
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-blue-400" />
          <span className="font-semibold text-white">{title}</span>
        </div>

        {/* Status indicators */}
        {showStatus ? (
          <div className="flex items-center gap-2">
            {/* Connection status */}
            {isConnected ? (
              <Wifi className="w-4 h-4 text-green-400" />
            ) : (
              <WifiOff className="w-4 h-4 text-gray-500" />
            )}

            {/* Battery level */}
            {batteryLevel !== undefined && (
              <div className="flex items-center gap-0.5">
                {batteryLevel > 20 ? (
                  <Battery className="w-4 h-4 text-green-400" />
                ) : (
                  <BatteryLow className="w-4 h-4 text-red-400" />
                )}
                <span className="text-xs text-gray-400">{batteryLevel}%</span>
              </div>
            )}
          </div>
        ) : (
          <div className="w-10" /> // Spacer for centering
        )}
      </div>
    </header>
  );
};

export default MobileHeader;
