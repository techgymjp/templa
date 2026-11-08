// 具材イラスト（SVG, viewBox 0 0 64 64）
const L = 'stroke="#3a2514" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"';

const ICONS = {
  hotate: `
    <defs>
      <linearGradient id="hs1" x1="0" x2="1"><stop offset="0" stop-color="#e7d3a8"/><stop offset="0.45" stop-color="#f8edd2"/><stop offset="1" stop-color="#dcc597"/></linearGradient>
      <linearGradient id="hs2" x1="0" x2="1"><stop offset="0" stop-color="#e9d6ac"/><stop offset="0.45" stop-color="#faf0d8"/><stop offset="1" stop-color="#ddc79a"/></linearGradient>
      <radialGradient id="ht1" cx="0.4" cy="0.35" r="0.8"><stop offset="0" stop-color="#fffaf0"/><stop offset="1" stop-color="#efe2c3"/></radialGradient>
      <radialGradient id="ht2" cx="0.4" cy="0.35" r="0.8"><stop offset="0" stop-color="#fffbf3"/><stop offset="1" stop-color="#f1e4c6"/></radialGradient>
    </defs>
    <ellipse cx="33" cy="52" rx="25" ry="5" fill="#000" opacity="0.1"/>
    <path d="M29 26 C27 31.4 28 36.2 29.5 38 A12.5 6.5 0 0 0 54.5 38 C56 36.2 57 31.4 55 26z" fill="url(#hs1)" stroke="#9a7a50" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M33.94 31.2 q-0.8 5.4 0.5 9.600000000000001 M40.05 32.5 q-0.3 6.0 0 10.2 M46.55 32.175 q0.5 5.4 0 9.600000000000001" fill="none" stroke="#d6bf92" stroke-width="0.9" opacity="0.7"/>
    <ellipse cx="42" cy="26" rx="13" ry="6.5" fill="url(#ht1)" stroke="#9a7a50" stroke-width="1.6" stroke-linejoin="round"/>
    <ellipse cx="38.75" cy="24.375" rx="5.8500000000000005" ry="2.08" fill="#ffffff" opacity="0.75"/>
    <path d="M10 33 C8 38.4 9 43.2 10.5 45 A14.5 7.5 0 0 0 39.5 45 C41 43.2 42 38.4 40 33z" fill="url(#hs2)" stroke="#9a7a50" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M15.7 39.0 q-0.8 5.4 0.5 9.600000000000001 M22.75 40.5 q-0.3 6.0 0 10.2 M30.25 40.125 q0.5 5.4 0 9.600000000000001" fill="none" stroke="#d6bf92" stroke-width="0.9" opacity="0.7"/>
    <ellipse cx="25" cy="33" rx="15" ry="7.5" fill="url(#ht2)" stroke="#9a7a50" stroke-width="1.6" stroke-linejoin="round"/>
    <ellipse cx="21.25" cy="31.125" rx="6.75" ry="2.4" fill="#ffffff" opacity="0.75"/>`,
  kaki: `
    <defs>
      <radialGradient id="kb1" cx="0.42" cy="0.38" r="0.75"><stop offset="0" stop-color="#fbf7ec"/><stop offset="0.7" stop-color="#e6dfcb"/><stop offset="1" stop-color="#b9b39f"/></radialGradient>
      <radialGradient id="kb2" cx="0.42" cy="0.38" r="0.75"><stop offset="0" stop-color="#fdf9ef"/><stop offset="0.7" stop-color="#e9e2ce"/><stop offset="1" stop-color="#bcb6a2"/></radialGradient>
      <radialGradient id="kf1" cx="0.5" cy="0.5" r="0.6"><stop offset="0.75" stop-color="#6d6458"/><stop offset="1" stop-color="#2c241d"/></radialGradient>
      <radialGradient id="kf2" cx="0.5" cy="0.5" r="0.6"><stop offset="0.75" stop-color="#6f665a"/><stop offset="1" stop-color="#2c241d"/></radialGradient>
    </defs>
    <ellipse cx="32" cy="53" rx="25" ry="5" fill="#000" opacity="0.1"/>
    <path d="M54.0 31.1 Q54.0 34.0 50.2 33.8 Q48.7 36.5 45.4 35.1 Q42.9 37.4 40.4 35.1 Q37.3 36.6 35.8 33.5 Q32.4 34.0 32.0 30.5 Q28.7 29.7 29.3 26.3 Q26.3 24.3 27.8 21.5 Q25.6 18.5 28.0 16.9 Q27.0 13.4 30.1 13.3 Q30.8 10.1 34.3 11.6 Q36.6 9.2 40.0 12.0 Q43.7 10.8 46.2 14.5 Q50.6 14.6 51.6 18.4 Q55.8 19.7 55.1 22.9 Q58.2 25.1 55.9 27.4 Q57.5 30.1 54.0 31.1z" fill="url(#kf1)" stroke="#4a3a2c" stroke-width="1.5" stroke-linejoin="round"/>
    <ellipse cx="41" cy="24" rx="12" ry="8" transform="rotate(28.6 41 24)" fill="url(#kb1)"/>
    <path d="M35.1 25.4 q5.2 4.5 11.0 -0.5" transform="rotate(28.6 41 24)" fill="none" stroke="#c9c1ac" stroke-width="1.4" opacity="0.8"/>
    <ellipse cx="38.4" cy="20.9" rx="4.9" ry="2.0" transform="rotate(28.6 41 24)" fill="#ffffff" opacity="0.8"/>
    <path d="M35.3 27.8 L33.4 26.6 L33.0 24.8 L31.7 23.2 L32.2 21.7 L31.7 20.0 L33.1 19.0 L33.5 17.5 L35.4 17.3 L36.7 16.3 L38.8 16.8 L40.7 16.4 L42.6 17.6" fill="none" stroke="#5d544a" stroke-width="1.6" stroke-linejoin="round" opacity="0.85"/>
    <path d="M41.8 31.9 Q43.9 34.2 41.1 37.4 Q42.0 40.7 38.5 42.8 Q38.2 46.5 34.4 47.2 Q33.1 50.8 29.4 50.1 Q27.0 53.0 23.7 51.1 Q20.4 53.1 17.8 50.3 Q13.7 51.0 12.3 47.9 Q8.1 47.3 8.2 44.1 Q4.8 42.2 6.7 39.4 Q4.9 36.4 8.5 34.3 Q8.6 30.6 13.4 29.6 Q15.6 25.7 20.6 25.9 Q24.3 22.5 28.4 24.1 Q32.8 21.8 35.3 24.6 Q39.4 23.8 39.9 27.3 Q43.2 28.2 41.8 31.9z" fill="url(#kf2)" stroke="#4a3a2c" stroke-width="1.5" stroke-linejoin="round"/>
    <ellipse cx="25" cy="38" rx="15" ry="10" transform="rotate(-20.1 25 38)" fill="url(#kb2)"/>
    <path d="M17.8 39.6 q6.4 5.5 13.6 -0.6" transform="rotate(-20.1 25 38)" fill="none" stroke="#c9c1ac" stroke-width="1.4" opacity="0.8"/>
    <ellipse cx="21.8" cy="34.1" rx="6.1" ry="2.4" transform="rotate(-20.1 25 38)" fill="#ffffff" opacity="0.8"/>
    <path d="M23.9 46.3 L21.2 47.1 L19.3 46.1 L16.7 45.9 L15.8 44.3 L13.8 43.3 L14.0 41.3 L12.9 39.7 L14.3 37.7 L14.4 35.7 L16.6 34.2 L17.8 32.2 L20.4 31.4" fill="none" stroke="#5d544a" stroke-width="1.6" stroke-linejoin="round" opacity="0.85"/>`,
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
    <defs>
      <linearGradient id="nb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7a3a86"/><stop offset="0.5" stop-color="#4a1d58"/><stop offset="1" stop-color="#22091f"/></linearGradient>
      <linearGradient id="ng" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fa042"/><stop offset="1" stop-color="#3f5e22"/></linearGradient>
    </defs>
    <ellipse cx="30" cy="57" rx="22" ry="3.5" fill="#000" opacity="0.1"/>
    <path d="M42 15 C35 15 29 19 24 26 C18 34 11 41 10 48 C9 55 15 59 22 57 C30 55 36 48 41 40 C45 33 49 27 49 22 C49 18 46 15 42 15z" fill="url(#nb)" stroke="#2a1426" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M27 29 C22 36 17 41 15 47" fill="none" stroke="#c9a6d4" stroke-width="3" stroke-linecap="round" opacity="0.7"/>
    <path d="M30 25.5 C29.3 26.3 28.6 27.1 28 28" fill="none" stroke="#f1e2f4" stroke-width="2" stroke-linecap="round" opacity="0.9"/>
    <path d="M38 16 L34 21 L40 19.5 L39.5 26 L43.5 20.5 L47.5 25.5 L47 19 L52 19.5 L48.5 14.5 C46 10.5 41 11.5 38 16z" fill="url(#ng)" stroke="#2c3d16" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M47 12.5 C49 9 52 7 56 6.5" fill="none" stroke="#2c3d16" stroke-width="5" stroke-linecap="round"/>
    <path d="M47 12.5 C49 9 52 7 56 6.5" fill="none" stroke="#6d8a3a" stroke-width="3" stroke-linecap="round"/>`,
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
