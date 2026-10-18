/*
 * Copiado de React Bits (https://reactbits.dev, Sound Lab), sin cambios de lógica.
 * Copyright (c) 2026 David Haz — MIT + Commons Clause License Condition v1.0.
 * Este archivo NO está bajo la licencia MIT de Zaldo: se usa como parte de la
 * aplicación y no puede venderse ni redistribuirse por separado.
 * Licencia completa: https://github.com/DavidHDev/react-bits/blob/main/LICENSE.md
 */

/* Recetas de sonido de React Bits Sound Lab. Cada una la renderiza motorSonido.js. */

export const blop = {
  duration: 0.12,
  seed: 343,
  loudness: -17,
  lowpass: 5000,
  reverb: { mix: 0.08, decay: 0.25, predelay: 0.01, damp: 5000 },
  layers: [
    {
      type: 'tone',
      freq: { from: 520, to: 260, time: 0.03, curve: 2 },
      partials: [
        [1, 1, 1],
        [2, 0.15, 0.5]
      ],
      env: { attack: 0.002, decay: 0.06, curve: 5 }
    }
  ]
};


export const pickup = {
  duration: 0.22,
  seed: 211,
  loudness: -20,
  lowpass: 7000,
  reverb: { mix: 0.08, decay: 0.3, predelay: 0.01, damp: 5000 },
  layers: [
    {
      type: 'tone',
      freq: 659.26,
      at: 0,
      gain: -4,
      partials: [
        [1, 1, 1],
        [2, 0.2, 0.55],
        [3, 0.08, 0.35],
        [4, 0.035, 0.22],
        [5, 0.015, 0.15]
      ],
      env: { attack: 0.0015, decay: 0.12, curve: 6 }
    },
    {
      type: 'tone',
      freq: { from: 440, to: 659.26, time: 0.08, curve: 2 },
      gain: -10,
      env: { attack: 0.02, decay: 0.1, curve: 4 }
    },
    {
      type: 'noise',
      color: 'pink',
      at: 0,
      gain: -22,
      filter: { type: 'bandpass', freq: { from: 800, to: 1800, time: 0.09, curve: 2 }, q: 0.8 },
      env: { attack: 0.03, rise: 1.5, decay: 0.06, curve: 4 }
    }
  ]
};


export const release = {
  duration: 0.35,
  seed: 84,
  loudness: -19,
  lowpass: 7500,
  reverb: { mix: 0.1, decay: 0.4, predelay: 0.01, damp: 5000 },
  layers: [
    {
      type: 'noise',
      color: 'pink',
      at: 0,
      gain: -12,
      punch: true,
      filter: [
        { type: 'bandpass', freq: 1300, q: 0.8 },
        { type: 'lowpass', freq: 3380, q: 0.5 }
      ],
      env: { attack: 0.001, decay: 0.006, curve: 6 }
    },
    {
      type: 'tone',
      freq: { from: 620, to: 560, time: 0.01, curve: 3 },
      at: 0,
      gain: -8,
      env: { attack: 0.0015, decay: 0.03, curve: 6 }
    },
    {
      type: 'tone',
      freq: { from: 587.33, to: 880, time: 0.12, curve: 2 },
      at: 0.04,
      gain: -6,
      env: { attack: 0.03, decay: 0.2, curve: 4 }
    },
    {
      type: 'noise',
      color: 'pink',
      at: 0.04,
      gain: -22,
      filter: { type: 'bandpass', freq: { from: 1200, to: 3000, time: 0.17, curve: 2 }, q: 0.8 },
      env: { attack: 0.05, rise: 1.5, decay: 0.12, curve: 4 }
    }
  ]
};


export const receipt = {
  duration: 0.1,
  seed: 236,
  loudness: -23,
  lowpass: 8000,
  reverb: { mix: 0.06, decay: 0.2, predelay: 0.01, damp: 5000 },
  layers: [
    {
      type: 'tone',
      freq: 1760,
      at: 0,
      gain: 0,
      partials: [
        [1, 1, 1],
        [2.76, 0.048, 0.4],
        [5.4, 0.012, 0.22]
      ],
      env: { attack: 0.0025, decay: 0.03, curve: 6 }
    },
    {
      type: 'tone',
      freq: 1760,
      at: 0.045,
      gain: -2,
      partials: [
        [1, 1, 1],
        [2.76, 0.048, 0.4],
        [5.4, 0.012, 0.22]
      ],
      env: { attack: 0.0025, decay: 0.04, curve: 6 }
    }
  ]
};


