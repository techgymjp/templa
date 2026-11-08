// 具材イラスト（SVG, viewBox 0 0 64 64）
const L = 'stroke="#3a2514" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"';

const ICONS = {
  hotate: `
    <ellipse cx="32" cy="44" rx="20" ry="6" fill="#d9c9a6" ${L}/>
    <path d="M12 30 v13 a20 6 0 0 0 40 0 v-13" fill="#f3e9d4" ${L}/>
    <ellipse cx="32" cy="30" rx="20" ry="7" fill="#fbf5e8" ${L}/>
    <path d="M20 30 q12 -4 24 0" fill="none" stroke="#e2d4b6" stroke-width="2"/>
    <path d="M16 38 v4 M48 38 v4" stroke="#e2d4b6" stroke-width="2"/>`,
  kaki: `
    <path d="M8 36 q2 -18 22 -20 q22 -2 27 16 q2 14 -16 18 q-24 6 -33 -14z" fill="#6f6b62" ${L}/>
    <path d="M14 35 q3 -12 18 -13 q16 -1 19 11 q1 9 -13 12 q-18 4 -24 -10z" fill="#d6ccb4" ${L}/>
    <path d="M16 35 q4 3 2 6 q4 2 3 5 q5 1 6 4 q5 0 8 2" fill="none" stroke="#4a4038" stroke-width="2.5"/>
    <ellipse cx="34" cy="31" rx="7" ry="4" fill="#efe7d4"/>`,
  anago: `
    <path d="M4 34 q14 -10 28 -4 t28 -2 l0 8 q-14 6 -28 2 t-28 4z" fill="#3f3328" ${L}/>
    <path d="M6 33 q13 -8 26 -3 t26 -2 l0 3 q-14 5 -26 1 t-26 3z" fill="#f1e8da"/>
    <circle cx="10" cy="34" r="1.6" fill="#1b130c"/>
    <path d="M60 30 l3 -3 v12 l-3 -3" fill="#3f3328" ${L}/>`,
  ebi: `
    <path d="M12 46 q-6 -16 8 -26 q14 -9 26 -2" fill="none" stroke="#3a2514" stroke-width="15" stroke-linecap="round"/>
    <path d="M12 46 q-6 -16 8 -26 q14 -9 26 -2" fill="none" stroke="#f08a6a" stroke-width="11" stroke-linecap="round"/>
    <path d="M14 38 l7 1 M17 29 l6 4 M25 22 l3 6 M34 18 l0 7" stroke="#d0583c" stroke-width="2"/>
    <path d="M46 18 l10 -9 l2 8 l6 2 l-12 8z" fill="#e0402a" ${L}/>
    <path d="M9 46 q-4 4 -2 8" fill="none" stroke="#e0402a" stroke-width="2"/>`,
  kisu: `
    <path d="M6 32 q14 -16 34 -10 l10 6 l10 -8 l-3 12 l3 12 l-10 -8 l-10 6 q-20 6 -34 -10z" fill="#cfd3d1" ${L}/>
    <path d="M10 32 q14 -10 30 -6 q-4 6 0 12 q-16 4 -30 -6z" fill="#f7f2e8"/>
    <circle cx="12" cy="30" r="2" fill="#1b130c"/>
    <path d="M22 22 q10 -4 18 0" fill="none" stroke="#9aa3a0" stroke-width="1.6"/>`,
  nasu: `
    <path d="M14 40 q-4 -18 14 -24 q18 -6 26 8 q8 16 -8 24 q-24 10 -32 -8z" fill="#4a1d48" ${L}/>
    <path d="M18 39 q-2 -13 12 -18 q14 -4 20 7 q5 12 -7 18 q-19 7 -25 -7z" fill="#efe4bf"/>
    <path d="M26 30 l14 12 M24 36 l12 9 M30 25 l14 12" stroke="#d9cc9e" stroke-width="1.8"/>
    <path d="M44 12 q6 -2 10 2 q-4 2 -6 8 q-4 -2 -6 -4z" fill="#5f7a2e" ${L}/>`,
  shishito: `
    <path d="M10 40 q4 -12 20 -14 q16 -2 24 -8 q2 8 -8 16 q-14 10 -36 6z" fill="#4a9a34" ${L}/>
    <path d="M18 36 q10 -6 26 -10" fill="none" stroke="#7cc45e" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M54 18 q4 -6 8 -6" fill="none" stroke="#5d7a2c" stroke-width="4" stroke-linecap="round"/>`,
  renkon: `
    <circle cx="32" cy="32" r="22" fill="#efe3c8" ${L}/>
    <circle cx="32" cy="32" r="18" fill="#f7efdc"/>
    <circle cx="32" cy="32" r="4" fill="#c9b48e" ${L}/>
    ${[0, 1, 2, 3, 4, 5, 6].map(i => {
      const a = i / 7 * Math.PI * 2 - Math.PI / 2;
      return `<ellipse cx="${32 + Math.cos(a) * 12}" cy="${32 + Math.sin(a) * 12}" rx="4.4" ry="4" fill="#c9b48e" ${L}/>`;
    }).join('')}`,
  maitake: `
    <path d="M28 56 q-2 -14 4 -22 q6 8 4 22z" fill="#e4d8c0" ${L}/>
    <path d="M10 34 q2 -10 12 -10 q-2 -10 10 -12 q10 -2 12 8 q10 -2 12 8 q0 8 -10 8 q-6 6 -16 2 q-10 6 -20 -4z" fill="#6b5440" ${L}/>
    <path d="M16 32 q6 -4 12 0 M30 20 q6 -2 10 2 M38 30 q6 -3 12 0" fill="none" stroke="#a08668" stroke-width="2"/>`,
  kakiage: `
    <path d="M8 38 q-2 -16 18 -20 q16 -4 28 6 q8 8 2 18 q-10 10 -28 8 q-16 -2 -20 -12z" fill="#e7b25a" ${L}/>
    <path d="M14 30 l14 4 M30 22 l12 10 M20 42 l18 -4" stroke="#e8762a" stroke-width="3" stroke-linecap="round"/>
    <path d="M22 26 q6 6 0 12 M40 38 q-6 -4 -2 -10" fill="none" stroke="#f7f0d8" stroke-width="2.5"/>
    <path d="M44 22 l6 6 M12 40 l6 -2" stroke="#3f8f35" stroke-width="3" stroke-linecap="round"/>
    <circle cx="34" cy="40" r="3" fill="#f08a6a"/>`,
};

export function iconSVG(key, size = 48) {
  return `<svg viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true">${ICONS[key]}</svg>`;
}
