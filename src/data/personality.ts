// !Fnlloyd Personality & Quip System
// All voice lines from FNLLLOYD_PERSONALITY.md, organized by trigger

export type QuipTrigger =
  | 'good_shot' | 'near_miss' | 'perfect_bounce' | 'missed_ball' | 'ball_stuck'
  | 'powerup_collect' | 'rare_powerup' | 'powerup_expire' | 'multiball'
  | 'level_start' | 'level_complete' | 'perfect_clear' | 'new_high_score'
  | 'boss_appears' | 'boss_damaged' | 'boss_defeated' | 'boss_escapes'
  | 'bricklim_start' | 'shape_launched' | 'line_clear' | 'line_combo'
  | 'earth_damaged' | 'earth_critical'
  | 'low_health' | 'extra_life' | 'life_lost'
  | 'game_over' | 'earth_paved' | 'continue_game'
  | 'combo_2' | 'combo_3' | 'combo_5' | 'combo_10'
  | 'idle' | 'bad_bounce' | 'stuck_ball' | 'missed_easy' | 'accidental_clear' | 'unexpected_combo'
  | 'last_brick' | 'multi_destroy' | 'combo_5_finish' | 'boss_finish' | 'case_closed'
  | 'bricklim_single' | 'bricklim_double' | 'bricklim_triple' | 'shape_blocked' | 'earth_saved';

export interface QuipEntry {
  lines: string[];
  intensity: 'low' | 'medium' | 'high' | 'maximum';
  cooldownMs: number;
}

