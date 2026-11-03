// LLM을 쓸 수 없을 때의 규칙 기반 태깅·분류 (원문 제목은 그대로 노출)
import { CLUBS } from '../../config/clubs.mjs';

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const CLUB_PATTERNS = CLUBS.map((c) => ({
  slug: c.slug,
  re: new RegExp(`(^|[^\\p{L}])(${c.aliases.map(esc).join('|')})(?=$|[^\\p{L}])`, 'iu'),
}));

export function tagClubs(title) {
  return CLUB_PATTERNS.filter((p) => p.re.test(title)).map((p) => p.slug);
}

// 이적 단계: 관심 / 협상 / 합의 / 확정(Here we go) / 결렬
const STAGE_RULES = [
  ['collapsed', /\b(collapse[sd]?|off|pull(s|ed)? out|walk(s|ed)? away|rejected|snub|fichaje fallido|salta|geplatzt)\b/i],
  ['done', /\b(here we go|complete[sd]?|confirm(s|ed)?|sign(s|ed)|unveil(s|ed)?|officially|joins|oficial|ufficiale|offiziell)\b/i],
  ['agreement', /\b(agree[sd]?|agreement|deal (struck|reached|agreed)|personal terms|medical|acuerdo|accordo|einigung)\b/i],
  ['negotiation', /\b(talks|negotiat\w*|bid|offer|approach|enquir\w*|swoop|negocia\w*|trattativa|offerta|angebot)\b/i],
  ['interest', /\b(interest(ed)?|eye[sd]?|target(s|ed)?|consider(s|ing)?|monitor\w*|scout\w*|keen|want(s|ed)?|linked|interés|interesse)\b/i],
];
const TRANSFER_HINT = /\b(transfer|signing|sign|deal|fee|loan|bid|move|swoop|contract|release clause|fichaje|calciomercato|mercato|wechsel|transfert)\b/i;
const CATEGORY_RULES = [
  ['injury', /\b(injur\w*|hamstring|knee|ankle|out for|sidelined|surgery|lesión|infortunio|verletzung|blessure)\b/i],
  ['manager', /\b(sack(ed|ing)?|manager|head coach|boss|appoint\w*|interim|resign\w*|entrenador|allenatore|trainer)\b/i],
  ['match', /\b(\d+\s*-\s*\d+|vs?\.?|player ratings|report|draw|win|beat|defeat|thrash|stun|goal|crónica|pagelle)\b/i],
];

export function classify(title) {
  const isTransfer = TRANSFER_HINT.test(title);
  let stage = null;
  if (isTransfer) for (const [s, re] of STAGE_RULES) if (re.test(title)) { stage = s; break; }
  if (isTransfer) return { category: 'transfer', stage: stage ?? 'interest' };
  for (const [c, re] of CATEGORY_RULES) if (re.test(title)) return { category: c, stage: null };
  return { category: 'other', stage: null };
}

const STOP = new Set(
  `the a an and or of to in on at for from with by as is are was be been has have had will would could should can may
  after before over under into out up down off about than more most new news live latest report reports reveal reveals
  says said claims claim insists admits explains warns why how what who when where which this that these those his her
  their they them its it he she we you our your not no yes but just all one two three first last next season game games
  match club clubs player players fans star boss manager coach deal transfer move window january summer premier league
  champions cup win wins draw loses beat beats vs v ft goal goals week weekend day today tonight big set back time top
  update updates exclusive breaking official watch video gossip column rumours rumour ratings preview el la los las de del
  il lo gli le di da e der die das und mit im für von zu au du des et en un une`.split(/\s+/),
);

/** 규칙 기반 클러스터링용 시그니처: 고유명사 후보 토큰 */
export function signature(title) {
  const tokens = title
    .replace(/[’']s\b/g, '')
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
  const names = new Set();
  tokens.forEach((t, i) => {
    const lower = t.toLowerCase();
    if (lower.length < 3 || STOP.has(lower) || /^\d+$/.test(t)) return;
    if (/^\p{Lu}/u.test(t) && (i > 0 || tokens.length < 3)) names.add(lower);
  });
  return [...names];
}
