/**
 * Nature Modifiers for Pokémon Stats
 *
 * Each nature provides a 1.1x boost to one stat and 0.9x reduction to another,
 * or 1.0x (neutral) for all stats.
 *
 * @constant {Object} NATURES
 * @property {Object} [natureName] - Nature name in lowercase
 * @property {number} [natureName].atk - Attack modifier (0.9, 1.0, or 1.1)
 * @property {number} [natureName].def - Defense modifier (0.9, 1.0, or 1.1)
 * @property {number} [natureName].spa - Special Attack modifier (0.9, 1.0, or 1.1)
 * @property {number} [natureName].spd - Special Defense modifier (0.9, 1.0, or 1.1)
 * @property {number} [natureName].spe - Speed modifier (0.9, 1.0, or 1.1)
 *
 * @example
 * // Adamant nature: +Atk, -SpA
 * NATURES.adamant // { atk: 1.1, def: 1.0, spa: 0.9, spd: 1.0, spe: 1.0 }
 *
 * // Timid nature: +Spe, -Atk
 * NATURES.timid // { atk: 0.9, def: 1.0, spa: 1.0, spd: 1.0, spe: 1.1 }
 *
 * // Hardy nature: Neutral (no boosts or drops)
 * NATURES.hardy // { atk: 1.0, def: 1.0, spa: 1.0, spd: 1.0, spe: 1.0 }
 */
export const NATURES = {
  hardy: { atk: 1.0, def: 1.0, spa: 1.0, spd: 1.0, spe: 1.0 },
  lonely: { atk: 1.1, def: 0.9, spa: 1.0, spd: 1.0, spe: 1.0 },
  brave: { atk: 1.1, def: 1.0, spa: 1.0, spd: 1.0, spe: 0.9 },
  adamant: { atk: 1.1, def: 1.0, spa: 0.9, spd: 1.0, spe: 1.0 },
  naughty: { atk: 1.1, def: 1.0, spa: 1.0, spd: 0.9, spe: 1.0 },
  bold: { atk: 0.9, def: 1.1, spa: 1.0, spd: 1.0, spe: 1.0 },
  docile: { atk: 1.0, def: 1.0, spa: 1.0, spd: 1.0, spe: 1.0 },
  relaxed: { atk: 1.0, def: 1.1, spa: 1.0, spd: 1.0, spe: 0.9 },
  impish: { atk: 1.0, def: 1.1, spa: 0.9, spd: 1.0, spe: 1.0 },
  lax: { atk: 1.0, def: 1.1, spa: 1.0, spd: 0.9, spe: 1.0 },
  timid: { atk: 0.9, def: 1.0, spa: 1.0, spd: 1.0, spe: 1.1 },
  hasty: { atk: 1.0, def: 0.9, spa: 1.0, spd: 1.0, spe: 1.1 },
  serious: { atk: 1.0, def: 1.0, spa: 1.0, spd: 1.0, spe: 1.0 },
  jolly: { atk: 1.0, def: 1.0, spa: 0.9, spd: 1.0, spe: 1.1 },
  naive: { atk: 1.0, def: 1.0, spa: 1.0, spd: 0.9, spe: 1.1 },
  modest: { atk: 0.9, def: 1.0, spa: 1.1, spd: 1.0, spe: 1.0 },
  mild: { atk: 1.0, def: 0.9, spa: 1.1, spd: 1.0, spe: 1.0 },
  quiet: { atk: 1.0, def: 1.0, spa: 1.1, spd: 1.0, spe: 0.9 },
  bashful: { atk: 1.0, def: 1.0, spa: 1.0, spd: 1.0, spe: 1.0 },
  rash: { atk: 1.0, def: 1.0, spa: 1.1, spd: 0.9, spe: 1.0 },
  calm: { atk: 0.9, def: 1.0, spa: 1.0, spd: 1.1, spe: 1.0 },
  gentle: { atk: 1.0, def: 0.9, spa: 1.0, spd: 1.1, spe: 1.0 },
  sassy: { atk: 1.0, def: 1.0, spa: 1.0, spd: 1.1, spe: 0.9 },
  careful: { atk: 1.0, def: 1.0, spa: 0.9, spd: 1.1, spe: 1.0 },
  quirky: { atk: 1.0, def: 1.0, spa: 1.0, spd: 1.0, spe: 1.0 },
};
