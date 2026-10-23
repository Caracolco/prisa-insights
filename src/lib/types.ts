// Tipos de los JSON generados por scripts/build-audience-context.mjs

export interface Metric { label: string; pen: number; aff: number | null; group?: string; category?: string; source?: string }
export interface SegmentIndexItem { id: string; name: string; size000: number; share: number; hasSocial: boolean; product: string | null }
export interface SegmentIndex { generatedAt: string; stats?: { variables: number; mentions: number; relevant: number }; segments: SegmentIndexItem[] }

export interface Daypart { day: string; slots: { slot: string; pen: number; aff: number }[] }

export interface Excerpt { text: string; sentiment: Sentiment; platform: string; month: string }
export type Sentiment = 'POSITIVO' | 'NEGATIVO' | 'NEUTRO' | 'MIXTO';

export interface SocialTopic { id: string; name: string; n: number; share: number; otrosShare: number | null; sentiment: Partial<Record<Sentiment, number>>; excerpts: Excerpt[] }
export interface SocialBlock { id: string; kind: 'tensión' | 'necesidad' | 'motivador'; title: string; body: string; n: number; share: number; evidence: Excerpt[] }
export interface SocialInsight { id: string; title: string; seeing: string; why: string; n: number; share: number; evidence: Excerpt[] }
export interface SocialOccasion { id: string; name: string; n: number; share: number; otrosShare: number | null; excerpts: Excerpt[] }
type Geo<T> = { co: T; otros: T; sinpais: T; total?: T };
export interface SocialEmergent {
  id: string; status: string; title: string; body: string; confidence: string; precision: number | null;
  detected: Geo<number> & { total: number }; estimated: Geo<number | null> & { total: number | null };
  share: Geo<number> & { total: number }; shareEstimated: number | null;
  purchase: Geo<number> | null; geoNote: string | null; evidence: Excerpt[];
}
export interface Social {
  product: string; market: string; baseOk: boolean;
  period: { from: string; to: string };
  headline: { title: string; body: string } | null;
  voices: Excerpt[];
  volume: { original: number; relevant: number; doubtful: number; discarded: number; duplicates: number; co: number; otros: number; sinpais: number; coRelevant: number };
  otherCountries: Record<string, number>;
  months: Record<string, number>;
  topics: SocialTopic[];
  tensions: SocialBlock[];
  occasions: SocialOccasion[];
  occasionsWeak: string[];
  unexpectedUses: { id: string; title: string; body: string; colombia: boolean; geo: Geo<{ n: number; share: number }> }[];
  insights: SocialInsight[];
  emergent: SocialEmergent[];
  outside: { id: string; title: string; body: string }[];
  brands: { title: string; body: string }[];
  sentiment: { status: string; counts: Partial<Record<Sentiment, number>>; examples?: Partial<Record<Sentiment, Excerpt[]>>; accuracy: number | null; stratified: { agreement: number; weighted: number; sample: number } | null };
  accuracy: { relevance?: number; sentiment?: number; topics?: number };
  signals: Record<string, { n: number; share: number }>;
  discardReasons: Record<string, number>;
}
export interface Cross { id: string; title: string; market: string; tgi: { label: string; pen: number; aff: number; says: string }; social: { n: number; share: number; observes: string }; reading: string }

export interface Segment {
  id: string; name: string; product: string | null;
  survey: string; definition: string; sourceFile: string;
  size000: number; universe000: number; share: number;
  profile: {
    gender: Metric[]; age: Metric[]; marital: Metric[]; nse: Metric[]; region: Metric[]; education: Metric[];
    employment: Record<string, Metric>;
    household: { head: Metric | null; buyer: Metric | null; caretaker: Metric | null };
    housing: Metric[]; plans: Metric[];
    narrative: { headline: string; sub: string; facts: { k: string; text: string }[]; soWhat: string[] };
  };
  activities: { leisure: Metric[]; sports: Metric[]; vacations: Metric[]; lodging: Metric[]; games: Metric[] };
  opinions: { all: Metric[]; distinctive: Metric[]; shared: Metric[] };
  radio: {
    reach: Metric | null; total30d: Metric | null; amfm: Metric | null; online: Metric | null;
    dayparts: Daypart[]; best: { day: string; slot: string; pen: number; aff: number } | null;
    stations: (Metric & { prisa: boolean })[]; programs: Metric[]; genres: Metric[]; places: Metric[]; devices: Metric[]; frequency: Metric[]; reasons: Metric[];
  };
  prisa: { brands: { id: string; name: string; pen: number; aff: number; s000: number }[]; total: Metric | null; bestAffinity?: { name: string; pen: number; aff: number }; bestReach?: { name: string; pen: number; aff: number } };
  digital: { social: Metric[]; apps: Metric[]; internetPeriods: Metric[]; internetFrequency: Metric[]; activities: Metric[] };
  video: { platforms: Metric[]; watchedYesterday: Metric[]; types: Metric[] };
  audio: { music: Metric[]; podcast: { listens: Metric | null; topics: Metric[] } };
  contentThemes: Metric[];
  social: Social | null;
  cross: Cross[];
  suggestions: string[];
}

export type SourceKind = 'TGI' | 'SOCIAL' | 'TGI + SOCIAL';
export interface EvidenceItem { source: 'TGI' | 'SOCIAL'; label: string; value: string }
export interface Answer {
  answer: string;
  evidence: EvidenceItem[];
  source: SourceKind | null;
  confidence: 'alta' | 'media' | 'baja' | null;
  suggestions: string[];
  grounded: boolean;
  mode: 'demo' | 'llm';
}
