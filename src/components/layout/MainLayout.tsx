import React from 'react';
import { Header } from './Header';
import { SimulationViewport, SensorPanel } from '../simulation';
import { ChatPanel } from '../chat';
import { JointControls, PresetButtons, EnvironmentSelector, ChallengePanel, RobotSelector } from '../controls';

export const MainLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <div className="flex-1 p-4 overflow-hidden">
        <div className="h-full grid grid-cols-12 gap-4">
          {/* Left Column: AI Assistant (primary focus) */}
          <div className="col-span-3 flex flex-col gap-4">
            {/* AI Chat - primary interaction - full height */}
            <div className="flex-1 min-h-0">
              <ChatPanel />
            </div>
          </div>

          {/* Middle Column: 3D Simulation (center focus) */}
          <div className="col-span-6 flex flex-col gap-4">
            {/* Robot Selector */}
            <RobotSelector />

            {/* Main 3D Simulation Viewport */}
            <div className="flex-1 min-h-0">
              <SimulationViewport />
            </div>

            {/* Bottom Row: Environment + Sensors */}
            <div className="grid grid-cols-2 gap-4">
              <EnvironmentSelector />
              <SensorPanel />
            </div>
          </div>

          {/* Right Column: Manual Controls */}
          <div className="col-span-3 flex flex-col gap-4">
            {/* Joint Controls - primary manual control */}
            <div className="flex-[2] min-h-0 overflow-y-auto">
              <JointControls />
            </div>
            {/* Preset Buttons */}
            <PresetButtons />
            {/* Challenges */}
            <div className="flex-1 min-h-0 max-h-56 overflow-hidden">
              <ChallengePanel />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
