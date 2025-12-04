# RoboSim - Interactive Robotics Simulation Platform

A web-based 3D robotics simulation platform built with React, Three.js, and Rapier physics. Control and visualize multiple robot types including robotic arms, wheeled robots, drones, and humanoids.

## Features

### Multiple Robot Types
- **Robot Arm (Hiwonder xArm 1S)** - 5-DOF articulated arm with gripper
- **Wheeled Robot** - Differential drive robot with ultrasonic sensor
- **Drone (Quadcopter)** - 4-motor drone with flight controls
- **Humanoid (Berkeley Humanoid Lite)** - 22-DOF bipedal robot

### 3D Visualization
- Real-time 3D rendering with PBR materials
- Physics simulation using Rapier
- Multiple environment options (empty, warehouse, outdoor, maze)
- Contact shadows and studio lighting

### Interactive Controls
- Joint sliders for precise control
- Preset positions and animations
- Motor speed controls for wheeled robots
- Flight controls for drones (arm/disarm, throttle, pitch, roll, yaw)

### Sensors & Visualization
- Ultrasonic distance sensor
- IR line sensors
- GPS, accelerometer, gyroscope simulation
- Lidar visualization (2D minimap and 3D rays)
- Robot camera view (picture-in-picture)

### Code Editor
- Built-in JavaScript code editor
- Robot API for programmatic control
- Code templates for common tasks
- Console output panel

### AI Chat Assistant
- Natural language robot control
- Context-aware responses per robot type
- Quick prompts for common commands

## Tech Stack

- **Frontend**: React 18, TypeScript
- **3D Graphics**: Three.js, React Three Fiber, React Three Drei
- **Physics**: Rapier (via @react-three/rapier)
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **Build Tool**: Vite

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/robotics-simulation.git
cd robotics-simulation

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

## Project Structure

```
src/
├── components/
│   ├── simulation/      # 3D robot components
│   │   ├── PhysicsArm.tsx
│   │   ├── WheeledRobot3D.tsx
│   │   ├── Drone3D.tsx
│   │   ├── Humanoid3D.tsx
│   │   └── ...
│   ├── controls/        # UI control panels
│   ├── editor/          # Code editor components
│   ├── chat/            # AI chat interface
│   └── layout/          # Layout components
├── hooks/               # Custom React hooks
├── lib/                 # Robot APIs and utilities
├── stores/              # Zustand state management
├── config/              # Robot profiles, environments
└── types/               # TypeScript type definitions
```

## Robot APIs

### Arm Robot
```javascript
robot.moveJoint('shoulder', 45);  // Move joint to angle
robot.openGripper();              // Open gripper
robot.closeGripper();             // Close gripper
robot.goHome();                   // Return to home position
```

### Wheeled Robot
```javascript
robot.forward(150);               // Drive forward
robot.backward(100);              // Drive backward
robot.turnLeft(100);              // Turn left
robot.turnRight(100);             // Turn right
robot.stop();                     // Stop motors
robot.setServo(45);               // Set ultrasonic servo angle
```

### Drone
```javascript
drone.arm();                      // Arm motors
drone.disarm();                   // Disarm motors
drone.takeoff(0.5);               // Take off to height (meters)
drone.land();                     // Land the drone
drone.setThrottle(60);            // Set throttle (0-100)
drone.setAttitude(roll, pitch, yaw); // Set orientation
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details.

## Acknowledgments

- [React Three Fiber](https://github.com/pmndrs/react-three-fiber)
- [Rapier Physics](https://rapier.rs/)
- [Zustand](https://github.com/pmndrs/zustand)
- Berkeley Humanoid Lite design inspiration
