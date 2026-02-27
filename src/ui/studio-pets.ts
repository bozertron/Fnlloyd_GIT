// !Fnlloyd STUDIO — WindowPet sprite configs

export interface PetConfig {
  label: string;
  src: string;
  frameSize: number;
  walkRow: number;   // 1-based row index
  walkFrames: number;
  idleRow: number;
  idleFrames: number;
}

export const PETS: PetConfig[] = [
  { label: 'Pusheen',      src: '/libs/pets/Pusheen.png',      frameSize: 128, walkRow: 2, walkFrames: 4, idleRow: 1, idleFrames: 1 },
  { label: 'Slugcat',      src: '/libs/pets/slugcat.png',      frameSize: 64,  walkRow: 1, walkFrames: 4, idleRow: 1, idleFrames: 1 },
  { label: 'Gengar',       src: '/libs/pets/Gengar.png',       frameSize: 128, walkRow: 2, walkFrames: 4, idleRow: 1, idleFrames: 1 },
  { label: 'PunishingBird',src: '/libs/pets/PunishingBird.png',frameSize: 128, walkRow: 2, walkFrames: 4, idleRow: 1, idleFrames: 1 },
];
