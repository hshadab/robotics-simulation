import React, { useState } from 'react';
import {
  Bot, ArrowLeft, Gamepad2, Mic, Eye, Hand, Brain, Code, Download,
  Keyboard, Mouse, Settings, Play, Save, Database, Box, Cpu, ChevronDown,
  ChevronRight, Layers, Target, Video, Share2, HelpCircle, Monitor
} from 'lucide-react';

interface InstructionsPageProps {
  onBack: () => void;
  onGetStarted: () => void;
}

type Section = 'getting-started' | 'robots' | 'controls' | 'ai' | 'code' | 'shortcuts' | 'troubleshooting';

export const InstructionsPage: React.FC<InstructionsPageProps> = ({ onBack, onGetStarted }) => {
  const [activeSection, setActiveSection] = useState<Section>('getting-started');
  const [expandedPanels, setExpandedPanels] = useState<Set<string>>(new Set(['joint-controls']));

  const togglePanel = (panel: string) => {
    const newExpanded = new Set(expandedPanels);
    if (newExpanded.has(panel)) {
      newExpanded.delete(panel);
    } else {
      newExpanded.add(panel);
    }
    setExpandedPanels(newExpanded);
  };

  const sections = [
    { id: 'getting-started' as Section, label: 'Getting Started', icon: <Play className="w-4 h-4" /> },
    { id: 'robots' as Section, label: 'Robot Types', icon: <Bot className="w-4 h-4" /> },
    { id: 'controls' as Section, label: 'Control Panels', icon: <Settings className="w-4 h-4" /> },
    { id: 'ai' as Section, label: 'AI Features', icon: <Brain className="w-4 h-4" /> },
    { id: 'code' as Section, label: 'Code Editor', icon: <Code className="w-4 h-4" /> },
    { id: 'shortcuts' as Section, label: 'Keyboard Shortcuts', icon: <Keyboard className="w-4 h-4" /> },
    { id: 'troubleshooting' as Section, label: 'Troubleshooting', icon: <HelpCircle className="w-4 h-4" /> },
  ];

  const controlPanels = [
    {
      id: 'joint-controls',
      name: 'Joint Controls',
      icon: <Settings className="w-5 h-5" />,
      description: 'Direct slider control for each robot joint. Drag sliders to move joints in real-time.',
      features: ['Visual sliders for all joints', 'Real-time angle display', 'Locks during animations'],
    },
    {
      id: 'advanced-controls',
      name: 'Advanced Controls',
      icon: <Gamepad2 className="w-5 h-5" />,
      description: 'Four control modes: Manual, Click-to-Move, Keyboard, and Gamepad.',
      features: [
        'Manual: Traditional slider control',
        'Click-to-Move: Click in 3D scene, robot uses IK to reach',
        'Keyboard: WASD + Arrow keys + Space/Shift',
        'Gamepad: Full controller support with configurable deadzone',
      ],
    },
    {
      id: 'hand-tracking',
      name: 'Hand Tracking',
      icon: <Hand className="w-5 h-5" />,
      description: 'Control the robot using hand gestures via webcam.',
      features: [
        'Pinch gesture: Close gripper',
        'Open hand: Open gripper',
        'Point: Move in direction',
        'Fist: Hold current grip',
      ],
    },
    {
      id: 'voice-control',
      name: 'Voice Control',
      icon: <Mic className="w-5 h-5" />,
      description: 'Speak commands to control the robot (Chrome/Edge only).',
      features: [
        'Movement: "move left", "forward", "backward"',
        'Gripper: "open gripper", "close gripper"',
        'Actions: "wave hello", "pick up", "scan area"',
        'Positions: "go home", "reach forward"',
      ],
    },
    {
      id: 'vision',
      name: 'Vision (Camera)',
      icon: <Eye className="w-5 h-5" />,
      description: 'Basic computer vision with color detection and blob tracking.',
      features: [
        'Color detection: Red, Green, Blue, Yellow, Orange',
        'Centroid position tracking',
        'Bounding box visualization',
        'Area calculation in pixels',
      ],
    },
    {
      id: 'vision-analysis',
      name: 'Vision Analysis (AI)',
      icon: <Brain className="w-5 h-5" />,
      description: 'Advanced scene understanding using Claude Vision API.',
      features: [
        'Natural language scene descriptions',
        'Object detection with confidence scores',
        'Spatial relationship understanding',
        'Suggested robot actions',
      ],
    },
    {
      id: 'numerical-ik',
      name: 'Numerical IK',
      icon: <Target className="w-5 h-5" />,
      description: 'Calculate joint angles to reach a target position using inverse kinematics.',
      features: [
        'DLS (Damped Least Squares) solver',
        'CCD (Cyclic Coordinate Descent) solver',
        'Multi-start optimization',
        'Animated trajectory execution',
      ],
    },
    {
      id: 'multi-robot',
      name: 'Multi-Robot',
      icon: <Layers className="w-5 h-5" />,
      description: 'Manage multiple robot instances (max 8) with formation patterns.',
      features: [
        'Add/clone/remove robots',
        'Toggle visibility',
        'Line, Grid, Circle, V-Formation patterns',
        'Individual robot selection',
      ],
    },
    {
      id: 'ai-environment',
      name: 'AI Environment',
      icon: <Box className="w-5 h-5" />,
      description: 'Generate backgrounds, textures, and objects using Google Gemini AI.',
      features: [
        'Custom background generation',
        'Floor/wall texture generation',
        '3D object generation from descriptions',
        'Style and mood customization',
      ],
    },
    {
      id: 'text-to-3d',
      name: 'Text-to-3D',
      icon: <Box className="w-5 h-5" />,
      description: 'Generate 3D objects from text descriptions.',
      features: [
        'Styles: Realistic, Cartoon, Low-Poly, Voxel',
        'Scale: 0.5x to 3.0x',
        'AI texture generation',
        'Preset objects available',
      ],
    },
    {
      id: 'dataset-recorder',
      name: 'Dataset Recorder',
      icon: <Video className="w-5 h-5" />,
      description: 'Record robot demonstrations for machine learning training.',
      features: [
        'LeRobot v3.0 format (HuggingFace compatible)',
        '30 FPS recording',
        'Optional video capture',
        'Success/Fail episode marking',
      ],
    },
    {
      id: 'save-load',
      name: 'Save/Load',
      icon: <Save className="w-5 h-5" />,
      description: 'Manage simulation states with up to 10 save slots.',
      features: [
        'Named save slots',
        'Auto-save support',
        'JSON file import/export',
        'Saves joints, environment, and code',
      ],
    },
    {
      id: 'policy-browser',
      name: 'Policy Browser',
      icon: <Database className="w-5 h-5" />,
      description: 'Load and run pre-trained policies from HuggingFace Hub.',
      features: [
        'ACT, Diffusion, TDMPC policies',
        'ONNX model support',
        '20Hz real-time inference',
        'Search by robot type or task',
      ],
    },
  ];

  const robots = [
    {
      name: 'SO-101 Robot Arm',
      dof: '6-DOF',
      status: 'available',
      description: 'Desktop robotic arm from The Robot Studio with 6 degrees of freedom.',
      joints: [
        { name: 'Base', range: '±110°', desc: 'Rotates entire arm' },
        { name: 'Shoulder', range: '±100°', desc: 'Lifts upper arm' },
        { name: 'Elbow', range: '±97°', desc: 'Bends forearm' },
        { name: 'Wrist Pitch', range: '±95°', desc: 'Tilts wrist' },
        { name: 'Wrist Roll', range: '-157° to +163°', desc: 'Rotates wrist' },
        { name: 'Gripper', range: '0-100%', desc: 'Opens/closes' },
      ],
    },
    {
      name: '4WD Wheeled Robot',
      dof: '3 Controls',
      status: 'coming_soon',
      description: 'Four-wheel drive mobile robot with differential steering.',
      joints: [
        { name: 'Left Motor', range: '-255 to +255', desc: 'Left wheel speed' },
        { name: 'Right Motor', range: '-255 to +255', desc: 'Right wheel speed' },
        { name: 'Head Servo', range: '±90°', desc: 'Camera pan' },
      ],
    },
    {
      name: 'Quadcopter Drone',
      dof: '4 Controls',
      status: 'coming_soon',
      description: 'Four-rotor aerial vehicle with 6-DOF movement.',
      joints: [
        { name: 'Throttle', range: '0-100%', desc: 'Altitude control' },
        { name: 'Roll', range: '±45°', desc: 'Left/right tilt' },
        { name: 'Pitch', range: '±45°', desc: 'Forward/back tilt' },
        { name: 'Yaw', range: '±180°', desc: 'Rotation' },
      ],
    },
    {
      name: 'Berkeley Humanoid',
      dof: '22-DOF',
      status: 'coming_soon',
      description: 'Bipedal humanoid robot with articulated limbs.',
      joints: [
        { name: 'Hip Pitch/Roll', range: '±60°/±30°', desc: 'Leg rotation' },
        { name: 'Knee', range: '0° to 120°', desc: 'Leg bend' },
        { name: 'Shoulder', range: '-180° to +60°', desc: 'Arm rotation' },
        { name: 'Elbow', range: '0° to 135°', desc: 'Arm bend' },
      ],
    },
  ];

  const keyboardShortcuts = [
    { category: 'Robot Control (Keyboard Mode)', shortcuts: [
      { keys: 'W / S', action: 'Shoulder up/down' },
      { keys: 'A / D', action: 'Base left/right' },
      { keys: '↑ / ↓', action: 'Elbow up/down' },
      { keys: '← / →', action: 'Wrist pitch' },
      { keys: 'Q / E', action: 'Wrist roll' },
      { keys: 'Space', action: 'Open gripper' },
      { keys: 'Shift', action: 'Close gripper' },
    ]},
    { category: 'Code Editor', shortcuts: [
      { keys: 'Ctrl+S', action: 'Save code' },
      { keys: 'Ctrl+Z', action: 'Undo' },
      { keys: 'Ctrl+Shift+Z', action: 'Redo' },
      { keys: 'Ctrl+/', action: 'Toggle comment' },
      { keys: 'Ctrl+Shift+G', action: 'Generate from comment' },
      { keys: 'Ctrl+Shift+E', action: 'Explain selection' },
    ]},
    { category: 'General', shortcuts: [
      { keys: 'Enter', action: 'Send chat message' },
      { keys: 'Escape', action: 'Cancel action' },
    ]},
  ];

  const troubleshooting = [
    {
      issue: 'Voice Control Not Working',
      solutions: [
        'Use Chrome or Edge browser',
        'Allow microphone permission when prompted',
        'Speak clearly and avoid background noise',
        'Check that status shows "Listening"',
      ],
    },
    {
      issue: 'Hand Tracking Issues',
      solutions: [
        'Allow camera permission',
        'Ensure good lighting on hands',
        'Use a plain background',
        'Keep hands 30-60cm from camera',
      ],
    },
    {
      issue: 'Robot Not Moving',
      solutions: [
        'Wait for current animation to complete',
        'Check if values are at joint limits',
        'Look for self-collision warnings',
        'Check console for code errors',
      ],
    },
    {
      issue: 'AI Features Not Working',
      solutions: [
        'Ensure valid API key is entered',
        'Claude keys start with sk-ant-',
        'Check your API usage quota',
        'Verify internet connection',
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-base overflow-x-hidden">
      {/* Grid background */}
      <div
        className="fixed inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(to right, #fff 1px, transparent 1px),
            linear-gradient(to bottom, #fff 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Nav */}
      <nav className="relative flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 border-2 border-blue-500">
              <Bot className="w-6 h-6 text-blue-400" />
            </div>
            <span className="text-xl font-black text-white tracking-tight">ROBOSIM</span>
          </div>
        </div>
        <button
          onClick={onGetStarted}
          className="bg-white text-black px-6 py-3 text-lg font-bold transition hover:bg-blue-400 hover:text-white border-2 border-white hover:border-blue-400"
        >
          GET STARTED
        </button>
      </nav>

      {/* Hero */}
      <section className="relative px-8 pt-8 pb-8 max-w-7xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">
          <span className="text-blue-400">Instructions</span> & User Guide
        </h1>
        <p className="text-xl text-slate-400 max-w-3xl">
          Complete guide to all controls, features, and capabilities in RoboSim.
        </p>
      </section>

      {/* Main Content */}
      <section className="relative px-8 pb-16 max-w-7xl mx-auto">
        <div className="flex gap-8">
          {/* Sidebar Navigation */}
          <div className="w-64 flex-shrink-0">
            <div className="sticky top-8 space-y-2">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left font-medium transition border-2 ${
                    activeSection === section.id
                      ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                      : 'bg-slate-900/50 border-slate-700/50 text-slate-400 hover:border-slate-600 hover:text-white'
                  }`}
                >
                  {section.icon}
                  {section.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 min-w-0">
            {/* Getting Started */}
            {activeSection === 'getting-started' && (
              <div className="space-y-8">
                <div className="bg-slate-900/50 border-2 border-blue-500/30 p-6">
                  <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                    <Play className="w-6 h-6 text-blue-400" />
                    Quick Start
                  </h2>
                  <ol className="space-y-4 text-slate-300">
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white font-bold flex items-center justify-center">1</span>
                      <div>
                        <p className="font-medium text-white">Open RoboSim</p>
                        <p className="text-sm text-slate-400">Click GET STARTED on the landing page. Chrome or Edge recommended.</p>
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white font-bold flex items-center justify-center">2</span>
                      <div>
                        <p className="font-medium text-white">Move the Robot</p>
                        <p className="text-sm text-slate-400">Use joint sliders in the Controls panel on the right sidebar.</p>
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white font-bold flex items-center justify-center">3</span>
                      <div>
                        <p className="font-medium text-white">Talk to AI</p>
                        <p className="text-sm text-slate-400">Type commands in the Chat panel (e.g., "wave hello", "pick up the cube").</p>
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white font-bold flex items-center justify-center">4</span>
                      <div>
                        <p className="font-medium text-white">Run Code</p>
                        <p className="text-sm text-slate-400">Write JavaScript in the Code Editor and click the green Run button.</p>
                      </div>
                    </li>
                  </ol>
                </div>

                <div className="bg-slate-900/50 border-2 border-slate-700/30 p-6">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
                    <Monitor className="w-5 h-5 text-purple-400" />
                    Interface Overview
                  </h3>
                  <div className="font-mono text-sm bg-slate-950 p-4 rounded text-slate-300 overflow-x-auto">
                    <pre>{`┌─────────────────────────────────────────────────────────────────┐
│  Logo    Features    How It Works    Learn More    GET STARTED  │
├─────────────────────────────────────────────────────────────────┤
│                                              │                  │
│                                              │  Control Panels  │
│           3D Simulation Viewport             │  (collapsible)   │
│                                              │                  │
│                                              │                  │
├──────────────────────────────────────────────┴──────────────────┤
│  Code Editor                │           Chat Panel              │
│  (JavaScript)               │         (AI Assistant)            │
└─────────────────────────────┴───────────────────────────────────┘`}</pre>
                  </div>
                </div>

                <div className="bg-slate-900/50 border-2 border-green-500/30 p-6">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
                    <Mouse className="w-5 h-5 text-green-400" />
                    3D Viewport Controls
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-800/50 p-3">
                      <p className="font-medium text-white">Rotate View</p>
                      <p className="text-sm text-slate-400">Left-click + drag</p>
                    </div>
                    <div className="bg-slate-800/50 p-3">
                      <p className="font-medium text-white">Pan View</p>
                      <p className="text-sm text-slate-400">Right-click + drag</p>
                    </div>
                    <div className="bg-slate-800/50 p-3">
                      <p className="font-medium text-white">Zoom</p>
                      <p className="text-sm text-slate-400">Scroll wheel</p>
                    </div>
                    <div className="bg-slate-800/50 p-3">
                      <p className="font-medium text-white">Reset View</p>
                      <p className="text-sm text-slate-400">Double-click</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Robot Types */}
            {activeSection === 'robots' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                  <Bot className="w-6 h-6 text-blue-400" />
                  Supported Robots
                </h2>
                {robots.map((robot) => (
                  <div
                    key={robot.name}
                    className={`bg-slate-900/50 border-2 p-6 ${
                      robot.status === 'available'
                        ? 'border-blue-500/30'
                        : 'border-slate-700/30 opacity-80'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className={`text-xl font-bold ${
                        robot.status === 'available' ? 'text-blue-400' : 'text-slate-400'
                      }`}>
                        {robot.name}
                      </h3>
                      <span className="text-xs font-bold bg-slate-700 px-2 py-1 text-slate-300">
                        {robot.dof}
                      </span>
                      {robot.status === 'available' ? (
                        <span className="px-2 py-0.5 text-xs font-bold bg-green-500/20 text-green-400 border border-green-500/30">
                          AVAILABLE
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          COMING SOON
                        </span>
                      )}
                    </div>
                    <p className="text-slate-400 mb-4">{robot.description}</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-700">
                            <th className="text-left py-2 text-slate-300 font-semibold">Joint</th>
                            <th className="text-left py-2 text-slate-300 font-semibold">Range</th>
                            <th className="text-left py-2 text-slate-300 font-semibold">Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          {robot.joints.map((joint) => (
                            <tr key={joint.name} className="border-b border-slate-800">
                              <td className="py-2 text-white font-medium">{joint.name}</td>
                              <td className="py-2 text-blue-400 font-mono">{joint.range}</td>
                              <td className="py-2 text-slate-400">{joint.desc}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Control Panels */}
            {activeSection === 'controls' && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                  <Settings className="w-6 h-6 text-purple-400" />
                  Control Panels
                </h2>
                <p className="text-slate-400 mb-6">
                  All control panels are collapsible. Click the header to expand/collapse.
                </p>
                {controlPanels.map((panel) => (
                  <div
                    key={panel.id}
                    className="bg-slate-900/50 border-2 border-slate-700/30 overflow-hidden"
                  >
                    <button
                      onClick={() => togglePanel(panel.id)}
                      className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-800/50 transition"
                    >
                      <span className="text-blue-400">{panel.icon}</span>
                      <span className="text-lg font-bold text-white flex-1">{panel.name}</span>
                      {expandedPanels.has(panel.id) ? (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      )}
                    </button>
                    {expandedPanels.has(panel.id) && (
                      <div className="px-4 pb-4 border-t border-slate-700/50">
                        <p className="text-slate-400 mt-3 mb-4">{panel.description}</p>
                        <ul className="space-y-2">
                          {panel.features.map((feature, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                              <span className="text-green-400 mt-0.5">•</span>
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* AI Features */}
            {activeSection === 'ai' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                  <Brain className="w-6 h-6 text-pink-400" />
                  AI Features
                </h2>

                <div className="bg-slate-900/50 border-2 border-pink-500/30 p-6">
                  <h3 className="text-xl font-bold text-pink-400 mb-4">Chat Panel (Claude AI)</h3>
                  <p className="text-slate-400 mb-4">
                    Natural language interface for robot control. Type commands in plain English.
                  </p>
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-slate-300 mb-2">Setup:</p>
                    <ol className="text-sm text-slate-400 space-y-1">
                      <li>1. Click settings icon in Chat panel</li>
                      <li>2. Enter Claude API key (starts with sk-ant-)</li>
                      <li>3. Key is saved locally in your browser</li>
                    </ol>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-300 mb-2">Example Commands:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {['wave hello', 'pick up object', 'go home position', 'scan the area', 'open gripper', 'reach forward'].map((cmd) => (
                        <div key={cmd} className="bg-slate-800 px-3 py-2 text-sm text-slate-300 font-mono">
                          "{cmd}"
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/50 border-2 border-purple-500/30 p-6">
                  <h3 className="text-xl font-bold text-purple-400 mb-4">Code Copilot</h3>
                  <p className="text-slate-400 mb-4">
                    AI-powered code assistance integrated in the Code Editor.
                  </p>
                  <div className="space-y-3">
                    <div className="bg-slate-800/50 p-3">
                      <p className="font-medium text-white">Generate from Comment</p>
                      <p className="text-sm text-slate-400">Write a comment, press Ctrl+Shift+G</p>
                    </div>
                    <div className="bg-slate-800/50 p-3">
                      <p className="font-medium text-white">Explain Code</p>
                      <p className="text-sm text-slate-400">Select code, press Ctrl+Shift+E</p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/50 border-2 border-cyan-500/30 p-6">
                  <h3 className="text-xl font-bold text-cyan-400 mb-4">Vision Language</h3>
                  <p className="text-slate-400 mb-4">
                    Ask questions about the 3D scene using Claude Vision API.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {["What's in the scene?", "What can the robot pick up?", "Describe the environment", "Where are the objects?"].map((q) => (
                      <div key={q} className="bg-slate-800 px-3 py-2 text-sm text-slate-300">
                        {q}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Code Editor */}
            {activeSection === 'code' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                  <Code className="w-6 h-6 text-green-400" />
                  Code Editor
                </h2>

                <div className="bg-slate-900/50 border-2 border-green-500/30 p-6">
                  <h3 className="text-xl font-bold text-green-400 mb-4">Robot API Reference</h3>
                  <div className="font-mono text-sm bg-slate-950 p-4 rounded overflow-x-auto">
                    <pre className="text-slate-300">{`// Movement
robot.moveTo({ base: 45, shoulder: 30, elbow: -60 });
robot.setJoint('base', 90);
robot.home();

// Gripper
robot.openGripper();
robot.closeGripper();
robot.setGripper(50); // 0-100%

// Queries
const pos = robot.getPosition();
const joints = robot.getJoints();

// Timing
await robot.wait(1000); // milliseconds
await robot.moveSmooth({ base: 45 }, 2000);

// Sensors
const distance = sensors.ultrasonic;
const lineLeft = sensors.irLeft;

// Logging
console.log('Status:', robot.status);`}</pre>
                  </div>
                </div>

                <div className="bg-slate-900/50 border-2 border-slate-700/30 p-6">
                  <h3 className="text-xl font-bold text-white mb-4">Code Templates</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="font-semibold text-blue-400 mb-2">Basic</p>
                      <ul className="text-sm text-slate-400 space-y-1">
                        <li>• Hello World</li>
                        <li>• Joint Explorer</li>
                        <li>• Sensor Reader</li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-semibold text-yellow-400 mb-2">Intermediate</p>
                      <ul className="text-sm text-slate-400 space-y-1">
                        <li>• Pick and Place</li>
                        <li>• Scanning Pattern</li>
                        <li>• Wave Hello</li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-semibold text-red-400 mb-2">Advanced</p>
                      <ul className="text-sm text-slate-400 space-y-1">
                        <li>• Obstacle Avoidance</li>
                        <li>• Sorting Demo</li>
                        <li>• Drawing Pattern</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/50 border-2 border-slate-700/30 p-6">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
                    <Download className="w-5 h-5 text-cyan-400" />
                    Export Platforms
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { name: 'Arduino', ext: '.ino', desc: 'C++ for Arduino boards' },
                      { name: 'MicroPython', ext: '.py', desc: 'Python for ESP32/Pico' },
                      { name: 'CircuitPython', ext: '.py', desc: 'Python for Adafruit boards' },
                      { name: 'Raspberry Pi', ext: '.py', desc: 'Python with GPIO' },
                    ].map((platform) => (
                      <div key={platform.name} className="bg-slate-800/50 p-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white">{platform.name}</span>
                          <span className="text-xs bg-slate-700 px-2 py-0.5 text-slate-300">{platform.ext}</span>
                        </div>
                        <p className="text-sm text-slate-400">{platform.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Keyboard Shortcuts */}
            {activeSection === 'shortcuts' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                  <Keyboard className="w-6 h-6 text-orange-400" />
                  Keyboard Shortcuts
                </h2>
                {keyboardShortcuts.map((category) => (
                  <div key={category.category} className="bg-slate-900/50 border-2 border-slate-700/30 p-6">
                    <h3 className="text-lg font-bold text-white mb-4">{category.category}</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {category.shortcuts.map((shortcut) => (
                        <div key={shortcut.keys} className="flex items-center gap-3">
                          <kbd className="px-3 py-1.5 bg-slate-800 border border-slate-600 text-orange-400 font-mono text-sm min-w-[100px] text-center">
                            {shortcut.keys}
                          </kbd>
                          <span className="text-slate-300">{shortcut.action}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Troubleshooting */}
            {activeSection === 'troubleshooting' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                  <HelpCircle className="w-6 h-6 text-red-400" />
                  Troubleshooting
                </h2>
                {troubleshooting.map((item) => (
                  <div key={item.issue} className="bg-slate-900/50 border-2 border-red-500/30 p-6">
                    <h3 className="text-lg font-bold text-red-400 mb-3">{item.issue}</h3>
                    <ul className="space-y-2">
                      {item.solutions.map((solution, i) => (
                        <li key={i} className="flex items-start gap-2 text-slate-300">
                          <span className="text-green-400 mt-0.5">✓</span>
                          {solution}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}

                <div className="bg-slate-900/50 border-2 border-slate-700/30 p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Browser Support</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-700">
                          <th className="text-left py-2 text-slate-300">Feature</th>
                          <th className="text-center py-2 text-slate-300">Chrome</th>
                          <th className="text-center py-2 text-slate-300">Edge</th>
                          <th className="text-center py-2 text-slate-300">Firefox</th>
                          <th className="text-center py-2 text-slate-300">Safari</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { feature: '3D Rendering', chrome: true, edge: true, firefox: true, safari: true },
                          { feature: 'Voice Control', chrome: true, edge: true, firefox: false, safari: false },
                          { feature: 'Hand Tracking', chrome: true, edge: true, firefox: true, safari: true },
                          { feature: 'Serial Connection', chrome: true, edge: true, firefox: false, safari: false },
                          { feature: 'Gamepad', chrome: true, edge: true, firefox: true, safari: true },
                        ].map((row) => (
                          <tr key={row.feature} className="border-b border-slate-800">
                            <td className="py-2 text-white">{row.feature}</td>
                            <td className="py-2 text-center">{row.chrome ? '✓' : '✗'}</td>
                            <td className="py-2 text-center">{row.edge ? '✓' : '✗'}</td>
                            <td className="py-2 text-center">{row.firefox ? '✓' : '✗'}</td>
                            <td className="py-2 text-center">{row.safari ? '✓' : '✗'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative px-8 py-10 border-t-2 border-slate-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 text-slate-500">
            <Bot className="w-6 h-6" />
            <span className="text-lg font-bold tracking-tight">ROBOSIM</span>
          </div>
          <p className="text-slate-600 font-medium">
            Built for learning robotics
          </p>
        </div>
      </footer>
    </div>
  );
};
