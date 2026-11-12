// 인명 한국어 표기 사전 — 국내 축구 언론에서 통용되는 표기 기준.
// ko: 정답 표기, en: 원문 표기(지시문에 함께 전달), wrong: 자주 나오는 오표기(저장 직전 자동 교정)
// wrong 항목은 문자열(→ ko 로 교정) 또는 [오표기, 정답] 짝 (성·이름을 함께 바꿀 때)
// 선수 사전(config/players.mjs)의 선수 표기도 함께 전달되므로, 여기에는 감독·구단 인사와 오표기가 잦은 선수만 둔다.
// 새 오표기가 보이면 /ops/names 페이지에서 확인하고 wrong 에 추가하면 된다.
// 주의: wrong 은 다른 단어와 겹치지 않는 표기만 넣는다 (예: "홀란드"는 네덜란드를 뜻할 수 있어 넣지 않음)
export const NAMES = [
  // 감독
  { ko: '데 제르비', en: ['De Zerbi', 'Roberto De Zerbi'], wrong: ['드 제르비', '드제르비', '데제르비'] },
  { ko: '캐릭', en: ['Carrick', 'Michael Carrick'], wrong: ['캐리크', '카링', '캐릭크'] },
  { ko: '마레스카', en: ['Maresca', 'Enzo Maresca'], wrong: ['마레쉬카', '마레스까'] },
  { ko: '아르테타', en: ['Arteta', 'Mikel Arteta'], wrong: ['아르테타스'] },
  { ko: '과르디올라', en: ['Guardiola', 'Pep Guardiola'], wrong: ['과르디올라스', '구아르디올라'] },
  { ko: '슬롯', en: ['Slot', 'Arne Slot'], wrong: [] },
  { ko: '콤파니', en: ['Kompany', 'Vincent Kompany'], wrong: [['빈센트 콤파니', '뱅상 콤파니']] },
  { ko: '사비 알론소', en: ['Xabi Alonso'], wrong: ['샤비 알론소', '차비 알론소', '자비 알론소'] },
  { ko: '플릭', en: ['Flick', 'Hansi Flick'], wrong: [['한스 플릭', '한지 플릭']] },
  { ko: '토마스 프랑크', en: ['Thomas Frank'], wrong: ['토마스 프랭크'] },
  { ko: '하우', en: ['Howe', 'Eddie Howe'], wrong: [] },
  { ko: '이라올라', en: ['Iraola', 'Andoni Iraola'], wrong: ['이라올랴'] },
  { ko: '안첼로티', en: ['Ancelotti', 'Carlo Ancelotti'], wrong: ['앙첼로티'] },
  { ko: '시메오네', en: ['Simeone', 'Diego Simeone'], wrong: ['시메온'] },
  { ko: '루이스 엔리케', en: ['Luis Enrique'], wrong: [] },
  { ko: '래트클리프', en: ['Ratcliffe', 'Jim Ratcliffe'], wrong: ['랫클리프', '래트클리페', '라트클리프'] },
  // 그 밖의 인물 (점검 페이지에서 표기가 흔들린 이름)
  { ko: '헤수스 데 미겔', en: ['Jesus de Miguel', 'Jesús de Miguel'], wrong: ['제수스 데 미겔', '헤수스 데 미구엘', '호세스 데 미겔', '지제스 데 미겔', '제수스 드 미겔'] },
  // 오표기가 잦은 선수 (정답 표기는 선수 사전과 같게)
  { ko: '살리바', en: ['Saliba', 'William Saliba'], wrong: [['윌리엄 사리바', '윌리엄 살리바'], '사리바'] },
  { ko: '무시알라', en: ['Musiala', 'Jamal Musiala'], wrong: ['뮈지알라', '무지알라'] },
  { ko: '매과이어', en: ['Maguire', 'Harry Maguire'], wrong: ['맥과이어', '맥과이아'] },
  { ko: '수비멘디', en: ['Zubimendi', 'Martín Zubimendi', 'Martin Zubimendi'], wrong: ['주빈디', '주비멘디', '수빈디'] },
  { ko: '주앙 페드루', en: ['Joao Pedro', 'João Pedro'], wrong: ['조앙 페드루', '조앙 페드로', '주앙 페드로', '조아오 페드로'] },
  { ko: '요케레스', en: ['Gyokeres', 'Gyökeres'], wrong: ['교케레스', '기외케레시', '교케레시'] },
  { ko: '외데고르', en: ['Odegaard', 'Ødegaard'], wrong: ['오데가르드', '외데가르드'] },
  { ko: '소보슬라이', en: ['Szoboszlai'], wrong: ['소보슬러이', '쏘보슬라이'] },
  { ko: '셰슈코', en: ['Sesko', 'Šeško'], wrong: ['세슈코', '셰스코'] }, // '세스코'는 국내 회사명과 겹쳐 제외
  { ko: '음뵈모', en: ['Mbeumo'], wrong: ['음베우모', '음뵈무'] },
  { ko: '크바라츠헬리아', en: ['Kvaratskhelia'], wrong: ['크바라츠켈리아', '크바라츠헬리야'] },
  { ko: '키미히', en: ['Kimmich', 'Joshua Kimmich'], wrong: [['조슈아 키미히', '요주아 키미히'], '키미치'] },
  { ko: '이스테방', en: ['Estevao', 'Estêvão'], wrong: ['에스테방', '에스테바오'] },
  { ko: '하위선', en: ['Huijsen', 'Dean Huijsen'], wrong: ['휘선', '하위센', '후이센'] },
  { ko: '비르츠', en: ['Wirtz', 'Florian Wirtz'], wrong: ['워츠', '비르트즈'] },
  { ko: '은구모하', en: ['Ngumoha', 'Rio Ngumoha'], wrong: ['응구모하', '은구모아'] },
];

// 오표기 → 정답 (긴 표기부터 바꿔야 부분 치환이 꼬이지 않음)
const FIXES = NAMES.flatMap((n) => n.wrong.map((w) => (Array.isArray(w) ? w : [w, n.ko]))).sort((a, b) => b[0].length - a[0].length);

/** 한국어 문장 안의 오표기를 사전 표기로 교정 */
export function fixNames(text) {
  if (!text) return text;
  let out = text;
  for (const [w, ko] of FIXES) if (out.includes(w)) out = out.split(w).join(ko);
  return out;
}

/** 지시문에 넣을 표기 목록 (원문=한국어) */
export const NAME_HINTS = NAMES.map((n) => `${n.en[n.en.length - 1]}=${n.ko}`).join(', ');

/** 원문 이름 비교용 정규화 */
export const nameKey = (en) =>
  en
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