const QUIPS: Record<QuipTrigger, QuipEntry> = {
  // --- COMBAT FINISHERS (Mortal Kombat Style) ---
  last_brick:       { lines: ['AND STAY DOWN!'], intensity: 'high', cooldownMs: 0 },
  multi_destroy:    { lines: ['NOW WE\'RE TALKING!'], intensity: 'high', cooldownMs: 2000 },
  combo_5_finish:   { lines: ['IN THE ZONE!'], intensity: 'medium', cooldownMs: 3000 },
  boss_finish:      { lines: ['THAT\'S FOR EARTH!'], intensity: 'maximum', cooldownMs: 0 },
  case_closed:      { lines: ['CASE CLOSED!'], intensity: 'high', cooldownMs: 0 },

  // --- BRICKLIMINATOR FINISHERS ---
  bricklim_single:  { lines: ['ONE DOWN!'], intensity: 'low', cooldownMs: 1500 },
  bricklim_double:  { lines: ['KEEP IT COMING!'], intensity: 'medium', cooldownMs: 1500 },
  bricklim_triple:  { lines: ['ABSOLUTELY MENTAL!'], intensity: 'high', cooldownMs: 1000 },
  shape_blocked:    { lines: ['NOT TODAY!'], intensity: 'medium', cooldownMs: 2000 },
  earth_saved:      { lines: ['HUMANITY LIVES!'], intensity: 'maximum', cooldownMs: 0 },

  // --- ARKANOID PHASE ---
  good_shot:        { lines: ['Jolly good shot!', 'Splendid!', 'Take that, you geometric menaces!'], intensity: 'medium', cooldownMs: 3000 },
  near_miss:        { lines: ['I say, that was TOO close!', 'Nearly had us both killed!'], intensity: 'medium', cooldownMs: 4000 },
  perfect_bounce:   { lines: ['Oh, that was BEAUTIFUL!', 'Chef\'s kiss!'], intensity: 'high', cooldownMs: 5000 },
  missed_ball:      { lines: ['No matter, we adapt!', 'Onward and upward!'], intensity: 'low', cooldownMs: 2000 },
  ball_stuck:       { lines: ['Right then, let\'s think...', 'Patience, my friend.'], intensity: 'low', cooldownMs: 5000 },

  // --- POWER-UPS ---
  powerup_collect:  { lines: ['Oh YES!', 'Do hope this helps!', 'Capital!'], intensity: 'medium', cooldownMs: 2000 },
  rare_powerup:     { lines: ['GOOD HEAVENS!', 'Well I NEVER!'], intensity: 'high', cooldownMs: 2000 },
  powerup_expire:   { lines: ['Ah, back to normal...', 'Was fun while it lasted.'], intensity: 'low', cooldownMs: 5000 },
  multiball:        { lines: ['Now we\'re cooking!', 'Chaos theory, friend!'], intensity: 'medium', cooldownMs: 3000 },

  // --- PROGRESSION ---
  level_start:      { lines: ['Ready when you are!', 'Earth is counting on us!'], intensity: 'medium', cooldownMs: 0 },
  level_complete:   { lines: ['We\'re not doomed after all!', 'Onward!', 'HA! Take THAT, Brick-Liens!'], intensity: 'high', cooldownMs: 0 },
  perfect_clear:    { lines: ['FLAWLESS!', 'They\'ll write SONGS about this!'], intensity: 'maximum', cooldownMs: 0 },
  new_high_score:   { lines: ['I ALWAYS believed in you!', 'Historic! Absolutely historic!'], intensity: 'high', cooldownMs: 0 },

  // --- BOSS ---
  boss_appears:     { lines: ['Oh dear. That\'s... quite large.', 'I suppose negotiation is off the table?'], intensity: 'high', cooldownMs: 0 },
  boss_damaged:     { lines: ['Feel that? That\'s justice!', 'One down, presumably many more to go.'], intensity: 'medium', cooldownMs: 4000 },
  boss_defeated:    { lines: ['Down goes the commander!', 'That\'s for threatening MY planet!'], intensity: 'maximum', cooldownMs: 0 },
  boss_escapes:     { lines: ['They\'ll be back... but so will WE!'], intensity: 'medium', cooldownMs: 0 },

  // --- BRICKLIMINATOR PHASE ---
  bricklim_start:   { lines: ['Right! Plan B it is!', 'Time to earn my paycheck!'], intensity: 'high', cooldownMs: 0 },
  shape_launched:   { lines: ['Incoming!', 'Make it count!'], intensity: 'low', cooldownMs: 3000 },
  line_clear:       { lines: ['NICE!', 'Lovely!', 'Keep \'em coming!'], intensity: 'medium', cooldownMs: 1500 },
  line_combo:       { lines: ['THIS IS SPARTA!', 'UNSTOPPABLE!'], intensity: 'high', cooldownMs: 1000 },
  earth_damaged:    { lines: ['Earth takes a hit! Stay focused!', 'We can recover from this!'], intensity: 'medium', cooldownMs: 3000 },
  earth_critical:   { lines: ['THIS IS IT! GIVE EVERYTHING!', 'NOW OR NEVER!'], intensity: 'maximum', cooldownMs: 2000 },

  // --- HEALTH & STATUS ---
  low_health:       { lines: ['Might want to focus now!', 'This could be problematic!'], intensity: 'medium', cooldownMs: 8000 },
  extra_life:       { lines: ['Another go! Excellent!', 'I\'m getting rather good at this!'], intensity: 'high', cooldownMs: 0 },
  life_lost:        { lines: ['Ah. Well. That happened.', 'Temporary setback!', 'Note to self: don\'t do that again.'], intensity: 'medium', cooldownMs: 0 },

  // --- FAILURE & DEATH ---
  game_over:        { lines: ['Well played, friend.', 'The Brick-Liens got lucky.'], intensity: 'low', cooldownMs: 0 },
  earth_paved:      { lines: ['Well... on the bright side, property values were terrible.', 'Perhaps we try the next planet over?'], intensity: 'medium', cooldownMs: 0 },
  continue_game:    { lines: ['Right then, let\'s do this properly!', 'One more chance. Make it count.'], intensity: 'medium', cooldownMs: 0 },

  // --- COMBO CHAINS ---
  combo_2:          { lines: ['Two! Keep it up!'], intensity: 'low', cooldownMs: 2000 },
  combo_3:          { lines: ['THREE! We\'re on a ROLL!'], intensity: 'medium', cooldownMs: 2000 },
  combo_5:          { lines: ['FIVE! IS THIS REAL LIFE?!'], intensity: 'high', cooldownMs: 2000 },
  combo_10:         { lines: ['I... I don\'t know what to say. Incredible.'], intensity: 'maximum', cooldownMs: 0 },

  // --- IDLE ---
  idle:             { lines: [
    'Rather warm in here, isn\'t it?',
    'Odd... the Brick-Liens move in threes.',
    'Take your time. I\'m not going anywhere.',
    'Must remember to oil the old joints...',
    'I\'m primarily decorative, but I BELIEVE in you!',
    'My job is to look good and provide commentary. Yours is the not-dying part.',
    'I say, being a golden silhouette is harder than it looks!',
  ], intensity: 'low', cooldownMs: 15000 },

  // --- REACTIONS ---
  bad_bounce:       { lines: ['No-no-no-no-YES! There we go!'], intensity: 'medium', cooldownMs: 5000 },
  stuck_ball:       { lines: ['Classic. Classic tactic, really.'], intensity: 'low', cooldownMs: 8000 },
  missed_easy:      { lines: ['Happens to the best of us!'], intensity: 'low', cooldownMs: 5000 },
  accidental_clear: { lines: ['I\'ll take it! Fortune favors the bold!'], intensity: 'medium', cooldownMs: 3000 },
  unexpected_combo: { lines: ['Did I DO that? ...Yes, yes I did.'], intensity: 'medium', cooldownMs: 3000 },
};

