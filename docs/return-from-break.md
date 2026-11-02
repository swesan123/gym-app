# Return From Break (#99)

**Status:** Implemented  
**Created:** 2026-11-01  
**Related issue:** [swesan123/gym-app#99](https://github.com/swesan123/gym-app/issues/99)

## Summary

New workouts seed each exercise from its last logged weight. After a break that weight is usually too heavy. The app now adjusts load, set count, and target RIR **per exercise**, based on the days since that exercise was last performed in a completed workout.

Logic lives in `lib/returnFromBreak.ts`; the stored shape is defined in `lib/loadAdjustment.ts`.

---

## Rules

| Days off | Load | Sets | Target RIR | Then |
|----------|------|------|------------|------|
| 0–13 | normal progression | normal | 2 | — |
| 14–27 | hold (no overload) | normal | 2 | normal next session |
| 28–55 | −10% | −1 | ~3 | ramp −5 pts/session |
| 56–111 | −15% | −1 | ~3 | ramp |
| 112+ | −20% (cap) | −1 | 3–4 | ramp |

### Ramp

- Each later session reduces the cut by 5 percentage points until the pre-break (reference) weight is reached.
- If every working set at the lighter load was logged at RIR ≥ 4, jump straight back to the reference weight.
- A new break during the ramp keeps the larger cut.

### Rounding

Always toward the easier side: machine weight-grid floor when the exercise has one, otherwise the exercise increment, otherwise 2.5.

### Exercise types

| Type | Behavior |
|------|----------|
| Weighted | Cut applied to the logged weight |
| Assisted | Cut applied to *effective* load (body weight − assistance) by **adding** assistance. Without a body weight: +1 step, or +2 steps above a 10% cut |
| Bodyweight + extra | Reduce the extra weight |
| Timed / stretch | Unchanged |

---

## Chat

- `getReturnPlan` previews the per-exercise plan without starting a workout.
- `startWorkout` accepts an optional `loadAdjustmentPercent` (0–30) that overrides the automatic tier. It is shown on the approval card.

---

## Data

`workouts.load_adjustments` (jsonb) maps exercise id → adjustment (`phase`, `gapDays`, `cutPct`, `holdProgression`, `dropOneSet`, `targetRir`, `referenceWeights`, `overridden`). Full type: `lib/loadAdjustment.ts`. Storing `referenceWeights` is what lets the ramp return to the pre-break weight.

---

## Evidence

Citations were checked against PubMed/Crossref records (author, year, journal, DOI) and, where numbers are quoted, against the abstract. Numbers that could not be confirmed from the abstract are not quoted.

**Little or no strength loss for ~2–3 weeks**
- Hwang et al. (2017): in resistance-trained men, leg-press strength did not decrease after 2 weeks of detraining.
- Ogasawara et al. (2013): repeated 3-week breaks with 6-week retraining blocks produced overall gains similar to continuous training.
- McMaster et al. (2013): in elite rugby and American football players, strength was maintained for up to 3 weeks of detraining, with decay increasing afterward; mean loss was 14.5% over a mean 7.2 weeks.
- Mujika & Padilla (2000, Part I): in the first 4 weeks, strength declines are limited.

**Measurable loss from ~3–4 weeks; rep strength falls faster**
- Bosquet et al. (2013) meta-analysis: cessation lowers all muscular outputs with a dose-response by duration; submaximal strength (SMD −0.62) fell more than maximal force (−0.46). The effect was larger in people over 65.
- Mujika & Padilla (2000, Part II): force declines slowly beyond 4 weeks and stays above control values for long periods.
- Halonen et al. (2024): in untrained adults, a 10-week break reduced leg-press and curl 1RM, and the loss was regained rapidly during retraining.

**Fast regain ("muscle memory")**
- Staron et al. (1991): trained women kept much of their strength through 30–32 weeks of detraining and responded rapidly to retraining.
- Seaborne et al. (2018): epigenetic memory of earlier hypertrophy in human muscle.
- Counterpoint — Psilander et al. (2019): the previously trained leg did not respond better to retraining; strength stayed elevated through detraining, attributed to motor learning.

**Return guidance and soreness**
- Caterisano et al. (2019, CSCCa/NSCA): consensus guidelines that cap volume, intensity, and work:rest in the first 2–4 weeks after inactivity. They target college athletes and exertional injury risk.
- Nosaka et al. (2001): repeated-bout protection against damage lasts at least 6 months but is lost by 9–12 months, so a long break brings back first-session soreness.
- Helms et al. (2016, 2018): RIR/RPE-based load setting is a valid autoregulation approach.
- ACSM (2009) position stand: progression models for healthy adults.

### What is data and what is a practical choice

| Rule element | Basis |
|--------------|-------|
| 14 / 28-day thresholds | Data-derived: little loss to ~3 weeks, measurable loss after |
| 10% / 15% cuts | Data-derived: below the 14.5% mean loss over ~7 weeks (McMaster) and leaning high, because rep performance drops faster than max force (Bosquet) |
| 20% cap, RIR targets, 5-pt ramp, RIR ≥ 4 jump, −1 set | Conservative practical choices, not taken from a specific study |

---

## Limitations

- Evidence comes from mixed populations: untrained or recently trained adults, athletes, and older adults. None match a typical gym-app user exactly.
- Most outcomes are 1RM or max-strength measures; the app adjusts working-set loads, and the evidence for rep performance is thinner.
- Heterogeneity between studies is high, and individual response varies.
- Illness and injury breaks are not modeled. Those users should follow medical or physio advice.
- Users 65+ may lose more and need a more cautious return than the rules provide.
- Cuts are a starting point. Target RIR and the ramp let the user correct in-session.

---

## References

1. Hwang PS, Andre TL, McKinley-Barnard SK, et al. Resistance training-induced elevations in muscular strength in trained men are maintained after 2 weeks of detraining and not differentially affected by whey protein supplementation. *J Strength Cond Res.* 2017;31(4):869–881. [doi:10.1519/JSC.0000000000001807](https://doi.org/10.1519/JSC.0000000000001807)
2. Ogasawara R, Yasuda T, Ishii N, Abe T. Comparison of muscle hypertrophy following 6-month of continuous and periodic strength training. *Eur J Appl Physiol.* 2013;113(4):975–985. [doi:10.1007/s00421-012-2511-9](https://doi.org/10.1007/s00421-012-2511-9)
3. McMaster DT, Gill N, Cronin J, McGuigan M. The development, retention and decay rates of strength and power in elite rugby union, rugby league and American football: a systematic review. *Sports Med.* 2013;43(5):367–384. [doi:10.1007/s40279-013-0031-3](https://doi.org/10.1007/s40279-013-0031-3)
4. Mujika I, Padilla S. Detraining: loss of training-induced physiological and performance adaptations. Part I: short term insufficient training stimulus. *Sports Med.* 2000;30(2):79–87. [doi:10.2165/00007256-200030020-00002](https://doi.org/10.2165/00007256-200030020-00002)
5. Mujika I, Padilla S. Detraining: loss of training-induced physiological and performance adaptations. Part II: long term insufficient training stimulus. *Sports Med.* 2000;30(3):145–154. [doi:10.2165/00007256-200030030-00001](https://doi.org/10.2165/00007256-200030030-00001)
6. Bosquet L, Berryman N, Dupuy O, et al. Effect of training cessation on muscular performance: a meta-analysis. *Scand J Med Sci Sports.* 2013;23(3):e140–e149. [doi:10.1111/sms.12047](https://doi.org/10.1111/sms.12047)
7. Halonen EJ, Gabriel I, Kelahaara MM, Ahtiainen JP, Hulmi JJ. Does taking a break matter — adaptations in muscle strength and size between continuous and periodic resistance training. *Scand J Med Sci Sports.* 2024;34(10):e14739. [doi:10.1111/sms.14739](https://doi.org/10.1111/sms.14739)
8. Staron RS, Leonardi MJ, Karapondo DL, et al. Strength and skeletal muscle adaptations in heavy-resistance-trained women after detraining and retraining. *J Appl Physiol.* 1991;70(2):631–640. [doi:10.1152/jappl.1991.70.2.631](https://doi.org/10.1152/jappl.1991.70.2.631)
9. Seaborne RA, Strauss J, Cocks M, et al. Human skeletal muscle possesses an epigenetic memory of hypertrophy. *Sci Rep.* 2018;8:1898. [doi:10.1038/s41598-018-20287-3](https://doi.org/10.1038/s41598-018-20287-3)
10. Psilander N, Eftestøl E, Cumming KT, et al. Effects of training, detraining, and retraining on strength, hypertrophy, and myonuclear number in human skeletal muscle. *J Appl Physiol.* 2019;126(6):1636–1645. [doi:10.1152/japplphysiol.00917.2018](https://doi.org/10.1152/japplphysiol.00917.2018)
11. Caterisano A, Decker D, Snyder B, et al. CSCCa and NSCA joint consensus guidelines for transition periods: safe return to training following inactivity. *Strength Cond J.* 2019;41(3):1–23. [doi:10.1519/SSC.0000000000000477](https://doi.org/10.1519/SSC.0000000000000477)
12. Nosaka K, Sakamoto K, Newton M, Sacco P. How long does the protective effect on eccentric exercise-induced muscle damage last? *Med Sci Sports Exerc.* 2001;33(9):1490–1495. [doi:10.1097/00005768-200109000-00011](https://doi.org/10.1097/00005768-200109000-00011)
13. Helms ER, Cronin J, Storey A, Zourdos MC. Application of the repetitions in reserve-based rating of perceived exertion scale for resistance training. *Strength Cond J.* 2016;38(4):42–49. [doi:10.1519/SSC.0000000000000218](https://doi.org/10.1519/SSC.0000000000000218)
14. Helms ER, Byrnes RK, Cooke DM, et al. RPE vs. percentage 1RM loading in periodized programs matched for sets and repetitions. *Front Physiol.* 2018;9:247. [doi:10.3389/fphys.2018.00247](https://doi.org/10.3389/fphys.2018.00247)
15. American College of Sports Medicine. Position stand: progression models in resistance training for healthy adults. *Med Sci Sports Exerc.* 2009;41(3):687–708. [PubMed 19204579](https://pubmed.ncbi.nlm.nih.gov/19204579/)