export const ping = {
  duration: 1.2,
  seed: 53,
  loudness: -17,
  lowpass: 8000,
  reverb: { mix: 0.2, decay: 1.2, predelay: 0.01, damp: 6000 },
  layers: [
    {
      type: 'tone',
      freq: 880,
      at: 0,
      gain: 0,
      partials: [
        [1, 1, 1],
        [2, 0.128, 0.55],
        [3, 0.032, 0.35]
      ],
      env: { attack: 0.004, decay: 1.1, curve: 6 }
    }
  ]
};


export const seal = {
  duration: 0.14,
  seed: 83,
  loudness: -19,
  lowpass: 6500,
  reverb: { mix: 0.06, decay: 0.25, predelay: 0.01, damp: 5000 },
  layers: [
    {
      type: 'noise',
      color: 'pink',
      at: 0,
      gain: -8,
      punch: true,
      filter: [
        { type: 'bandpass', freq: 1000, q: 0.8 },
        { type: 'lowpass', freq: 2600, q: 0.5 }
      ],
      env: { attack: 0.001, decay: 0.01, curve: 6 }
    },
    {
      type: 'tone',
      freq: { from: 300, to: 220, time: 0.02, curve: 3 },
      at: 0,
      gain: -4,
      env: { attack: 0.0015, decay: 0.05, curve: 6 }
    },
    {
      type: 'tone',
      freq: 783.99,
      at: 0.014,
      gain: -16,
      partials: [
        [1, 1, 1],
        [3.93, 0.16, 0.25],
        [9.2, 0.025, 0.1]
      ],
      env: { attack: 0.002, decay: 0.03, curve: 6 }
    }
  ]
};


export const bubble = {
  duration: 0.3,
  seed: 232,
  loudness: -19,
  lowpass: 6500,
  reverb: { mix: 0.1, decay: 0.35, predelay: 0.01, damp: 5000 },
  layers: [
    {
      type: 'tone',
      freq: { from: 566.9636, to: 659.26, time: 0.02, curve: 2 },
      partials: [
        [1, 1, 1],
        [2, 0.12, 0.5]
      ],
      env: { attack: 0.003, decay: 0.07, curve: 5 }
    },
    {
      type: 'tone',
      freq: { from: 849.4822, to: 987.77, time: 0.02, curve: 2 },
      at: 0.085,
      partials: [
        [1, 1, 1],
        [2, 0.12, 0.5]
      ],
      env: { attack: 0.003, decay: 0.11, curve: 5 }
    }
  ]
};


export const undo = {
  duration: 0.16,
  seed: 48,
  loudness: -20,
  lowpass: 6500,
  reverb: { mix: 0.08, decay: 0.25, predelay: 0.01, damp: 5000 },
  layers: [
    {
      type: 'tone',
      freq: { from: 880, to: 587.33, time: 0.09, curve: 2 },
      env: { attack: 0.03, rise: 2, decay: 0.06, curve: 4 }
    },
    {
      type: 'noise',
      color: 'pink',
      gain: -16,
      filter: { type: 'bandpass', freq: { from: 2400, to: 1100, time: 0.1 }, q: 0.9 },
      env: { attack: 0.05, rise: 2, decay: 0.03, curve: 4 }
    }
  ]
};


export const check = {
  duration: 0.1,
  seed: 33,
  loudness: -20,
  lowpass: 7000,
  reverb: { mix: 0.06, decay: 0.2, predelay: 0.01, damp: 5000 },
  layers: [
    {
      type: 'tone',
      freq: 783.99,
      at: 0,
      gain: 0,
      partials: [
        [1, 1, 1],
        [3.93, 0.16, 0.25],
        [9.2, 0.025, 0.1]
      ],
      env: { attack: 0.002, decay: 0.055, curve: 6 }
    },
    {
      type: 'noise',
      color: 'pink',
      at: 0,
      gain: -20,
      punch: true,
      filter: [
        { type: 'bandpass', freq: 1600, q: 0.8 },
        { type: 'lowpass', freq: 4160, q: 0.5 }
      ],
      env: { attack: 0.0008, decay: 0.004, curve: 6 }
    }
  ]
};


export const shrug = {
  duration: 0.55,
  seed: 43,
  loudness: -18,
  lowpass: 5500,
  reverb: { mix: 0.12, decay: 0.5, predelay: 0.01, damp: 4500 },
  layers: [
    {
      type: 'tone',
      freq: 659.26,
      at: 0,
      gain: 0,
      partials: [
        [1, 1, 1],
        [2, 0.096, 0.55],
        [3, 0.024, 0.35]
      ],
      env: { attack: 0.006, decay: 0.22, curve: 6 }
    },
    {
      type: 'tone',
      freq: 523.25,
      at: 0.12,
      gain: 0,
      partials: [
        [1, 1, 1],
        [2, 0.096, 0.55],
        [3, 0.024, 0.35]
      ],
      env: { attack: 0.006, decay: 0.32, curve: 6 }
    }
  ]
};


