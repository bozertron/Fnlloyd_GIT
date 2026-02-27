// !Fnlloyd Sprite Mapping System
// Maps game states and events to specific sprite sheet animations

import { GamePhase } from '../game/state';
import { getSpriteConfig, SPRITE_CONFIGS } from './sprite-config';

/**
 * Mapping of game phases to default sprite animations
 */
export const PHASE_SPRITE_MAP: Record<GamePhase, string> = {
  'START': 'fnlloyd-arkanoid-idle',
  'ARKANOID': 'fnlloyd-arkanoid-idle',
  'TRANSITION': 'fnlloyd-transition-morph',
  'BRICKLIMINATOR': 'fnlloyd-brickliminator-focus',
  'CITY_DEFENSE': 'fnlloyd-arkanoid-idle',
  'GAMEOVER': 'fnlloyd-celebrate', // or create a 'gameover' animation
};

/**
 * Event-based sprite triggers (combo, power-ups, etc.)
 */
export interface EventSpriteTrigger {
  eventName: string;
  spriteName: string;
  animationName: string;
  priority: number;      // higher priority interrupts lower
  interruptible: boolean;
}

export const EVENT_TRIGGERS: EventSpriteTrigger[] = [
  {
    eventName: 'combo-5',
    spriteName: 'fnlloyd-celebrate',
    animationName: 'celebrate',
    priority: 2,
    interruptible: true,
  },
  {
    eventName: 'combo-10',
    spriteName: 'fnlloyd-celebrate',
    animationName: 'celebrate',
    priority: 3,
    interruptible: true,
  },
  {
    eventName: 'level-complete',
    spriteName: 'fnlloyd-celebrate',
    animationName: 'celebrate',
    priority: 5,
    interruptible: false,
  },
  {
    eventName: 'explosion-small',
    spriteName: 'fx-explosion-small',
    animationName: 'explode',
    priority: 1,
    interruptible: true,
  },
  {
    eventName: 'explosion-large',
    spriteName: 'fx-explosion-large',
    animationName: 'explode',
    priority: 1,
    interruptible: true,
  },
  {
    eventName: 'sparkle',
    spriteName: 'fx-sparkle',
    animationName: 'sparkle',
    priority: 1,
    interruptible: true,
  },
];

/**
 * Get sprite name for current game phase
 */
export function getSpriteForPhase(phase: GamePhase): string {
  return PHASE_SPRITE_MAP[phase] || 'fnlloyd-arkanoid-idle';
}

/**
 * Get event trigger by event name
 */
export function getEventTrigger(eventName: string): EventSpriteTrigger | null {
  return EVENT_TRIGGERS.find(t => t.eventName === eventName) || null;
}

/**
 * Check if an event can interrupt current animation based on priority
 */
export function canInterrupt(currentPriority: number, newPriority: number): boolean {
  return newPriority > currentPriority;
}
