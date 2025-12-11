/**
 * Object Library for Robot Manipulation
 *
 * Common household objects for training data generation.
 * Based on YCB Object Set categories commonly used in robotics research.
 */

import type { SimObject } from '../types';

export interface ObjectTemplate {
  id: string;
  name: string;
  category: 'container' | 'food' | 'tool' | 'toy' | 'kitchen' | 'office';
  description: string;
  type: SimObject['type'];
  scale: number;
  color: string;
  // For compound objects or GLB
  modelUrl?: string;
  // Suggested physics properties
  mass?: number;
  friction?: number;
  restitution?: number;
}

/**
 * Built-in object templates using primitive shapes
 * These don't require external model loading
 */
export const PRIMITIVE_OBJECTS: ObjectTemplate[] = [
  // Containers
  {
    id: 'red-cube',
    name: 'Red Block',
    category: 'toy',
    description: 'Small red cube block',
    type: 'cube',
    scale: 0.04,
    color: '#e74c3c',
    mass: 0.1,
  },
  {
    id: 'blue-cube',
    name: 'Blue Block',
    category: 'toy',
    description: 'Small blue cube block',
    type: 'cube',
    scale: 0.04,
    color: '#3498db',
    mass: 0.1,
  },
  {
    id: 'green-cube',
    name: 'Green Block',
    category: 'toy',
    description: 'Small green cube block',
    type: 'cube',
    scale: 0.04,
    color: '#2ecc71',
    mass: 0.1,
  },
  {
    id: 'yellow-cube',
    name: 'Yellow Block',
    category: 'toy',
    description: 'Small yellow cube block',
    type: 'cube',
    scale: 0.04,
    color: '#f1c40f',
    mass: 0.1,
  },
  {
    id: 'large-red-block',
    name: 'Large Red Block',
    category: 'toy',
    description: 'Large red cube for stacking',
    type: 'cube',
    scale: 0.06,
    color: '#c0392b',
    mass: 0.2,
  },
  {
    id: 'large-blue-block',
    name: 'Large Blue Block',
    category: 'toy',
    description: 'Large blue cube for stacking',
    type: 'cube',
    scale: 0.06,
    color: '#2980b9',
    mass: 0.2,
  },
  // Balls
  {
    id: 'tennis-ball',
    name: 'Tennis Ball',
    category: 'toy',
    description: 'Yellow tennis ball',
    type: 'ball',
    scale: 0.033,
    color: '#d4e157',
    mass: 0.06,
    restitution: 0.7,
  },
  {
    id: 'golf-ball',
    name: 'Golf Ball',
    category: 'toy',
    description: 'White golf ball',
    type: 'ball',
    scale: 0.021,
    color: '#ffffff',
    mass: 0.045,
    restitution: 0.6,
  },
  {
    id: 'orange',
    name: 'Orange',
    category: 'food',
    description: 'Fresh orange fruit',
    type: 'ball',
    scale: 0.04,
    color: '#e67e22',
    mass: 0.15,
    restitution: 0.2,
  },
  {
    id: 'apple',
    name: 'Apple',
    category: 'food',
    description: 'Red apple',
    type: 'ball',
    scale: 0.038,
    color: '#c0392b',
    mass: 0.18,
    restitution: 0.2,
  },
  // Cylinders (cups, cans, etc.)
  {
    id: 'soda-can',
    name: 'Soda Can',
    category: 'container',
    description: 'Aluminum soda can',
    type: 'cylinder',
    scale: 0.033,
    color: '#e74c3c',
    mass: 0.35,
    friction: 0.6,
  },
  {
    id: 'soup-can',
    name: 'Soup Can',
    category: 'food',
    description: 'Metal soup can',
    type: 'cylinder',
    scale: 0.04,
    color: '#f39c12',
    mass: 0.4,
    friction: 0.7,
  },
  {
    id: 'coffee-cup',
    name: 'Coffee Cup',
    category: 'kitchen',
    description: 'Ceramic coffee mug',
    type: 'cylinder',
    scale: 0.04,
    color: '#ecf0f1',
    mass: 0.3,
    friction: 0.8,
  },
  {
    id: 'water-bottle',
    name: 'Water Bottle',
    category: 'container',
    description: 'Plastic water bottle',
    type: 'cylinder',
    scale: 0.035,
    color: '#3498db',
    mass: 0.5,
    friction: 0.5,
  },
  {
    id: 'marker',
    name: 'Marker Pen',
    category: 'office',
    description: 'Whiteboard marker',
    type: 'cylinder',
    scale: 0.012,
    color: '#2c3e50',
    mass: 0.02,
  },
  {
    id: 'battery',
    name: 'AA Battery',
    category: 'tool',
    description: 'AA size battery',
    type: 'cylinder',
    scale: 0.007,
    color: '#f1c40f',
    mass: 0.023,
  },
];

/**
 * YCB Object Set - Standard robotics benchmark objects
 * Models available from: http://ycb-benchmarks.s3-website-us-east-1.amazonaws.com/
 * These would need to be hosted or converted to GLB
 */
