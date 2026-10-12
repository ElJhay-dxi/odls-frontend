import type { DesalSectionKey } from './desalinationConfig';

/** Reads a form field as a number (null when blank / not numeric). */
export type Getter = (key: string) => number | null;

export interface CalcCtx {
  /** Product water: plant flow counter of the previous reading of the day (for the delta). */
  prevCounter?: number | null;
}

type Fn = (g: Getter, ctx: CalcCtx) => number | null;

const diff = (a: number | null, b: number | null) => (a == null || b == null ? null : a - b);
const sum = (...v: (number | null)[]) => {
  const x = v.filter((n): n is number => n != null);
  return x.length ? x.reduce((a, b) => a + b, 0) : null;
};
const avg = (...v: (number | null)[]) => {
  const x = v.filter((n): n is number => n != null);
  return x.length ? x.reduce((a, b) => a + b, 0) / x.length : null;
};
const pct = (num: number | null, den: number | null) => (num == null || den == null || den === 0 ? null : (num / den) * 100);
const rejection = (perm: number | null, feed: number | null) => (perm == null || feed == null || feed === 0 ? null : (1 - perm / feed) * 100);

// ── SWRO building blocks (shared by several calcs) ──────────────────────────
const swroFeedFlow: Fn = (g) => {
  const hp = g('roFeedFlowHp');
  return hp == null ? null : hp + (g('roFeedFlowLpPx') ?? 0);
};
const swroBrineHp: Fn = (g) => {
  const boost = g('roBoosterFlow'); const lpb = g('brineFlowLp');
  return boost == null || lpb == null ? null : boost + lpb - (g('roFeedFlowLpPx') ?? 0);
};
const swroPermeate: Fn = (g, c) => diff(swroFeedFlow(g, c), g('brineFlowLp'));
const swroLevelM: Fn = (g) => { const l = g('filtrateTankLevelPct'); return l == null ? null : l * 4.5; };
const swroFeedPostPx: Fn = (g) => { const raw = g('feedCondRaw'); return raw == null ? null : raw * (1 + (g('assumedSalinityIncrease') ?? 0) / 100); };

export const CALCS: Record<string, Fn> = {
  // UF
  'uf.strainerDp': (g) => diff(g('strainerFeedPressure'), g('strainerOutletPressure')),
  'uf.feedTurbidity': (g) => avg(g('clarifier1OutletTurbidity'), g('clarifier2OutletTurbidity')),
  'uf.uf1Dp': (g) => diff(g('uf1FeedPressure'), g('uf1FiltratePressure')),
  'uf.uf2Dp': (g) => diff(g('uf2FeedPressure'), g('uf2FiltratePressure')),
  'uf.uf3Dp': (g) => diff(g('uf3FeedPressure'), g('uf3FiltratePressure')),
  'uf.uf4Dp': (g) => diff(g('uf4FeedPressure'), g('uf4FiltratePressure')),
  'uf.feedFlow': (g) => sum(g('uf1FeedFlow'), g('uf2FeedFlow'), g('uf3FeedFlow'), g('uf4FeedFlow')),
  'uf.differentialPressure': (g) => {
    const f = g('feedPressure'); const o = g('outletPressure');
    return f == null && o == null ? null : (f ?? 0) - (o ?? 0);
  },

  // Clarifier
  'clarifier.influentFlow': (g) => sum(g('c1FeedFlow'), g('c2FeedFlow')),

  // BWRO
  'bwro.cfDp': (g) => diff(g('cfFeedPressure'), g('cfOutletPressure')),
  'bwro.stage1Dp': (g) => diff(g('feedPressure'), g('interpassPressure')),
  'bwro.stage2Dp': (g) => diff(g('interpassPressure'), g('brinePressure')),
  'bwro.permeateFlow': (g) => diff(g('feedFlow'), g('rejectFlow')),
  'bwro.recoveryRate': (g) => pct(diff(g('feedFlow'), g('rejectFlow')), g('feedFlow')),
  'bwro.rejectionOnline': (g) => rejection(g('conductivity'), g('feedConductivity')),
  'bwro.rejectionHand': (g) => rejection(g('conductivity'), g('feedConductivityHand')),

  // SWRO
  'swro.cfDp': (g) => diff(g('cfFeedPressure'), g('cfOutletPressure')),
  'swro.roDp': (g) => diff(g('feedPressure'), g('roBrinePressurePxFeed')),
  'swro.boosterPumpDp': (g) => diff(g('feedPressure'), g('pxOutletPressureHp')),
  'swro.pxDp': (g) => diff(g('roBrinePressurePxFeed'), g('pxOutletPressureHp')),
  'swro.feedFlow': swroFeedFlow,
  'swro.brineFlowHp': swroBrineHp,
  'swro.brineLeakage': (g, c) => diff(swroBrineHp(g, c), g('brineFlowLp')),
  'swro.roPermeateFlow': swroPermeate,
  'swro.recoveryRate': (g, c) => {
    const q = swroFeedFlow(g, c);
    const perm = swroPermeate(g, c);
    if (q != null && perm != null) return pct(perm, q);
    // fall back to the original feed / reject entry
    return pct(diff(g('feedFlow'), g('rejectFlow')), g('feedFlow'));
  },
  'swro.condIncreasePx': (g) => {
    const post = g('feedCondPostPxHand'); const raw = g('feedCondRawHand');
    return post == null || raw == null || raw === 0 ? null : (post / raw - 1) * 100;
  },
  'swro.feedCondPostPx': swroFeedPostPx,
  'swro.saltRejection': (g) => { const raw = g('feedCondRaw'); return rejection(g('conductivity'), raw == null ? null : raw * 1000); },
  'swro.saltRejectionPostPx': (g, c) => { const post = swroFeedPostPx(g, c); return rejection(g('conductivity'), post == null ? null : post * 1000); },
  'swro.filtrateTankLevelM': swroLevelM,
  'swro.lpPumpDp': (g, c) => {
    const d = g('lpPumpDischargePressure'); const m = swroLevelM(g, c);
    return d == null || m == null ? null : d - m * 10;
  },
  'swro.lpPumpDischargeBar': (g) => { const d = g('lpPumpDischargePressure'); return d == null ? null : d / 100; },
  'swro.dpPumpToCfFeed': (g) => {
    const d = g('lpPumpDischargePressure');
    return d == null || g('cfFeedPressure') == null ? null : d / 100 - (g('cfFeedPressure') as number);
  },

  // Product water
  'productWater.plantFlowDelta': (g, c) => diff(g('plantFlowCounter'), c.prevCounter ?? null),
};

export function computeField(section: DesalSectionKey, field: string, g: Getter, ctx: CalcCtx = {}): number | null {
  const fn = CALCS[`${section}.${field}`];
  if (!fn) return null;
  const v = fn(g, ctx);
  return v == null || !Number.isFinite(v) ? null : v;
}