export const arrive = {
  duration: 1.3,
  seed: 55,
  loudness: -17.5,
  lowpass: 7000,
  reverb: { mix: 0.2, decay: 1, predelay: 0.01, damp: 5500 },
  layers: [
    {
      type: 'tone',
      freq: 783.99,
      at: 0,
      gain: 0,
      partials: [
        [1, 1, 1],
        [4, 0.09, 0.35],
        [10, 0.012, 0.12]
      ],
      tremolo: { rate: 5.5, depth: 0.28 },
      env: { attack: 0.003, decay: 0.6, curve: 5 }
    },
    {
      type: 'tone',
      freq: 587.33,
      at: 0.2,
      gain: 0,
      partials: [
        [1, 1, 1],
        [4, 0.09, 0.35],
        [10, 0.012, 0.12]
      ],
      tremolo: { rate: 5.5, depth: 0.28 },
      env: { attack: 0.003, decay: 0.9, curve: 5 }
    }
  ]
};


export const tab = {
  duration: 0.07,
  seed: 203,
  loudness: -21,
  lowpass: 7000,
  highpass: 400,
  reverb: { mix: 0.05, decay: 0.15, predelay: 0.01, damp: 5000 },
  layers: [
    {
      type: 'noise',
      color: 'pink',
      at: 0,
      gain: 0,
      filter: { type: 'bandpass', freq: { from: 1400, to: 2000, time: 0.02, curve: 2 }, q: 1.2 },
      env: { attack: 0.002, rise: 1.5, decay: 0.018, curve: 5 }
    },
    {
      type: 'tone',
      freq: 987.77,
      at: 0,
      gain: -10,
      env: { attack: 0.002, decay: 0.04, curve: 6 }
    }
  ]
};


export const coin = {
  duration: 0.45,
  seed: 251,
  loudness: -18.5,
  lowpass: 7000,
  reverb: { mix: 0.1, decay: 0.4, predelay: 0.01, damp: 5000 },
  layers: [
    {
      type: 'tone',
      freq: 987.77,
      harmonics: [1, 0, 0.18, 0, 0.06],
      filter: { type: 'lowpass', freq: 4500, q: 0.6 },
      env: { attack: 0.002, hold: 0.04, decay: 0.03, curve: 5 }
    },
    {
      type: 'tone',
      freq: 1318.51,
      at: 0.06,
      harmonics: [1, 0, 0.18, 0, 0.06],
      filter: { type: 'lowpass', freq: 5000, q: 0.6 },
      env: { attack: 0.002, decay: 0.35, curve: 5 }
    }
  ]
};


export const appear = {
  duration: 0.2,
  seed: 332,
  loudness: -18,
  lowpass: 7000,
  reverb: { mix: 0.1, decay: 0.35, predelay: 0.01, damp: 5000 },
  layers: [
    {
      type: 'tone',
      freq: { from: 380, to: 798, time: 0.054, curve: 1.6 },
      at: 0,
      gain: 0,
      env: { attack: 0.002, decay: 0.06, curve: 5 }
    },
    {
      type: 'noise',
      color: 'pink',
      at: 0,
      gain: -18,
      filter: { type: 'bandpass', freq: { from: 900, to: 1800, time: 0.062, curve: 2 }, q: 0.9 },
      env: { attack: 0.012, rise: 1.5, decay: 0.05, curve: 4 }
    }
  ]
};


export const shuffle = {
  duration: 0.2,
  seed: 214,
  loudness: -21,
  lowpass: 4500,
  highpass: 300,
  reverb: { mix: 0.06, decay: 0.2, predelay: 0.01, damp: 5000 },
  layers: [
    {
      type: 'noise',
      color: 'pink',
      at: 0,
      gain: 0,
      filter: { type: 'bandpass', freq: { from: 700, to: 1100, time: 0.08, curve: 2 }, q: 0.9 },
      env: { attack: 0.02, rise: 1.5, decay: 0.06, curve: 4 }
    },
    {
      type: 'noise',
      color: 'pink',
      at: 0.07,
      gain: -2,
      filter: { type: 'bandpass', freq: { from: 850, to: 1300, time: 0.09, curve: 2 }, q: 0.9 },
      env: { attack: 0.02, rise: 1.5, decay: 0.07, curve: 4 }
    },
    {
      type: 'noise',
      color: 'pink',
      at: 0.14,
      gain: -18,
      punch: true,
      filter: [
        { type: 'bandpass', freq: 1100, q: 0.8 },
        { type: 'lowpass', freq: 2860, q: 0.5 }
      ],
      env: { attack: 0.001, decay: 0.008, curve: 6 }
    }
  ]
};


