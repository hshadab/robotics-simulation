# RoboSim Development Roadmap

This document outlines the planned features to make RoboSim the fastest path from zero to trained robot policy.

## Problem Statement

Based on research into robotics simulation pain points:

1. **Steep Learning Curve**: ROS/Gazebo requires specific Ubuntu versions, complex installation, and version matching. Users describe "a thin line between being excited and frustrated."

2. **Data Collection Cost**: Imitation learning requires 50-200+ demonstration episodes. Manual teleoperation takes days. "Thousands of hours have been spent building large-scale datasets around the globe."

3. **Sim-to-Real Gap**: Domain randomization (visual, sensor, trajectory) is essential for policies that transfer to real hardware.

## Implementation Phases

---

## Phase 1: Onboarding Improvements

### 1.1 First-Run Tutorial Modal
**Status**: Planned
**Effort**: Low (1 day)
**Impact**: High

Detect new users and prompt interactive onboarding automatically.

**Implementation**:
- Check `localStorage` for `hasCompletedOnboarding` flag
- Show modal on first visit with options: "Start Tutorial" / "Skip for Now"
- Modal includes quick feature overview (3-4 bullet points)
- Links to TutorialPanel for detailed walkthrough

**Files to modify**:
- `src/App.tsx` - Add modal component and localStorage check
- New: `src/components/onboarding/FirstRunModal.tsx`

---

### 1.2 Batch Episode Recording
**Status**: Planned
**Effort**: Low (1-2 days)
**Impact**: High

Add "Record N Episodes" button for efficient data collection.

**Implementation**:
- Add episode count selector (5, 10, 25, 50, 100)
- Auto-increment episode number
- Brief pause between episodes (configurable)
- Progress indicator showing "Recording 3/10"
- Option to auto-run task template for each episode

**Files to modify**:
- `src/components/controls/DatasetRecorder.tsx`
- `src/lib/datasetExporter.ts`

---

### 1.3 Trajectory Noise Augmentation
**Status**: Planned
**Effort**: Low (1-2 days)
**Impact**: Medium

Add configurable noise to recorded episodes for diversity.

**Implementation**:
- Post-recording augmentation option
- Noise types:
  - Gaussian action noise (configurable std dev: 0.5°-5°)
  - Time stretching (0.8x-1.2x speed variations)
  - Spatial jitter (small position offsets)
- Generate N augmented copies per original episode
- Preview augmentation before applying

**Files to create**:
- `src/lib/trajectoryAugmentation.ts`

**Files to modify**:
- `src/components/controls/DatasetRecorder.tsx`

---

## Phase 2: Data Generation Tools

### 2.1 Parameterized Task Templates
**Status**: Planned
**Effort**: Medium (3-4 days)
**Impact**: High

Make task waypoints configurable with randomizable parameters.

**Implementation**:
```typescript
interface ParameterizedTask {
  name: string;
  parameters: {
    pickPosition: { range: [[xMin, xMax], [yMin, yMax], [zMin, zMax]] };
    placePosition: { range: [[xMin, xMax], [yMin, yMax], [zMin, zMax]] };
    approachHeight: { range: [min, max] };
    gripperOpenAmount: { range: [min, max] };
  };
  waypointTemplate: (params: ResolvedParams) => JointState[];
}
```

- Parameter sliders in UI
- "Randomize" button to sample new parameters
- Validation that sampled parameters are reachable (IK check)
- Save favorite parameter sets

**Files to modify**:
- `src/components/controls/TaskTemplatesPanel.tsx`

**Files to create**:
- `src/lib/parameterizedTasks.ts`

---

### 2.2 Visual Randomization UI
**Status**: Planned
**Effort**: Medium (3-4 days)
**Impact**: High

Lighting, texture, and color variation controls for domain randomization.

**Implementation**:
- Lighting controls:
  - Intensity slider (50%-150%)
  - Color temperature (warm/neutral/cool)
  - Shadow softness
- Floor texture variations (5-10 options)
- Object color randomization
- Background variations
- "Randomize All" button
- Per-episode randomization toggle

