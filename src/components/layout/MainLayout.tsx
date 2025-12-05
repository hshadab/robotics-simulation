import React, { useState } from 'react';
import { Header } from './Header';
import { SimulationViewport, SensorPanel } from '../simulation';
import { ChatPanel } from '../chat';
import { JointControls, PresetButtons, EnvironmentSelector, ChallengePanel, DatasetRecorderPanel, HandTrackingPanel } from '../controls';
import { CodeEditor, ArduinoEmulatorPanel } from '../editor';
import { Bot, Code, Gamepad2, BookOpen, LogOut } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';

type Tab = 'simulate' | 'code' | 'learn';

export const MainLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('simulate');
  const { user, logout } = useAuthStore();

  const tabs = [
    { id: 'simulate' as const, label: 'Simulate', icon: <Gamepad2 className="w-5 h-5" /> },
    { id: 'code' as const, label: 'Code', icon: <Code className="w-5 h-5" /> },
    { id: 'learn' as const, label: 'Learn', icon: <BookOpen className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col text-base">
      {/* Top Bar with Logo, Tabs, and User */}
      <header className="h-16 bg-slate-800/80 backdrop-blur-sm border-b border-slate-700/50 flex items-center justify-between px-6">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Bot className="w-8 h-8 text-blue-400" />
            <span className="text-xl font-bold text-white">RoboSim</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-slate-900/50 rounded-lg p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2 rounded-md text-base font-medium transition ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* User Menu */}
        <div className="flex items-center gap-4">
          <span className="text-base text-slate-400">
            {user?.name || user?.email}
          </span>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition text-base"
          >
            <LogOut className="w-5 h-5" />
            Log out
          </button>
        </div>
      </header>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'simulate' && <SimulateTab />}
        {activeTab === 'code' && <CodeTab />}
        {activeTab === 'learn' && <LearnTab />}
      </div>
    </div>
  );
};

const SimulateTab: React.FC = () => {
  return (
    <>
      <Header />
      <div className="flex-1 p-4 overflow-hidden" style={{ height: 'calc(100vh - 120px)' }}>
        <div className="h-full grid grid-cols-12 gap-4">
          {/* Left Column: AI Assistant */}
          <div className="col-span-3 flex flex-col gap-4">
            <div className="flex-1 min-h-0">
              <ChatPanel />
            </div>
          </div>

          {/* Middle Column: 3D Simulation */}
          <div className="col-span-6 flex flex-col gap-4">
            <div className="flex-1 min-h-0">
              <SimulationViewport />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <EnvironmentSelector />
              <SensorPanel />
            </div>
          </div>

          {/* Right Column: Controls */}
          <div className="col-span-3 flex flex-col gap-4 overflow-y-auto">
            <JointControls />
            <PresetButtons />
            <HandTrackingPanel />
            <DatasetRecorderPanel />
            <div className="min-h-0 max-h-56 overflow-hidden">
              <ChallengePanel />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const CodeTab: React.FC = () => {
  return (
    <div className="flex-1 p-4 overflow-hidden" style={{ height: 'calc(100vh - 64px)' }}>
      <div className="h-full grid grid-cols-12 gap-4">
        {/* Code Editor - takes most space */}
        <div className="col-span-6 h-full">
          <CodeEditor />
        </div>

        {/* Middle: Arduino Emulator */}
        <div className="col-span-3 h-full">
          <ArduinoEmulatorPanel />
        </div>

        {/* Right: Small simulation preview + controls */}
        <div className="col-span-3 flex flex-col gap-4">
          <div className="flex-1 min-h-0">
            <SimulationViewport />
          </div>
          <div className="h-40 overflow-y-auto">
            <JointControls />
          </div>
        </div>
      </div>
    </div>
  );
};

const LearnTab: React.FC = () => {
  const tutorials = [
    {
      title: 'Getting Started',
      description: 'Learn the basics of robotic arm control',
      difficulty: 'Beginner',
      duration: '10 min',
    },
    {
      title: 'Pick and Place',
      description: 'Program your robot to pick up and move objects',
      difficulty: 'Beginner',
      duration: '15 min',
    },
    {
      title: 'Sensor Basics',
      description: 'Using ultrasonic and IR sensors for navigation',
      difficulty: 'Intermediate',
      duration: '20 min',
    },
    {
      title: 'Line Following',
      description: 'Build a line-following robot program',
      difficulty: 'Intermediate',
      duration: '25 min',
    },
    {
      title: 'Drone Flight',
      description: 'Master quadcopter control and waypoints',
      difficulty: 'Advanced',
      duration: '30 min',
    },
    {
      title: 'Export to Hardware',
      description: 'Deploy your code to real Arduino/ESP32',
      difficulty: 'Advanced',
      duration: '20 min',
    },
  ];

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'Beginner': return 'text-green-400 bg-green-400/20';
      case 'Intermediate': return 'text-yellow-400 bg-yellow-400/20';
      case 'Advanced': return 'text-red-400 bg-red-400/20';
      default: return 'text-slate-400 bg-slate-400/20';
    }
  };

  return (
    <div className="flex-1 p-8 overflow-auto" style={{ height: 'calc(100vh - 64px)' }}>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-3">Learn Robotics</h1>
        <p className="text-lg text-slate-400 mb-10">
          Step-by-step tutorials to master robotics programming
        </p>

        <div className="grid gap-4">
          {tutorials.map((tutorial, i) => (
            <div
              key={i}
              className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50 hover:border-blue-500/30 transition cursor-pointer flex items-center justify-between"
            >
              <div>
                <h3 className="text-lg text-white font-medium mb-1">{tutorial.title}</h3>
                <p className="text-base text-slate-400">{tutorial.description}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-base text-slate-500">{tutorial.duration}</span>
                <span className={`text-sm px-3 py-1 rounded-full ${getDifficultyColor(tutorial.difficulty)}`}>
                  {tutorial.difficulty}
                </span>
              </div>
            </div>
          ))}
        </div>

        <p className="text-slate-600 text-base mt-10 text-center">
          More tutorials coming soon
        </p>
      </div>
    </div>
  );
};