export const YCB_OBJECTS: ObjectTemplate[] = [
  {
    id: 'ycb-002-master-chef-can',
    name: 'Master Chef Can',
    category: 'food',
    description: 'YCB 002 - Coffee can',
    type: 'cylinder',
    scale: 0.05,
    color: '#8b4513',
  },
  {
    id: 'ycb-003-cracker-box',
    name: 'Cracker Box',
    category: 'food',
    description: 'YCB 003 - Cheez-It box',
    type: 'cube',
    scale: 0.08,
    color: '#ff6b35',
  },
  {
    id: 'ycb-004-sugar-box',
    name: 'Sugar Box',
    category: 'food',
    description: 'YCB 004 - Domino sugar box',
    type: 'cube',
    scale: 0.06,
    color: '#ffffff',
  },
  {
    id: 'ycb-005-tomato-soup-can',
    name: 'Tomato Soup Can',
    category: 'food',
    description: 'YCB 005 - Campbell\'s soup can',
    type: 'cylinder',
    scale: 0.035,
    color: '#c0392b',
  },
  {
    id: 'ycb-006-mustard-bottle',
    name: 'Mustard Bottle',
    category: 'food',
    description: 'YCB 006 - French\'s mustard',
    type: 'cylinder',
    scale: 0.04,
    color: '#f1c40f',
  },
  {
    id: 'ycb-007-tuna-can',
    name: 'Tuna Can',
    category: 'food',
    description: 'YCB 007 - StarKist tuna can',
    type: 'cylinder',
    scale: 0.025,
    color: '#3498db',
  },
  {
    id: 'ycb-010-potted-meat-can',
    name: 'Potted Meat Can',
    category: 'food',
    description: 'YCB 010 - Small meat can',
    type: 'cylinder',
    scale: 0.03,
    color: '#e74c3c',
  },
  {
    id: 'ycb-011-banana',
    name: 'Banana',
    category: 'food',
    description: 'YCB 011 - Plastic banana',
    type: 'cylinder',
    scale: 0.02,
    color: '#f1c40f',
  },
  {
    id: 'ycb-019-pitcher-base',
    name: 'Pitcher',
    category: 'kitchen',
    description: 'YCB 019 - Plastic pitcher',
    type: 'cylinder',
    scale: 0.06,
    color: '#3498db',
  },
  {
    id: 'ycb-021-bleach-cleanser',
    name: 'Bleach Cleanser',
    category: 'tool',
    description: 'YCB 021 - Soft Scrub bottle',
    type: 'cylinder',
    scale: 0.045,
    color: '#ffffff',
  },
  {
    id: 'ycb-024-bowl',
    name: 'Bowl',
    category: 'kitchen',
    description: 'YCB 024 - Plastic bowl',
    type: 'cylinder',
    scale: 0.07,
    color: '#ecf0f1',
  },
  {
    id: 'ycb-025-mug',
    name: 'Mug',
    category: 'kitchen',
    description: 'YCB 025 - Ceramic mug',
    type: 'cylinder',
    scale: 0.04,
    color: '#2c3e50',
  },
  {
    id: 'ycb-035-power-drill',
    name: 'Power Drill',
    category: 'tool',
    description: 'YCB 035 - Cordless drill',
    type: 'cube',
    scale: 0.1,
    color: '#f39c12',
  },
  {
    id: 'ycb-036-wood-block',
    name: 'Wood Block',
    category: 'toy',
    description: 'YCB 036 - Wooden block',
    type: 'cube',
    scale: 0.05,
    color: '#d4a574',
  },
  {
    id: 'ycb-037-scissors',
    name: 'Scissors',
    category: 'tool',
    description: 'YCB 037 - Office scissors',
    type: 'cube',
    scale: 0.04,
    color: '#7f8c8d',
  },
  {
    id: 'ycb-051-large-clamp',
    name: 'Large Clamp',
    category: 'tool',
    description: 'YCB 051 - Spring clamp',
    type: 'cube',
    scale: 0.06,
    color: '#e67e22',
  },
  {
    id: 'ycb-052-extra-large-clamp',
    name: 'Extra Large Clamp',
    category: 'tool',
    description: 'YCB 052 - Large spring clamp',
    type: 'cube',
    scale: 0.08,
    color: '#e67e22',
  },
  {
    id: 'ycb-061-foam-brick',
    name: 'Foam Brick',
    category: 'toy',
    description: 'YCB 061 - Soft foam brick',
    type: 'cube',
    scale: 0.06,
    color: '#e74c3c',
    mass: 0.05,
  },
];

/**
 * All available objects
 */
export const ALL_OBJECTS: ObjectTemplate[] = [...PRIMITIVE_OBJECTS, ...YCB_OBJECTS];

/**
 * Get objects by category
 */
export function getObjectsByCategory(category: ObjectTemplate['category']): ObjectTemplate[] {
  return ALL_OBJECTS.filter(obj => obj.category === category);
}

