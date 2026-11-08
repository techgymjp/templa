// 画質設定：スマホや小さい画面、?q=low では軽い描画にする
const q = new URLSearchParams(location.search).get('q');
const small = Math.min(window.innerWidth, window.innerHeight) < 700;
const touch = matchMedia('(pointer: coarse)').matches;
export const LOW = q === 'low' || (q !== 'high' && (small || touch));
