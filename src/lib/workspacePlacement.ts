/**
 * Workspace Placement Utilities
 *
 * Smart placement of objects within the SO-101 robot's reachable workspace.
 * Ensures objects are placed where the robot can actually reach them.
 */

// SO-101 workspace parameters (approximate, based on arm geometry)
const SO101_WORKSPACE = {
  // Reachable area is roughly a partial sphere in front of the robot
  minReachX: 0.08,   // Minimum X reach (to the right)
  maxReachX: 0.30,   // Maximum X reach
  minReachZ: 0.10,   // Minimum Z reach (forward)
  maxReachZ: 0.30,   // Maximum Z reach
  tableHeight: 0.0,  // Table surface Y coordinate
  maxHeight: 0.25,   // Maximum comfortable pick height
};

// Optimal placement zone (sweet spot for picking)
const OPTIMAL_ZONE = {
  xMin: 0.12,
  xMax: 0.22,
  zMin: 0.15,
  zMax: 0.25,
};

export interface PlacementResult {
  position: [number, number, number];
  rotation: [number, number, number];
}

export interface PlacementOptions {
  avoidPositions?: [number, number, number][];  // Existing object positions to avoid
  minSpacing?: number;                           // Minimum distance from other objects
  preferCenter?: boolean;                        // Prefer center of workspace
  randomRotation?: boolean;                      // Random Y rotation
}

/**
 * Get optimal placement for an object in the robot's workspace
 */
export function getOptimalPlacement(
  objectDimensions: [number, number, number],
  options: PlacementOptions = {}
): PlacementResult {
  const {
    avoidPositions = [],
    minSpacing = 0.08,
    preferCenter = true,
    randomRotation = true,
  } = options;

  const [width, height, depth] = objectDimensions;
  const objectRadius = Math.max(width, depth) / 2;

  // Calculate Y position (object rests on table)
  const yPosition = SO101_WORKSPACE.tableHeight + height / 2;

  // Try to find a good position
  let bestPosition: [number, number, number] | null = null;
  let maxDistance = 0;

  // Try multiple candidate positions
  const candidates = generateCandidatePositions(preferCenter, 20);

  for (const [x, z] of candidates) {
    // Check if this position is valid (away from other objects)
    const position: [number, number, number] = [x, yPosition, z];

    if (isPositionValid(position, avoidPositions, minSpacing + objectRadius)) {
      // Calculate distance from center of optimal zone
      const centerX = (OPTIMAL_ZONE.xMin + OPTIMAL_ZONE.xMax) / 2;
      const centerZ = (OPTIMAL_ZONE.zMin + OPTIMAL_ZONE.zMax) / 2;
      const distFromCenter = Math.sqrt((x - centerX) ** 2 + (z - centerZ) ** 2);

      // For preferCenter, we want minimum distance from center
      // For spread, we want maximum distance from other objects
      if (preferCenter) {
        if (!bestPosition || distFromCenter < maxDistance) {
          bestPosition = position;
          maxDistance = distFromCenter;
        }
      } else {
        const minDistFromOthers = getMinDistanceFromOthers(position, avoidPositions);
        if (minDistFromOthers > maxDistance) {
          bestPosition = position;
          maxDistance = minDistFromOthers;
        }
      }
    }
  }

  // Fallback to center of optimal zone if no valid position found
  if (!bestPosition) {
    bestPosition = [
      (OPTIMAL_ZONE.xMin + OPTIMAL_ZONE.xMax) / 2,
      yPosition,
      (OPTIMAL_ZONE.zMin + OPTIMAL_ZONE.zMax) / 2,
    ];
  }

  // Generate rotation
  const rotation: [number, number, number] = randomRotation
    ? [0, Math.random() * Math.PI * 2, 0]
    : [0, 0, 0];

  return { position: bestPosition, rotation };
}

/**
 * Generate candidate positions in the optimal zone
 */
function generateCandidatePositions(preferCenter: boolean, count: number): [number, number][] {
  const candidates: [number, number][] = [];

  if (preferCenter) {
    // Start with center, then spiral outward
    const centerX = (OPTIMAL_ZONE.xMin + OPTIMAL_ZONE.xMax) / 2;
    const centerZ = (OPTIMAL_ZONE.zMin + OPTIMAL_ZONE.zMax) / 2;
    candidates.push([centerX, centerZ]);

    // Add positions in expanding rings
    for (let ring = 1; ring <= 4; ring++) {
      const radius = ring * 0.03;
      for (let angle = 0; angle < 6; angle++) {
        const theta = (angle / 6) * Math.PI * 2;
        const x = centerX + Math.cos(theta) * radius;
        const z = centerZ + Math.sin(theta) * radius;
        if (isInOptimalZone(x, z)) {
          candidates.push([x, z]);
        }
      }
    }
  } else {
    // Random positions in optimal zone
    for (let i = 0; i < count; i++) {
      const x = OPTIMAL_ZONE.xMin + Math.random() * (OPTIMAL_ZONE.xMax - OPTIMAL_ZONE.xMin);
      const z = OPTIMAL_ZONE.zMin + Math.random() * (OPTIMAL_ZONE.zMax - OPTIMAL_ZONE.zMin);
      candidates.push([x, z]);
    }
  }

  return candidates;
}

/**
 * Check if position is in optimal zone
 */
function isInOptimalZone(x: number, z: number): boolean {
  return x >= OPTIMAL_ZONE.xMin && x <= OPTIMAL_ZONE.xMax &&
         z >= OPTIMAL_ZONE.zMin && z <= OPTIMAL_ZONE.zMax;
}

/**
 * Check if a position is valid (not too close to other objects)
 */
function isPositionValid(
  position: [number, number, number],
  otherPositions: [number, number, number][],
  minDistance: number
): boolean {
  for (const other of otherPositions) {
    const dx = position[0] - other[0];
    const dz = position[2] - other[2];
    const distance = Math.sqrt(dx * dx + dz * dz);
    if (distance < minDistance) {
      return false;
    }
  }
  return true;
}

/**
 * Get minimum distance from a position to any other object
 */
function getMinDistanceFromOthers(
  position: [number, number, number],
  otherPositions: [number, number, number][]
): number {
  if (otherPositions.length === 0) return Infinity;

  let minDist = Infinity;
  for (const other of otherPositions) {
    const dx = position[0] - other[0];
    const dz = position[2] - other[2];
    const distance = Math.sqrt(dx * dx + dz * dz);
    minDist = Math.min(minDist, distance);
  }
  return minDist;
}

/**
 * Get suggested prompts for an object
 */
export function getSuggestedPrompts(objectName: string): string[] {
  const name = objectName.toLowerCase().replace(/_/g, ' ');
  return [
    `Pick up the ${name}`,
    `Move the ${name} to the left`,
    `Push the ${name} forward`,
    `Lift the ${name} up high`,
  ];
}

/**
 * Check if a position is within the robot's reachable workspace
 */
export function isInWorkspace(position: [number, number, number]): boolean {
  const [x, y, z] = position;
  return (
    x >= SO101_WORKSPACE.minReachX &&
    x <= SO101_WORKSPACE.maxReachX &&
    z >= SO101_WORKSPACE.minReachZ &&
    z <= SO101_WORKSPACE.maxReachZ &&
    y >= SO101_WORKSPACE.tableHeight &&
    y <= SO101_WORKSPACE.maxHeight
  );
}