/**
 * Get object by ID
 */
export function getObjectById(id: string): ObjectTemplate | undefined {
  return ALL_OBJECTS.find(obj => obj.id === id);
}

/**
 * Create a SimObject from a template
 */
export function createSimObjectFromTemplate(
  template: ObjectTemplate,
  position: [number, number, number] = [0.15, 0.02, 0],
  rotation: [number, number, number] = [0, 0, 0]
): SimObject {
  return {
    id: `${template.id}-${Date.now()}`,
    name: template.name,
    type: template.type,
    position,
    rotation,
    scale: template.scale,
    color: template.color,
    isGrabbable: true,
    isGrabbed: false,
    isInTargetZone: false,
    modelUrl: template.modelUrl,
  };
}

/**
 * Preset scene configurations for common tasks
 */
export interface ScenePreset {
  id: string;
  name: string;
  description: string;
  objects: Array<{
    templateId: string;
    position: [number, number, number];
    rotation?: [number, number, number];
  }>;
}

export const SCENE_PRESETS: ScenePreset[] = [
  {
    id: 'stacking-blocks',
    name: 'Block Stacking',
    description: 'Two blocks for stacking task',
    objects: [
      { templateId: 'red-cube', position: [-0.12, 0.02, 0.08] },
      { templateId: 'blue-cube', position: [0.12, 0.02, 0.08] },
    ],
  },
  {
    id: 'multi-stack',
    name: 'Multi-Block Stack',
    description: 'Four blocks for complex stacking',
    objects: [
      { templateId: 'red-cube', position: [-0.15, 0.02, 0.1] },
      { templateId: 'blue-cube', position: [-0.05, 0.02, 0.1] },
      { templateId: 'green-cube', position: [0.05, 0.02, 0.1] },
      { templateId: 'yellow-cube', position: [0.15, 0.02, 0.1] },
    ],
  },
  {
    id: 'cup-pour',
    name: 'Cup Pouring',
    description: 'Two cups for pouring task',
    objects: [
      { templateId: 'coffee-cup', position: [-0.1, 0.04, 0.1] },
      { templateId: 'coffee-cup', position: [0.1, 0.04, 0.1] },
    ],
  },
  {
    id: 'sorting-colors',
    name: 'Color Sorting',
    description: 'Mixed color objects for sorting task',
    objects: [
      { templateId: 'red-cube', position: [-0.08, 0.02, 0.12] },
      { templateId: 'blue-cube', position: [0, 0.02, 0.1] },
      { templateId: 'red-cube', position: [0.08, 0.02, 0.12] },
      { templateId: 'blue-cube', position: [-0.04, 0.02, 0.08] },
    ],
  },
  {
    id: 'pick-place-fruit',
    name: 'Fruit Pick & Place',
    description: 'Fruit objects for pick and place',
    objects: [
      { templateId: 'orange', position: [-0.1, 0.04, 0.1] },
      { templateId: 'apple', position: [0.1, 0.04, 0.1] },
    ],
  },
  {
    id: 'cans-lineup',
    name: 'Can Lineup',
    description: 'Various cans for manipulation',
    objects: [
      { templateId: 'soda-can', position: [-0.12, 0.033, 0.1] },
      { templateId: 'soup-can', position: [0, 0.04, 0.1] },
      { templateId: 'soda-can', position: [0.12, 0.033, 0.1] },
    ],
  },
  {
    id: 'office-desk',
    name: 'Office Desk',
    description: 'Office supplies for manipulation',
    objects: [
      { templateId: 'marker', position: [-0.1, 0.012, 0.1], rotation: [Math.PI / 2, 0, 0.3] },
      { templateId: 'marker', position: [-0.08, 0.012, 0.12], rotation: [Math.PI / 2, 0, -0.2] },
      { templateId: 'coffee-cup', position: [0.1, 0.04, 0.08] },
    ],
  },
];

/**
 * Create SimObjects from a scene preset
 */
export function createSceneFromPreset(presetId: string): SimObject[] {
  const preset = SCENE_PRESETS.find(p => p.id === presetId);
  if (!preset) return [];

  return preset.objects.map(objConfig => {
    const template = getObjectById(objConfig.templateId);
    if (!template) return null;
    return createSimObjectFromTemplate(
      template,
      objConfig.position,
      objConfig.rotation || [0, 0, 0]
    );
  }).filter((obj): obj is SimObject => obj !== null);
}

/**
 * Categories with display names
 */
export const OBJECT_CATEGORIES = [
  { id: 'container', name: 'Containers', icon: '🫙' },
  { id: 'food', name: 'Food Items', icon: '🍎' },
  { id: 'tool', name: 'Tools', icon: '🔧' },
  { id: 'toy', name: 'Toys & Blocks', icon: '🧱' },
  { id: 'kitchen', name: 'Kitchen', icon: '☕' },
  { id: 'office', name: 'Office', icon: '✏️' },
] as const;