**Files to modify**:
- `src/components/simulation/RobotArm3D.tsx`
- `src/components/controls/SensorRealismPanel.tsx` (or new panel)

**Files to create**:
- `src/lib/visualRandomization.ts`
- `src/components/controls/VisualRandomizationPanel.tsx`

---

### 2.3 Dataset Augmentation Panel
**Status**: Planned
**Effort**: Medium (3-5 days)
**Impact**: High

Multiply recorded episodes with automated variations.

**Implementation**:
- Load existing dataset (from recording or file)
- Augmentation options:
  - Action noise magnitude
  - Time stretch range
  - Mirror left/right
  - Joint offset range
- Preview augmented trajectory
- Generate augmented dataset (10x, 50x, 100x multiplier)
- Export combined original + augmented

**Files to create**:
- `src/components/controls/DatasetAugmentationPanel.tsx`
- `src/lib/datasetAugmentation.ts`

---

## Phase 3: Advanced Features

### 3.1 Auto-Episode Generator
**Status**: Planned
**Effort**: High (1-2 weeks)
**Impact**: Very High

One-click synthetic data generation (100+ episodes).

**Implementation**:
```typescript
interface AutoGeneratorConfig {
  taskTemplate: string;
  numEpisodes: number;
  variationLevel: 'low' | 'medium' | 'high';
  randomizeObjectPositions: boolean;
  randomizeStartPose: boolean;
  addTrajectoryNoise: boolean;
  visualRandomization: boolean;
  failureRate: number; // Intentionally include some failures
}
```

- Select task template
- Configure variation parameters
- Progress bar during generation
- Background generation (non-blocking)
- Auto-validation of generated episodes
- Statistics summary (success rate, coverage)

**Files to create**:
- `src/lib/autoEpisodeGenerator.ts`
- `src/components/controls/AutoGeneratorPanel.tsx`

---

### 3.2 Guided Challenge System
**Status**: Planned
**Effort**: High (1-2 weeks)
**Impact**: High

Interactive tutorials with position validation.

**Implementation**:
- Challenge types:
  - "Move gripper to red cube" (position check)
  - "Record 5 successful pick-and-place" (task tracking)
  - "Export your first dataset" (action completion)
- Real-time validation:
  - Distance to target position
  - Visual indicator (green when correct)
  - Success/failure feedback
- Progress tracking with achievements
- Difficulty levels (beginner, intermediate, advanced)

**Files to create**:
- `src/lib/challengeSystem.ts`
- `src/components/controls/GuidedChallengePanel.tsx`

---

### 3.3 Direct HuggingFace Upload
**Status**: Partially Complete
**Effort**: Medium (3-5 days)
**Impact**: High

Integrated Hub publishing without CLI.

**Current state**: `huggingfaceUpload.ts` exists but needs UI integration.

**Implementation**:
- Token input with validation
- Repository name input
- Public/private toggle
- Upload progress indicator
- Direct link to uploaded dataset
- README auto-generation with dataset stats
- Error handling with retry

**Files to modify**:
- `src/components/controls/DatasetRecorder.tsx`
- `src/lib/huggingfaceUpload.ts`

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Time to first robot movement | 2-5 min (find controls) | < 30 sec (guided) |
| Episodes to generate 100 demos | 100 manual recordings | 1 click |
| Time to export LeRobot dataset | 5-10 min | < 1 min |
| New user completion rate | Unknown | > 70% complete tutorial |

## Technical Dependencies

- React 18, TypeScript
- Three.js / React Three Fiber
- Rapier physics engine
- Zustand state management
- HuggingFace Hub API

## Contributing

Contributions to any roadmap item are welcome! Please:
1. Check existing issues for the feature
2. Create an issue if none exists
3. Reference the roadmap item in your PR

## References

- [Data Scaling Laws in Imitation Learning](https://arxiv.org/html/2410.18647)
- [Domain Randomization for Sim2Real](https://lilianweng.github.io/posts/2019-05-05-domain-randomization/)
- [LeRobot: Making AI for Robotics Accessible](https://huggingface.co/lerobot)
- [Browser-based Simulation for Robotics Education](https://www.frontiersin.org/articles/10.3389/fcomp.2022.1031572)