// --- QUIP ENGINE ---
export class QuipEngine {
  private cooldowns = new Map<QuipTrigger, number>();
  private displayTimeout: ReturnType<typeof setTimeout> | null = null;
  private quipElement: HTMLElement | null = null;
  private lastIdleTime = 0;
  private idleThreshold = 10000; // 10 seconds of no action triggers idle

  init() {
    this.quipElement = document.getElementById('fnlloydQuip');
    this.lastIdleTime = Date.now();
  }

  trigger(event: QuipTrigger): string | null {
    const entry = QUIPS[event];
    if (!entry) return null;

    // Check cooldown
    const now = Date.now();
    const lastUsed = this.cooldowns.get(event) ?? 0;
    if (now - lastUsed < entry.cooldownMs) return null;

    // Pick a random line
    const line = entry.lines[Math.floor(Math.random() * entry.lines.length)];
    this.cooldowns.set(event, now);
    this.lastIdleTime = now;

    // Display
    this.showQuip(line, entry.intensity);
    return line;
  }

  checkIdle() {
    const now = Date.now();
    if (now - this.lastIdleTime > this.idleThreshold) {
      this.trigger('idle');
    }
  }

  private showQuip(text: string, intensity: 'low' | 'medium' | 'high' | 'maximum') {
    if (!this.quipElement) return;

    if (this.displayTimeout) clearTimeout(this.displayTimeout);

    this.quipElement.textContent = text;
    this.quipElement.classList.add('active');

    // Style based on intensity
    const colors: Record<string, string> = {
      low: COLORS_INTENSITY.low,
      medium: COLORS_INTENSITY.medium,
      high: COLORS_INTENSITY.high,
      maximum: COLORS_INTENSITY.maximum,
    };
    this.quipElement.style.color = colors[intensity];
    this.quipElement.style.textShadow = `0 0 12px ${colors[intensity]}`;

    // Scale based on intensity
    const scales: Record<string, string> = {
      low: '1.0', medium: '1.1', high: '1.2', maximum: '1.4',
    };
    this.quipElement.style.transform = `translateX(-50%) scale(${scales[intensity]})`;

    const durations: Record<string, number> = {
      low: 2000, medium: 2500, high: 3000, maximum: 4000,
    };

    this.displayTimeout = setTimeout(() => {
      if (this.quipElement) {
        this.quipElement.classList.remove('active');
        this.quipElement.style.transform = 'translateX(-50%) scale(1)';
      }
    }, durations[intensity]);
  }
}

const COLORS_INTENSITY = {
  low: '#E0A0FF',
  medium: '#00d4ff',
  high: '#ffc107',
  maximum: '#ff3366',
};

// Singleton
export const quipEngine = new QuipEngine();
