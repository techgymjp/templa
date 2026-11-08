// 具材イラスト（SVG, viewBox 0 0 64 64）
const L = 'stroke="#3a2514" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"';

const ICONS = {
  hotate: `
    <path d="M32.0 52.0 L6.9 37.5 Q5.5 32.3 10.9 32.1 Q10.8 26.7 16.1 27.8 Q17.2 22.5 22.1 24.7 Q24.4 19.9 28.6 23.2 Q32.0 19.0 35.4 23.2 Q39.6 19.9 41.9 24.7 Q46.8 22.5 47.9 27.8 Q53.2 26.7 53.1 32.1 Q58.5 32.3 57.1 37.5 Z" fill="#f0a27a" ${L}/>
    <path d="M32 52 L11.6 32.8" stroke="#c2643c" stroke-width="1.5" opacity="0.8"/><path d="M32 52 L16.6 28.6" stroke="#c2643c" stroke-width="1.5" opacity="0.8"/><path d="M32 52 L22.4 25.7" stroke="#c2643c" stroke-width="1.5" opacity="0.8"/><path d="M32 52 L28.7 24.2" stroke="#c2643c" stroke-width="1.5" opacity="0.8"/><path d="M32 52 L35.3 24.2" stroke="#c2643c" stroke-width="1.5" opacity="0.8"/><path d="M32 52 L41.6 25.7" stroke="#c2643c" stroke-width="1.5" opacity="0.8"/><path d="M32 52 L47.4 28.6" stroke="#c2643c" stroke-width="1.5" opacity="0.8"/><path d="M32 52 L52.4 32.8" stroke="#c2643c" stroke-width="1.5" opacity="0.8"/>
    <path d="M23 51 h18 l-3 6 h-12z" fill="#e48a62" ${L}/>
    <ellipse cx="32" cy="45" rx="12" ry="4.5" fill="#000" opacity="0.15"/>
    <path d="M20 35 v7 a12 4.5 0 0 0 24 0 v-7" fill="#ece0c6" ${L}/>
    <ellipse cx="32" cy="35" rx="12" ry="4.5" fill="#fbf6ea" ${L}/>
    <path d="M25 35 q7 -2.5 14 0" fill="none" stroke="#e6dbc4" stroke-width="1.5"/>`,
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
    <ellipse cx="32" cy="47" rx="24" ry="6" fill="#000" opacity="0.1"/>
    <path d="M10 38 q2 -16 22 -18 q20 2 22 18 q-6 8 -22 8 q-16 0 -22 -8z" fill="#e9c27a" opacity="0.55"/>
    <path d="M39.2 32.7 Q32.4 38.1 22.1 35.3" fill="none" stroke="#8a5a20" stroke-width="4.2" stroke-linecap="round"/>
    <path d="M39.2 32.7 Q32.4 38.1 22.1 35.3" fill="none" stroke="#f4dfa8" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M39.8 30.1 Q36.1 35.5 26.5 34.7" fill="none" stroke="#8a5a20" stroke-width="4.2" stroke-linecap="round"/>
    <path d="M39.8 30.1 Q36.1 35.5 26.5 34.7" fill="none" stroke="#f4dfa8" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M28.9 23.7 Q35.6 25.9 34.0 30.4" fill="none" stroke="#8a5a20" stroke-width="4.2" stroke-linecap="round"/>
    <path d="M28.9 23.7 Q35.6 25.9 34.0 30.4" fill="none" stroke="#f4dfa8" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M14.9 31.1 Q22.1 25.1 33.7 27.8" fill="none" stroke="#8a5a20" stroke-width="4.2" stroke-linecap="round"/>
    <path d="M14.9 31.1 Q22.1 25.1 33.7 27.8" fill="none" stroke="#f4dfa8" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M37.4 36.1 Q27.6 34.4 27.6 28.3" fill="none" stroke="#8a5a20" stroke-width="4.2" stroke-linecap="round"/>
    <path d="M37.4 36.1 Q27.6 34.4 27.6 28.3" fill="none" stroke="#f4dfa8" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M30.5 38.3 Q18.1 40.0 12.7 33.1" fill="none" stroke="#8a5a20" stroke-width="4.2" stroke-linecap="round"/>
    <path d="M30.5 38.3 Q18.1 40.0 12.7 33.1" fill="none" stroke="#f4dfa8" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M44.5 34.6 Q41.5 39.0 33.6 38.6" fill="none" stroke="#8a5a20" stroke-width="4.2" stroke-linecap="round"/>
    <path d="M44.5 34.6 Q41.5 39.0 33.6 38.6" fill="none" stroke="#f4dfa8" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M22.8 41.0 Q14.7 37.5 18.6 32.0" fill="none" stroke="#8a5a20" stroke-width="4.2" stroke-linecap="round"/>
    <path d="M22.8 41.0 Q14.7 37.5 18.6 32.0" fill="none" stroke="#f4dfa8" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M27.2 24.2 Q37.3 22.6 42.5 28.0" fill="none" stroke="#8a5a20" stroke-width="4.2" stroke-linecap="round"/>
    <path d="M27.2 24.2 Q37.3 22.6 42.5 28.0" fill="none" stroke="#f4dfa8" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M31.6 26.0 Q42.8 25.7 46.2 32.1" fill="none" stroke="#8a5a20" stroke-width="4.2" stroke-linecap="round"/>
    <path d="M31.6 26.0 Q42.8 25.7 46.2 32.1" fill="none" stroke="#f4dfa8" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M41.1 23.3 Q48.8 23.7 50.4 28.3" fill="none" stroke="#8a5a20" stroke-width="4.2" stroke-linecap="round"/>
    <path d="M41.1 23.3 Q48.8 23.7 50.4 28.3" fill="none" stroke="#f4dfa8" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M32.8 21.5 Q43.9 23.5 43.0 30.4" fill="none" stroke="#8a5a20" stroke-width="4.2" stroke-linecap="round"/>
    <path d="M32.8 21.5 Q43.9 23.5 43.0 30.4" fill="none" stroke="#f4dfa8" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M28.9 27.5 Q37.4 22.6 47.3 26.5" fill="none" stroke="#8a5a20" stroke-width="4.2" stroke-linecap="round"/>
    <path d="M28.9 27.5 Q37.4 22.6 47.3 26.5" fill="none" stroke="#f4dfa8" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M30.6 39.3 Q28.5 37.7 22.4 40.2" fill="none" stroke="#e2621a" stroke-width="1.9" stroke-linecap="round"/>
    <path d="M37.3 26.0 Q36.5 26.3 31.8 30.5" fill="none" stroke="#e2621a" stroke-width="1.9" stroke-linecap="round"/>
    <path d="M47.8 39.0 Q52.3 38.8 52.7 42.7" fill="none" stroke="#e2621a" stroke-width="1.9" stroke-linecap="round"/>
    <path d="M37.4 25.4 Q39.8 25.4 38.2 29.5" fill="none" stroke="#e2621a" stroke-width="1.9" stroke-linecap="round"/>
    <path d="M19.7 26.0 Q19.3 25.3 14.8 28.7" fill="none" stroke="#e2621a" stroke-width="1.9" stroke-linecap="round"/>
    <path d="M23.9 31.6 Q23.0 30.4 18.0 33.2" fill="none" stroke="#e2621a" stroke-width="1.9" stroke-linecap="round"/>
    <path d="M30.4 34.3 Q27.7 33.4 21.0 36.5" fill="none" stroke="#e2621a" stroke-width="1.9" stroke-linecap="round"/>
    <path d="M43.6 29.7 Q46.7 30.0 45.7 34.2" fill="none" stroke="#e2621a" stroke-width="1.9" stroke-linecap="round"/>
    <path d="M44.3 41.3 Q49.4 40.2 50.4 43.2" fill="none" stroke="#e2621a" stroke-width="1.9" stroke-linecap="round"/>
    <path d="M23.4 29.0 Q25.6 29.6 23.9 34.3" fill="none" stroke="#e2621a" stroke-width="1.9" stroke-linecap="round"/>
    <path d="M24.4 25.1 Q27.4 25.3 26.4 29.6" fill="none" stroke="#e2621a" stroke-width="1.9" stroke-linecap="round"/>
    <path d="M34.1 41.2 Q33.7 41.3 29.3 45.5" fill="none" stroke="#e2621a" stroke-width="1.9" stroke-linecap="round"/>
    <ellipse cx="22" cy="30" rx="4" ry="2.6" transform="rotate(-20 22 30)" fill="#2f6e2a" stroke="#1e4a1c" stroke-width="1"/>
    <ellipse cx="40" cy="26" rx="4.2" ry="2.8" transform="rotate(25 40 26)" fill="#2f6e2a" stroke="#1e4a1c" stroke-width="1"/>
    <ellipse cx="36" cy="40" rx="3.6" ry="2.4" transform="rotate(-10 36 40)" fill="#2f6e2a" stroke="#1e4a1c" stroke-width="1"/>
    <ellipse cx="27" cy="41" rx="3" ry="2" transform="rotate(30 27 41)" fill="#2f6e2a" stroke="#1e4a1c" stroke-width="1"/>
    <ellipse cx="46" cy="36" rx="3.2" ry="2.2" transform="rotate(0 46 36)" fill="#2f6e2a" stroke="#1e4a1c" stroke-width="1"/>
    <circle cx="35.8" cy="37.8" r="0.8" fill="#d9a24a"/>
    <circle cx="44.8" cy="39.5" r="1.5" fill="#d9a24a"/>
    <circle cx="41.5" cy="33.3" r="1.1" fill="#d9a24a"/>
    <circle cx="19.3" cy="37.1" r="0.8" fill="#d9a24a"/>
    <circle cx="18.2" cy="30.3" r="0.9" fill="#d9a24a"/>
    <circle cx="26.9" cy="27.8" r="0.8" fill="#d9a24a"/>
    <circle cx="20.8" cy="28.6" r="1.1" fill="#d9a24a"/>
    <circle cx="16.8" cy="41.0" r="1.3" fill="#d9a24a"/>
    <circle cx="20.8" cy="31.0" r="1.1" fill="#d9a24a"/>
    <circle cx="27.7" cy="29.0" r="1.5" fill="#d9a24a"/>`,
};

export function iconSVG(key, size = 48) {
  return `<svg viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true">${ICONS[key]}</svg>`;
}
