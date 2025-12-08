/**
 * Mobile Bottom Navigation
 *
 * Bottom navigation bar for mobile devices with:
 * - 3D View, Chat, Tools, Settings tabs
 * - Active state indication
 * - Badge support for notifications
 */

import React from 'react';
import { Box, MessageSquare, Wrench, Settings, Camera } from 'lucide-react';

export type MobileTab = 'viewport' | 'chat' | 'tools' | 'camera' | 'settings';

interface MobileNavProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  chatBadge?: number;
  showCamera?: boolean;
}

interface NavItem {
  id: MobileTab;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  activeTab,
  onTabChange,
  chatBadge,
  showCamera = true,
}) => {
  const navItems: NavItem[] = [
    { id: 'viewport', label: '3D View', icon: <Box className="w-5 h-5" /> },
    { id: 'chat', label: 'Chat', icon: <MessageSquare className="w-5 h-5" />, badge: chatBadge },
    ...(showCamera ? [{ id: 'camera' as MobileTab, label: 'Camera', icon: <Camera className="w-5 h-5" /> }] : []),
    { id: 'tools', label: 'Tools', icon: <Wrench className="w-5 h-5" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 border-t border-gray-700 safe-area-bottom">
      <div className="flex items-center justify-around h-14">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`flex flex-col items-center justify-center flex-1 h-full relative transition-colors ${
              activeTab === item.id
                ? 'text-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            {/* Active indicator */}
            {activeTab === item.id && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-blue-400 rounded-full" />
            )}

            {/* Icon with badge */}
            <div className="relative">
              {item.icon}
              {item.badge && item.badge > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
            </div>

            {/* Label */}
            <span className="text-xs mt-0.5">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default MobileNav;
