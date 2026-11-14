# MARS: LAST HABITAT — Mission Design & Science/Data Research Pack

**Roles covered:** Member 2 (Mission Designer & Story Researcher) + Member 3 (Resource Systems, Science & NASA Data Researcher)
**Prepared:** 14 November 2026 | **Build window:** 20–22 hours | **Audience:** kids 7–12
**Award targets:** Best Use of Science · Best Mission Concept · Best Use of Storytelling · Best Use of Technology · Best Use of Data

> **How to read this file**
> Every number carries a tag:
> - **[REAL]** — a value taken directly from a NASA/NASA-authored source (source ID in brackets, e.g. `S5`).
> - **[DERIVED]** — we calculated it from a [REAL] value (formula shown). Not a NASA statement.
> - **[SIM]** — a game-balancing value we invented. Must be labelled "simulation value" in the game UI. Never present as real.
> - ⚠️ **VERIFY** — seen in a secondary source or not yet read in the original; open the original before shipping.
>
> Source IDs (S1…S21) are listed in the **Source Register** at the end.

---

## 0. Executive Summary (read this first)

**Concept in one line:** You are Mission Commander of a four-person Mars outpost with **no resupply and no rescue**. Five critical days, five real engineering problems, and every decision costs something real.

**Three big research findings that shape the design**

1. **DONKI is more Mars-relevant than the brief assumed.** NASA's DONKI contains *WSA-Enlil* model records that list **"Mars with estimated shock arrival time"** for coronal mass ejections (CMEs), tagged *Glancing Blow* or *Minor Impact*. Example record from July 2026: a CME analysed on 2026-07-09 with a modelled glancing blow at Mars on 2026-07-13 (S14). This is a **model forecast of CME arrival at Mars**, not a radiation dose measurement. We use it as the *trigger* for Mission 5, and say so honestly.
2. **The dust-storm power curve can come from real data.** Opportunity's solar output on consecutive sols fell **468 → 345 → 133 Wh** as dust opacity (tau) rose from ~1.0 → 2.1 → >3.0 (S9). That gives a real, kid-explainable curve: *thicker dust = much less power*. NASA's own analysis also found settled dust lags the storm by about **21 sols** (S10) — so "clean the panels" is the *wrong move during a storm* and the *right move after*. That is a genuine teachable decision.
3. **NASA's CHAPEA analog is our realism backbone.** Four crew, a 1,700 sq ft 3D-printed habitat, 378 days, resource limits, crop growing, deliberately inserted equipment failures and a simulated communication delay up to 22 minutes (S17). Our crew size, roles and "inserted failures" design mirror it. The second CHAPEA crew finished on 31 October 2026 — very current for judges.

**Design principle for learning:** *Judge the decision process, not just the outcome.* A good decision can still meet bad luck; kids learn to separate **risk** from **recklessness** (see §6 and §11). **One character does two jobs:** the child's own rover, *Rover*, is both the story friend and the AI Instructor (§9). It asks questions and never hands over the answer.

---

## 1. Award Map — what judges will look for and where we show it

| Award | What a judge needs to see | Our feature (proof) | Screen / artifact |
|---|---|---|---|
| **Best Use of Science** | Real physics/engineering constraints, not decoration | Real oxygen/water/food mass flows, real dust→power curve, real MOXIE rate, real radiation numbers, thresholds tied to NASA standards | Science Card after every choice; About page "Science Ledger" |
| **Best Mission Concept** | Original idea, clear goal, replayable | "No resupply, no rescue" 4-person outpost; 5 critical sols; ripple consequences between missions; seeded randomness | Mission Brief; Replay Seed on Debrief |
| **Best Use of Storytelling** | Emotional stakes, characters, consequence | Four named astronauts with personal outcomes; Commander's Log; Mission Control voice with comms delay; **Rover companion named by the child (§9)** | Crew Panel; Diary; After-Action Review |
| **Best Use of Technology** | Technically solid, smooth, thoughtful | Data-driven mission engine (JSON), DONKI API with offline fallback, deterministic seeded sim, unit-tested rules, **scripted + grounded Rover instructor (§9)** | Live/Archived badge; sim tests; README |
| **Best Use of Data** | Real data changes gameplay, traceable | DONKI (flare class + modelled CME arrival at Mars), Curiosity RAD numbers, Opportunity power data, MEDA weather samples, MOXIE data, SWIM ice map | Data Credits screen with field/unit/limitation per source |

---

## 2. Setting & Story

**Where:** A northern mid-latitude plain on Mars (roughly 35–45°N). *Fictional exact site*, chosen for the reason NASA's ice-mapping team (SWIM) gives: ice is stable and shallow enough to dig in mid-latitudes, but not so far poleward that it is too cold and dark (S12, S13).
**Trade-off the player feels:** more ice access vs. colder temperatures and less sunlight for solar power.

**Why no resupply:** Earth–Mars launch windows come roughly every 26 months, and Earth–Mars solar conjunction (Sun blocking signals) recurs on that cycle (S16, S15). In our story the next window is far away. *You have what you have.*

**Mission Control delay:** one-way signal time is **4–24 minutes** depending on planet positions (S15); conjunction can cause communication blackouts of up to ~2 weeks (S16). CHAPEA simulated a delay of up to 22 minutes (S17).
- Gameplay: some events let you "Ask Mission Control." The answer arrives after a delay that is shown as a countdown. While you wait, the problem continues.

**Crew (fictional; roles mirror CHAPEA's Commander / Medical Officer / Science Officer / Flight Engineer, S17):**
The player is the **Mission Commander** (decision-maker, shown as a voice and a seat at Mission Control console). Four astronauts live at the outpost:

| Crew | Role | Used in |
|---|---|---|
| Dr. Amara Nwosu | Medical Officer | Health checks, radiation symptoms, stress |
| Kenji Sato | Flight Engineer | Repairs, valve isolation, rover |
| Lucía Ferreira | Science Officer / geologist | Ice prospecting, science score |
| Rafi Chowdhury | Life-Support & ISRU Engineer | Oxygen generator, water recycler, greenhouse |

> **Assumption to confirm with team:** consumption is calculated for **4 people** (the Commander is the player's seat, not a fifth body). If you prefer 5 people, multiply all per-person values by 5/4.

Each astronaut has **Health (0–100)** and **Stress (0–100)**, both [SIM]. Personal outcomes appear in the diary ("Kenji's hands were shaking after the EVA…").

---

## 3. Time Structure — "Critical Sols"

To stay realistic *and* fit 20–22 hours, the game shows **five Critical Sols** chosen from a longer mission. Between them a short **Routine Operations** time-lapse applies normal consumption (this is cheap to code and teaches that consumption never stops).

| Game stage | Mission Sol shown | Gap before it (routine sols) [SIM] |
|---|---|---|
| Critical Sol 1 — Oxygen leak | Sol 21 | start |
| Critical Sol 2 — Dust storm | Sol 34 | 13 |
| Critical Sol 3 — Water shortage | Sol 52 | 18 |
| Critical Sol 4 — Greenhouse failure | Sol 67 | 15 |
| Critical Sol 5 — Radiation alert + ice | Sol 88 | 21 |

**1 Sol ≈ 24 h 39 min [REAL, S1/S2 area — Mars solar day]**. UI line: *"A Mars day is called a sol."*
Fallback if short on time: label them Sol 1–5 and skip time-lapses (per the original brief).

---

## 4. Resources & Rules (Oxygen, Water, Food, Power + Radiation hazard)

### 4.1 Real anchors used to build the rules

| Quantity | Value | Tag | Source |
|---|---|---|---|
| Oxygen consumed | 0.84 kg per crew member per day | [REAL] | S5, S6 (cite BVAD S7) |
| CO₂ produced | 1.00 kg per crew member per day | [REAL] | S5, S6 |
| Food solids | 0.62 kg per crew member per day | [REAL] | S5 |
| Drinking + food-prep water | ≈2.37 kg per crew member per day | [REAL] | S5 |
| Crew of 4: oxygen | 0.84 × 4 = **3.36 kg/day** | [DERIVED] | from S5 |
| Crew of 4: food solids | 0.62 × 4 = **2.48 kg/day** | [DERIVED] | from S5 |
| Crew of 4: drinking + food-prep water | 2.37 × 4 = **≈9.5 kg/day** | [DERIVED] | from S5 |
| MOXIE peak oxygen output | **12 g/hour** at ≥98% purity (goal was 6 g/h) | [REAL] | S8 |
| MOXIE total produced | **122 g** over 16 runs; final run 7 Aug 2023 | [REAL] | S8 |
| One MOXIE-size unit per day | 12 g × 24 h = 288 g/day ≈ **one-third of one astronaut's daily oxygen** (288 ÷ 840) | [DERIVED] | from S5, S8 |
| Full-scale ISRU goal (rocket-propellant scale) | 2,000–3,000 g/hour | [REAL] ⚠️ | S8 coverage — confirm on NASA page |
| Solar irradiance at Mars | **586.2 W/m²** = **43.1%** of Earth's 1361.0 | [REAL] | S1 |
| Surface pressure | ~**6.36 mb** (seasonal range 4.0–8.7 mb) — under 1% of Earth's | [REAL] | S1b (archived NSSDC) |
| Average temperature | ~**210 K (−63 °C)**; Viking 1 site daily range 184–242 K (−89 to −31 °C) | [REAL] | S1b |
| Surface gravity | **≈3.7 m/s²** (current NSSDC page lists 3.73; older copies and ESA list 3.71) | [REAL] ⚠️ | S1 — cite the one you read; use 3.73 in code |
| Atmosphere | ~96% CO₂ → cannot be breathed | [REAL] | S8 coverage of NASA; S2 |
| Surface radiation (galactic cosmic rays) | **0.67 mSv/day** average, Aug 2012–Jun 2013, Gale Crater | [REAL] | S3 |
| Radiation inside spacecraft in transit | **1.8 mSv/day** | [REAL] | S3 |
| Round-trip transit dose (current propulsion) | ~**660 mSv**; 500-day surface stay + transit ≈ **1,000 mSv (1 Sv)** | [REAL] | S3 |
| Cancer-risk link | 1 Sv ≈ 5% increase in fatal-cancer risk | [REAL] | S3 |
| NASA career dose limit | **600 mSv**, same for all astronauts | [REAL] | S18, S19 |
| Solar-particle-event limit | **250 mSv per event** | [REAL] ⚠️ | secondary source; confirm in NASA-STD-3001 |
| Dust → solar power (Opportunity) | Sol 5105: **468 Wh** (tau ≈1.0) → Sol 5106: **345 Wh** (tau 2.1) → Sol 5107: **133 Wh** (tau est. >3.0) | [REAL] | S9 |
| Power fraction vs tau (game curve) | tau 1.0 = 100%; tau 2.1 ≈ **74%** (345÷468); tau >3 ≈ **28%** (133÷468) | [DERIVED] | from S9. *Shape only — rover panels are tiny vs. a habitat array.* |
| Dust settling lag after severe event | ~**21 sols** | [REAL] | S10 |
| Panel "cleaning events" by wind | Observed since 2004 on Spirit/Opportunity | [REAL] | S11 |
| Comms delay | **4–24 min** one way; conjunction blackout up to ~2 weeks | [REAL] | S15, S16 |
| Ice depth (mid-latitudes) | Shallowly buried ice, **0 to >5 m** deep | [REAL] | S13 |

### 4.2 Starting values and rules (all [SIM] unless an anchor is shown)

**Initial levels at Critical Sol 1:** Oxygen **60 kg**, Water **220 kg**, Food **90 kg**, Battery **240 kWh** (capacity 300), Crew Health 100, Stress 20, Event Dose 0 mSv.
*Display to kids as "days left" (e.g., "Oxygen: 17 days") plus the kg number in the details panel.*

#### RESOURCE: OXYGEN
| Field | Rule |
|---|---|
| Unit | kg (UI shows "days of air") |
| Normal use per Sol | **3.36 kg** (4 crew × 0.84) [REAL-anchored, S5] |
| Extra consumption | Crew EVA/exercise +0.2 kg per EVA-person [SIM]; leak loss (event-specific) |
| Supply | Oxygen generator (ISRU): **+3.0 kg/sol at 25 kWh/sol** [SIM; MOXIE anchor S8]. Routine net ≈ **−0.4 kg/sol** |
| Low warning | **< 30 kg** (≈9 sols) |
| Critical | **< 12 kg** (≈3.5 sols) |
| Low consequences | Rover warning; Stress +3/sol |
| Critical consequences | Health −10/sol per crew; at 0 → mission failed |
| Restoration actions | Repair generator (Flight Eng., slots+power); isolate leak; reduce activity (−10% use) [SIM]; emergency candle/backup cartridges (one-time +8 kg) [SIM] |
| Science source | S5/S6/S7 (consumption), S8 (making O₂ from CO₂) |
| Limits | BVAD values are human-spaceflight planning assumptions, **not** measured Mars-colony rates. Say so in-game. |

#### RESOURCE: WATER
| Field | Rule |
|---|---|
| Unit | kg (UI shows "days of water") |
| Normal use per Sol | Drinking + food prep **≈9.5 kg** [REAL-anchored, S5] + hygiene **4 kg** [SIM] = 13.5 kg gross |
| Recycling | Recycler recovers **85%** [SIM] → routine net **≈ −2.0 kg/sol** |
| Supply | Repair recycler; mine ice (**+80 kg over 3 sols**, 25 kWh/sol processing) [SIM]; emergency reserve **60 kg** one-time [SIM] |
| Low warning | **< 100 kg** |
| Critical | **< 40 kg** |
| Low consequences | Hygiene limits; Stress +4/sol; greenhouse watering reduced |
| Critical consequences | Health −8/sol per crew (dehydration); at 0 → mission failed |
| Science source | S12/S13 (ice), S5 (needs) |
| Limits | Recycling % is a simulation value; real systems vary. Ice on Mars is not liquid at the surface (too cold, too thin air). |

#### RESOURCE: FOOD
| Field | Rule |
|---|---|
| Unit | kg of food (UI shows "days of food") |
| Normal use per Sol | **2.48 kg** (4 × 0.62) [REAL-anchored, S5] |
| Supply | Greenhouse: steady **+0.8 kg/sol** and a **+15 kg harvest** every ~20 sols [SIM, compressed]; emergency food **20 kg** [SIM] |
| Low warning | **< 40 kg** |
| Critical | **< 15 kg** |
| Low consequences | Morale/Stress +4/sol |
| Critical consequences | Health −6/sol per crew; at 0 → failed |
| Science source | S5; S17 (CHAPEA crews grew vegetables to *supplement* stored food — they did not replace it) |
| Limits | Real crop cycles take weeks to months; game compresses them. Label "simulation timing". |

#### RESOURCE: POWER
| Field | Rule |
|---|---|
| Unit | kWh (battery, capacity 300) |
| Demand per Sol [SIM] | Life support 40 + water recycler 15 + greenhouse 30 + comms 10 + science/rover 20 + oxygen generator 25 = **140 kWh/sol** |
| Generation | Clear sky **160 kWh/sol** × dust factor × panel cleanliness. Dust factor curve from S9: tau 1.0 → 1.00; tau 2.1 → 0.74; tau >3 → 0.28 |
| Why it is smaller than Earth | Mars gets **43%** of Earth's sunlight [REAL, S1] |
| Low warning | **< 80 kWh** |
| Critical | **< 30 kWh** |
| Critical consequences | Load-shed forced (science → greenhouse → comms) then life support offline; at 0 for a full sol → failure |
| Restoration | Clean panels (+25% output) *after* a storm; shed load; backup generator (+40 kWh/sol, burns 2 kg food-equivalent stock) [SIM] |
| Limits | Habitat loads are simulation values. Curve shape from rover data. |

#### HAZARD: RADIATION (the 4th pressure, shown as Crew Dose)
| Field | Rule |
|---|---|
| Unit | mSv (millisieverts) |
| Background dose | Surface GCR **0.67 mSv/day** unshielded [REAL, S3]. Inside habitat we apply a **shielding factor 0.5** [SIM] → **0.34 mSv/sol/person** |
| Shown meters | (1) **Event Dose** vs **250 mSv** event limit ⚠️; (2) **Career Dose** vs **600 mSv** [REAL, S18] |
| Event doses (Mission 5) [SIM] | Storm shelter (extra water-wall shielding): **≈15**; Habitat quarters: **≈60**; Improvised extra shielding: **≈30**; Outside on EVA: **≈180** |
| Warning | Event Dose > 100 mSv |
| Critical | Event Dose > 250 mSv, or acute symptoms roll (Health −30) |
| Science source | S3 (numbers), S18/S19 (limits) |
| Limits | Curiosity values are **historical (2012–13)**. Never call them live. The event doses above are simulation values chosen to teach *relative* protection. |

> **Why the radiation numbers feel small:** at 0.67 mSv/day, even 88 sols adds only ~59 mSv unshielded. The real danger is (a) long cumulative exposure over hundreds of days plus transit, and (b) sudden solar particle events. The game teaches both: the Career bar creeps up; the Event bar spikes.

### 4.3 Ripple system (how choices echo — this is what makes "responsibility" real)

| Earlier choice | Ripple later |
|---|---|
| M1: valve **not** isolated | Oxygen starts M2 lower; Stress +5 |
| M2: load-shed greenhouse | Greenhouse growth −30% → less food at M4 |
| M2: **rover sent during storm** | 25% chance rover damaged → ice mission (M5) harder |
| M2: panels **cleaned after storm** (follow-up) | Power +25% for rest of campaign |
| M3: **emergency water used** | Reserve = 0; any later water problem is critical |
| M3: ice prospecting succeeded | M5 ice drilling success 70% (else 40%) |
| M4: stored food used | Emergency food spent; one fewer buffer in M5 |
| Any crew EVA in M5 during storm | Career Dose clock recorded in final report |
| M2: rover damaged (25% roll) | Rover limps and its voice crackles in M3–M5; it still gives hints. The After-Action Review mentions it (§9.2) |

---

## 5. The Five Missions (full design)

> **Common to all missions:** 4 choices (A–D). Every option shows its **costs and risk % on the card before choosing**. No free option: even "do nothing" carries risk. After the choice → result → **Science Card** (≤ 2 sentences, plain language) → ripple recorded in the **Commander's Log**.
> Each mission also has a **Look → Compare → Choose → Review** step (see §6). Percentages are [SIM] and seeded for replay.

### MISSION 1 — "Whisper in Tank 2" (Mission Sol 21) — OXYGEN LEAK
- **Story:** Kenji notices the oxygen pressure in storage Tank 2 dropping slowly. The leak rate on the sensor shows a **range** (2–6 kg/sol), not an exact number.
- **Scientific reason:** Mars air is ~96% CO₂ and under 1% of Earth's pressure — you cannot "borrow" breathable air outside (S1b, S2). All breathable oxygen is stored or produced and must be sealed in. Oxygen is also being *made* by ISRU, but slowly (MOXIE: 12 g/h peak, S8).
- **Initial levels:** O₂ 60 kg · Water 220 · Food 90 · Battery 240 · Health 100 · Stress 20.
- **Player question:** *"What do you protect first — the oxygen, the people, or the schedule?"*

| | Action | Resource cost | Time cost | Immediate result | Later consequence | Science explanation |
|---|---|---|---|---|---|---|
| **A** | Isolate the damaged valve | 5 kWh; Tank 2 contents (~18 kg) locked off until repaired | 2 crew slots | 80%: leak stops. 20%: partial fix, leak halves | Tank 2 oxygen unusable until repaired (M2); Kenji's Stress +5 | "Isolation valves split a system into sections so one failure doesn't empty everything." |
| **B** | Move crew to the backup compartment | ~6 kg O₂ lost while leak continues; science task cancelled | 1 slot | Crew safe from pressure drop; Stress +10 | Tank empties; needs A later | "First protect people, then equipment — but moving alone doesn't stop the loss." |
| **C** | Pause non-essential activities | Science score −; saves 12 kWh; saves ~0.3 kg O₂ | 0 slots (lose the day's science) | Leak continues at ~4 kg/sol; buys time to think | Must do A within 2 sols or leak grows | "Resting astronauts breathe less, so every bit of calm buys time." |
| **D** | Ignore the warning | 0 now | 0 | 45%: leak worsens (−15 kg over 2 sols). 20%: crew headache/hypoxia (Health −15) | Oxygen emergency in M2/M3 likely | "What matters is oxygen *pressure* in the air, not just the total in tanks." |

- **Best available decision:** **A**, because fixing the source beats managing the symptom; **C** is the correct *supporting* action while the repair is under way.
- **Success:** O₂ ≥ 40 kg at end and all crew Health ≥ 70. **Failure:** O₂ < 15 kg or any Health < 30.
- **Data used:** S5/S6 (consumption), S8 (oxygen from CO₂), S1b (thin air).
- **Mission Control ask:** reply arrives in ~8 min (shown timer); advice = "isolate first."

### MISSION 2 — "Red Sky" (Mission Sol 34) — DUST STORM & POWER SHORTAGE
- **Story:** Rafi reports the sky turning butterscotch. A dust storm is thickening; tau climbs 1.0 → 2.1 → 3+ over the next two sols. The solar array output drops with it.
- **Scientific reason:** Dust suspended in the air blocks sunlight. Opportunity's output fell from 468 to 345 to 133 Wh across consecutive sols in June 2018 (S9). Mars already gets only 43% of Earth's sunlight (S1). Dust also settles on panels, with a lag of about 21 sols after a severe event (S10).
- **Initial levels:** carried over; typical O₂ 52 · Water 195 · Food 72 · Battery 220.
- **Player question:** *"Which systems stay powered when the Sun fades?"*

| | Action | Resource cost | Time cost | Immediate result | Later consequence | Science explanation |
|---|---|---|---|---|---|---|
| **A** | Switch to battery reserve | Drains deficit each sol (≈22 kWh at 74%, ≈95 kWh at 28%) | 0 | Everything stays on | Battery may hit critical by storm peak | "Batteries store sunlight for bad days — but they run out." |
| **B** | Shut down non-essential equipment | Science −; greenhouse growth −30%; saves ~45 kWh/sol | 1 slot | Battery lasts through the storm | Less food at M4; slower science | "Engineers 'shed load': keep life support, drop the rest." |
| **C** | Send rover to clean/inspect panels | 20 kWh; 25% rover stuck/damaged; only +5% output while storm continues | 3 slots | Little gain during storm | **Follow-up option after storm: +25% output** | "While dust is *in the air*, cleaning panels barely helps. Timing matters." |
| **D** | Continue using all systems normally | 0 now | 0 | Battery hits 0 by sol 3 → blackout | Life support off; Stress +20; O₂ scrubbing stops | "Power not used wisely today is missing tomorrow." |

- **Best available decision:** **B** at storm onset (protect life support, ISRU oxygen, water recycler), use **A** as a bridge, and **plan C for after the storm** (kids discover the follow-up).
- **Success:** Battery ≥ 40 kWh at storm end and life support never offline. **Failure:** Battery 0 for a full sol.
- **Data used:** S9 (468/345/133 Wh and tau), S10 (21-sol lag), S1 (43% sunlight), S11 (wind cleaning).
- **Optional live weather panel:** show an archived MEDA sample sol (pressure, air temperature, wind) labelled **ARCHIVED** (S20).

### MISSION 3 — "Water You Can't Drink Yet" (Mission Sol 52) — WATER SHORTAGE
- **Story:** The water recycler's output collapses from 85% to 40%. At current use the tanks last about 9 sols. Lucía has a rover scan hinting at buried ice 4 km away.
- **Scientific reason:** Water is needed for drinking (≈2.4 kg/person/day in baseline planning, S5), food and plants. Mars's surface is too cold and thin-aired for stable liquid water; ice is **buried** in mid-latitudes (0 to >5 m deep, S13) and NASA mapped promising areas (S12). Ice must be melted and purified before drinking.
- **Initial levels:** typical Water 110 · O₂ 44 · Food 58 · Battery 205.
- **Player question:** *"Fix what you have, save what you have, or go find more?"*

| | Action | Resource cost | Time cost | Immediate result | Later consequence | Science explanation |
|---|---|---|---|---|---|---|
| **A** | Repair water recycling | 15 kWh; 1 of 3 spare-part kits | 3 slots | 75%: recovery returns to 85% next sol. 25%: needs another slot | Fewer spare parts for M4 | "Recycling water is cheaper than finding new water." |
| **B** | Reduce non-essential water use | Saves 4 kg/sol; Stress +8; greenhouse watering −15% | 0 | Reserve lasts ~3 extra sols | Stress accumulates; food growth slower | "Every water cut touches food and morale too." |
| **C** | Plan an ice-prospecting rover mission | 30 kWh; 3 slots | 3 slots | No water yet. 60%: ice found within reach | If found: unlocks drilling (+80 kg over 3 sols for 25 kWh/sol); M5 ice success 70% | "NASA's ice map shows where to dig — the Goldilocks zone is cold enough for ice, warm enough for people." |
| **D** | Use the emergency reserve | −60 kg reserve spent | 0 | Shortage solved today | Reserve = 0 for the rest of the mission; next water fault is critical | "Reserves are for emergencies — spend them and you have no safety net." |

- **Best available decision:** **A** (restore the system) with **B** as a short bridge; **C** if power allows; **D** only when crew health is already at risk.
- **Success:** Water ≥ 90 kg and recycler restored (or ice site confirmed). **Failure:** Water < 25 kg or dehydration events.
- **Data used:** S5 (water needs), S12/S13 (ice mapping and depth).

### MISSION 4 — "Cold Greenhouse" (Mission Sol 67) — GREENHOUSE FAILURE / FOOD SHORTAGE
- **Story:** Temperature control in the greenhouse fails. Outside, Mars is far colder than Antarctica; the plants have hours before frost damage.
- **Scientific reason:** Plants need light, water, warmth, CO₂ and nutrients. Mars's average temperature is about −63 °C, and a daily swing of roughly −89 to −31 °C was measured at one lander site (S1b), so the greenhouse must be pressurised and heated. CHAPEA crews grew vegetables to *supplement* stored food, not replace it (S17).
- **Initial levels:** typical Food 48 · Battery 190 · Water 140.
- **Player question:** *"Fix the cause, feed the crew now, or protect the plants at any cost?"*

| | Action | Resource cost | Time cost | Immediate result | Later consequence | Science explanation |
|---|---|---|---|---|---|---|
| **A** | Repair temperature control | 10 kWh; 1 spare-part kit | 3 slots | 75%: crops saved; growth recovers in 2 sols | If kits are gone (M3: A used twice) → fails | "Fixing the cause protects every future harvest." |
| **B** | Supply backup power to heaters | 35 kWh/sol | 0 | Crops survive ~2 sols | Needs A within 2 sols; drains battery (unaffordable after a bad M2) | "Heaters buy time but don't fix the broken part." |
| **C** | Use stored emergency food | −12 kg of 20 kg stock | 0 | Food shortage solved now | Crops die by sol 2; replant takes ~4 sols (compressed) | "Stored food is the real safety net; plants are a bonus." |
| **D** | Shut down the greenhouse | Saves 30 kWh/sol; Stress +10 | 1 slot | Power saved today | Long-term food gap; harvest lost | "Cutting food production saves power now but costs future meals." |

- **Best available decision:** **A**; use **C** as a short bridge if food < 20 days.
- **Success:** Food ≥ 35 kg and greenhouse "recovering." **Failure:** Food < 12 kg or malnutrition events.
- **Data used:** S5 (food), S17 (CHAPEA gardening), S1b (cold).

### MISSION 5 — "Storm Over the Ice" (Mission Sol 88) — RADIATION ALERT & FINAL ROVER MISSION
- **Story:** The rover has found a possible ice deposit 4.2 km away. Then NASA's space-weather model flags a CME that may reach Mars. The countdown is shown in hours.
- **Data hook (real):** DONKI WSA-Enlil records list modelled CME shock arrival times at Mars with a *Glancing Blow* or *Minor Impact* tag (S14). The game pulls the latest Mars-related record (live) or shows an archived one and labels it **ARCHIVED**.
- **Scientific reason:** Mars has no global magnetic field and a thin atmosphere, so there is little natural shielding; surface dose averages 0.67 mSv/day (S3). Solar particle events add short, sharp doses; shelters with extra water-equivalent shielding cut exposure (S18-related guidance ⚠️). Water walls are a real concept for storm shelters.
- **Initial levels:** typical Power 160 · O₂ 40 · Food 52 · Water 120. Event Dose 0.
- **Player question:** *"Is the ice worth the risk — and who pays if you're wrong?"*

| | Action | Resource cost | Time cost | Immediate result | Later consequence | Science explanation |
|---|---|---|---|---|---|---|
| **A** | Move crew into the shielded shelter | +15 kWh; science paused; Stress +5 | 2 slots | Event Dose ≈ **15 mSv** each | Rover delayed 1–2 sols; ice objective at risk | "Shelter with thick shielding is the best defence against a solar storm." |
| **B** | Suspend outdoor activity (no EVAs); rover continues remotely | 5 kWh | 1 slot | Crew in normal quarters: ≈ **60 mSv**; 20% rover glitch | Ice sampling stays on schedule | "Staying inside helps, but ordinary walls aren't storm shelters." |
| **C** | Delay rover mission and build extra shielding (water tanks around sleeping area) | 5 kWh; 2 slots | 2 slots | ≈ **30 mSv**; ice delayed 2 sols | Less time left to finish ice objective | "Crews can rearrange water supplies as extra shielding." |
| **D** | Continue despite the warning | 0 resources; EVA crew exposed | 2 slots | EVA crew ≈ **180 mSv**; 30% acute symptoms (Health −30) | Ice sample early; Career Dose permanently higher | "Some risks leave marks on a career — NASA caps career dose at 600 mSv." |

- **Best available decision (depends on data):**
  - If DONKI shows **M/X-class flare or a CME with modelled Mars arrival** → **A**.
  - If minor activity only (A/B/C-class) → **C** (cheap protection, keeps momentum).
  - **D** is never best.
- **Success:** All 4 crew alive, Event Dose < 250 mSv each, ice objective ≥ 50%. **Failure:** any crew Event Dose ≥ 250 mSv or two crew Health < 30.
- **Ice drilling check after the storm:** success 70% if M3 prospecting succeeded, else 40%.
- **Data used:** S14 (DONKI incl. Mars-arrival), S3 (surface radiation), S18/S19 (limits), S12/S13 (ice).

---

## 6. Teaching Decision Quality & Responsibility (design rules)

1. **Look → Compare → Choose → Review** (the player's loop):
   - **Look:** open the data panel (levels, sensor ranges, forecast).
   - **Compare:** each option card shows costs, risk %, and which crew it affects.
   - **Choose:** confirm; **Review:** after the result, a short "what you knew / what you chose / what it cost."
2. **Process score vs. luck:** show two scores — **Decision Quality** (did you check data, protect crew first, keep reserves, fix causes?) and **Outcome**. Good process + bad luck is praised; bad process + good luck is gently flagged.
3. **Crew faces:** every choice shows which astronaut is affected. Outcomes use names ("Lucía has a headache" not "Health −10").
4. **Ripple Ledger:** show the Commander's Log with consequences from earlier decisions (see §4.3).
5. **Imperfect information:** sensors show ranges; Mission Control replies late (4–24 min, S15). Kids learn to decide with uncertainty.
6. **No shaming:** failure screen says *what went wrong, one specific tip, Try Again*. Replays use a seed so kids can try a different strategy on the same scenario.
7. **Trade-off teaching lines (use in Science Cards):** "You didn't lose oxygen — you chose to spend crew time instead." Frame every cost as *a choice*, not a punishment.
8. **Even advice has a price:** Rover asks questions for free, but a deeper hint costs 1 crew slot. Nothing is free, not even a hint (§9.4).

---

## 7. Scoring (suggested weights)

| Category | Weight | Measured by |
|---|---|---|
| Crew safety | 35 | Alive count, min Health, Event Dose vs limits |
| Resource efficiency | 20 | Final O₂/Water/Food/Power vs thresholds; reserves kept |
| Mission objectives | 15 | One objective per mission (5): air secured, power kept, water secured, food restored, ice+safety |
| Decision quality | 20 | Process points (data checked, cause fixed, crew first, timing right) |
| Exploration | 10 | Ice site found/drilled |

**Final result:** Successful ≥ 75 and ≥4 objectives and all crew alive · Needs Improvement 45–74 · Failed < 45 or crew lost / critical resource zero.
Badge text must read **"in-game achievement — not an official NASA certificate."**

> **Hints and score:** asking Rover for hints is never penalised in the score. The Level 2 hint already costs a crew slot, and a kid who asks for help is practising a good habit.

---

## 8. NASA Data & API Plan (use these records in the Data Credits screen)

| ID | Dataset / API | URL | Provider | Fields to use | Units / range | Game use | Static or live | Limitations |
|---|---|---|---|---|---|---|---|---|
| D1 | NSSDC Mars Fact Sheet | https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html | NASA GSFC | gravity, irradiance, pressure, temperature | m/s², W/m², mb, K | HUD "Mars facts", physics, power baseline | Static | Pressure/temperature quoted for Viking 1 site and averages |
| D2 | **DONKI** FLR / CME / SEP + WSA-Enlil impact list | https://api.nasa.gov/ (endpoints under `DONKI/`) | NASA CCMC / M2M SWAO | `classType`, `beginTime`, `peakTime`, `sourceLocation`; CME analysis → modelled **Mars arrival time & Glancing/Minor** ⚠️ field names — make one API call and log the response shape | class A/B/C/M/X; UTC time | Mission 5 trigger and severity; "Space Weather Now" badge | Live API (demo key ≈30 req/hr; free key ≈1,000/hr per S14 coverage ⚠️) | Earth-observed flares are a **proxy**; Mars arrival is a **model forecast**, not a dose. DONKI states it is experimental research information |
| D3 | Curiosity RAD results | https://www.swri.org/press-release/swri-scientists-publish-first-radiation-measurements-surface-mars ; DOI 10.1126/science.1244797 ; PDS dataset https://pds-ppi.igpp.ucla.edu/data/MSL-M-RAD-3-RDR-V1.0/ | SwRI / NASA MSL | Dose-equivalent rates | mSv/day (0.67 surface, 1.8 transit) | Radiation scale, Career bar | **Static / historical (2012–13)** | Single location (Gale), solar-cycle dependent |
| D4 | Opportunity dust-storm power | https://www.solardaily.com/reports/Regional_dust_storm_is_affecting_Opportunity_Mars_rover_999.html (JPL release reprint) ; https://ntrs.nasa.gov/api/citations/20190028687/downloads/20190028687.pdf | NASA JPL / NTRS | Wh per sol, tau, dust lag | Wh; tau (unitless) | Dust→power curve; 21-sol lag | Static | Rover ≠ habitat array; curve shape only |
| D5 | Perseverance **MEDA** weather | https://atmos.nmsu.edu/data_and_services/atmospheres_data/PERSEVERANCE/meda.html | NASA PDS Atmospheres | pressure, air temp, surface temp, humidity, wind, radiation & dust sensor | per-sol CSV (1 Hz in raw/calibrated) | Archived weather widget for 2–3 sample sols | Static archive | Jezero Crater, not our fictional site; **we must pre-extract values and label ARCHIVED** |
| D6 | **MOXIE** results + data | NASA MOXIE page https://mars.nasa.gov/mars2020/spacecraft/instruments/moxie/ ; PDS https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/PERSEVERANCE/moxie.html | NASA / MIT | O₂ production rate (derived, g/hr) | g/hour | Oxygen Generator design, scale comparison | Static | Experiment-scale device |
| D7 | SWIM ice map | https://photojournal.jpl.nasa.gov/catalog/PIA26045 ; https://pubs.usgs.gov/publication/70257663 | NASA JPL / PSI / USGS | Ice consistency map, depth 0 to >5 m | latitude, depth | Base site and prospecting choice | Static | Orbital inference; not ground-truthed |
| D8 | Life-support baselines (BVAD & NTRS papers) | https://ntrs.nasa.gov/citations/20210024855 ; https://ntrs.nasa.gov/api/citations/20100036823/downloads/20100036823.pdf | NASA JSC/ARC | O₂, CO₂, food, water per person per day | kg/CM/day | Consumption rules | Static | Planning assumptions, not measured colony data |
| D9 | NASA Images API | https://images-api.nasa.gov/search?q=Mars | NASA | image + credit metadata | — | Mission Brief backgrounds, gallery | Static assets via live search | Check each asset's credit/usage |
| D10 | Communications delay | https://www.nasa.gov/solar-system/space-communications-7-things-you-need-to-know/ | NASA Space Comms | one-way delay | minutes (4–24) | Mission Control countdown | Static | Delay changes with orbit position |

**Live vs archived rule:** show **LIVE** only when the API call succeeded this session. Otherwise show **ARCHIVED · date**. Never label D3–D9 as live.
**Honesty line for About screen:** *"DONKI is NASA's space-weather database for Earth and the inner solar system. It also models when some solar storms may reach Mars. We use these records to trigger the radiation event — they are not radiation measurements from our fictional Mars base."*

---

## 9. AI Mission Instructor — Rover, your crew-mate

> **Decision:** keep it. Storytelling and the AI Instructor live in **one character**. This is the cheapest feature in the game and one of the most effective.

### 9.1 Who Rover is
The outpost already has a rover (Missions 2, 3 and 5). We do **not** add a separate guide. The same rover is the child's friend *and* the instructor. This creates real emotional weight: the friend who is helping you can be sent into the storm in Mission 2 (25% risk of getting stuck, see §5). The responsibility for that choice is felt.

| Trait | Design |
|---|---|
| **Name** | The child names the rover at the start (nobody cares about a name they did not choose). Default: **"Rusty"**. Max 12 characters, simple profanity filter, kept only for the session. Lines use `{roverName}`. |
| **Personality** | Curious, brave, a little funny, **never scary**. |
| **Language** | Short sentences, simple words. A hard word gets a one-line explanation (e.g. "Tau is how dusty the sky is."). |
| **Mood follows resources** | **Green eyes + happy beep:** all resources above their Low warning (§4.2). **Eyes blink + slow speech:** Power below Low warning (< 80 kWh), because Rover shares the habitat's power. **Red light + fast beeps:** any resource at Critical, or a major event. |
| **Mood is never only colour** | Pair each light with a text or icon state too, so colour-blind kids can read it. |

### 9.2 What Rover does
| Job | Detail |
|---|---|
| **Tutorial guide** | 3–4 short instructions on the first Critical Sol (Mission 1). See 9.3. |
| **Process coach** | Reminds the **Look → Compare → Choose → Review** loop (§6), e.g. *"Have you checked the battery yet?"* |
| **Voice of the Science Card** | Reads the Science Card after each result (≤ 2 sentences), e.g. *"Did you know? Mars gets only 43% of Earth's sunlight."* (REAL, S1). |
| **After-Action Review** | At the end of each mission: what you knew, what you chose, what it cost (template in 9.6). |
| **Hint system** | Two levels, see 9.4. |
| **Damage ripple** | If Rover was damaged in M2, it limps and its voice crackles in M3–M5 for story. It **still gives hints**: the learning tool is never taken away as punishment. |

### 9.3 Tutorial lines (first Critical Sol)
1. **Look:** "Hi, I'm {roverName}! First, look at the bars. How many days of air do we have?"
2. **Compare:** "Each card shows what it costs and how risky it is. Compare them."
3. **Choose:** "Pick one. Careful: no choice is free."
4. **Review:** "Let's see what happened, and why."

### 9.4 The most important rule: Rover never gives the answer
| Level | Cost | What Rover does | Example |
|---|---|---|---|
| **Level 1** | Free | Asks a question. | "Did you check how much oxygen we have?" |
| **Level 2** | **1 crew slot** | Says which side of the problem to think about. | "Think about what happens when dust piles up on the panels." |
| **Direct answer** | **Never** | — | — |

This keeps the core rule of the game (nothing is free, not even advice) and teaches kids to think for themselves.

**Hard rules for hints**
- A hint must never name the "best available decision" from §5, reveal a dice roll or risk outcome, or say "pick option X". The "best decision" text is only for the After-Action Review, **after** the choice.
- Hint questions use only information already visible on screen or in the Science Card.
- **Mission Control is different from Rover:** its reply is delayed (4–24 min countdown, §2) and is a recommendation from Earth, not the instructor. Write Mission Control replies as advice that still needs the Commander's judgement, so the "no direct answer" principle is not undone.

**Hint bank (one pair per mission; add a second variant per level if time allows)**
| Mission | Level 1 (free question) | Level 2 (1 slot: where to think) |
|---|---|---|
| M1 Oxygen leak | "Where is the oxygen going? Can you stop it, or only slow it down?" | "Think about what a valve does to a pipe system. Is it fixing the cause or helping the symptom?" |
| M2 Dust storm | "How much power are the panels making now, compared with the battery?" | "Think about what happens when dust is in the sky versus when it has settled on the panels. When would cleaning help?" |
| M3 Water shortage | "If nothing changes, how many days of water do the tanks hold?" | "Think about the cost of making used water usable again versus finding new water. What does a safety reserve do once it is spent?" |
| M4 Greenhouse | "How many days of stored food do we have, and how long can the plants wait?" | "A heater and a repair both help the plants. Which one still helps tomorrow? Are plants the main plan or a bonus?" |
| M5 Radiation alert | "What does the space-weather panel say today?" | "Mars has thin air and no magnetic field. What could you put around the sleeping area to block more radiation?" |

### 9.5 Avoiding annoyance
- **Max 2–3 lines per event.**
- **No repeats:** keep 3 or more variants per trigger; store the last-used line id and never play the same line twice in a run.
- **"Hush" button:** the child can mute Rover's chatter. While hushed, Rover stays silent except for a **red icon** on critical alerts (no speech), and the Hint button still works.
- Rover speaks **only on triggers**: (1) start of a Sol, (2) an event arrives, (3) a resource **crosses** its warning level (once per crossing, not every Sol), (4) end of a mission.

### 9.6 Grounding rules (keep Rover honest)
- Lines are **pre-written**, using the *Science explanation* column in §5. No generated numbers or citations.
- Any number in a Rover line must exist in `constants.ts` / the resource tables and keep its tag: say "simulation value" for [SIM], never present it as real.
- After-Action Review template: **"That choice was [safe / risky / ineffective] because [science]. It changed [resource] by [value] because [reason]. Next time, you could [better action]."** Add the "what you knew / what you chose / what it cost" summary above it.
- If an LLM is added, feed it only: the written rules, the resource table, and the outcome record; instruct it to say "I'm not sure" when outside that scope. It must still obey the hint rules in 9.4.
- Disclose any AI use and data credits on About.

---

## 10. Data Structures for the Code Agent

```jsonc
// missions.json (one object per mission)
{
  "id": "m2-dust-storm",
  "missionSol": 34,
  "title": "Red Sky",
  "story": "...",
  "scienceReason": "...",
  "sourceIds": ["S9","S10","S1"],
  "startLevelsDefault": { "oxygen": 52, "water": 195, "food": 72, "battery": 220 },
  "question": "Which systems stay powered when the Sun fades?",
  "options": [
    {
      "id": "A",
      "label": "Switch to battery reserve",
      "cost": { "battery": "deficit", "crewSlots": 0 },
      "risk": { "p": 0.0, "effect": null },
      "immediate": "Everything stays on.",
      "ripple": [{ "flag": "batteryLow", "when": "m4" }],
      "science": "Batteries store sunlight for bad days - but they run out."
    }
  ],
  "best": { "default": "B", "reason": "..." },
  "success": { "battery_gte": 40, "lifeSupportOffline": false },
  "failure": { "battery_eq": 0 }
}
```

**`constants.ts` must hold (all tagged REAL/DERIVED/SIM in comments):** O₂ 0.84 kg/CM/day · food 0.62 · water 2.37 · crew = 4 · recycler 0.85 · ISRU +3.0 kg/sol @25 kWh · demand 140 kWh · generation 160 kWh · dust curve (1.0→1.00, 2.1→0.74, 3.0→0.28) · thresholds from §4.2 · radiation 0.67 mSv/day · shielding factor 0.5 · limits 250 / 600 mSv.
**Rover data (`rover.json`):**
```jsonc
{
  "defaultName": "Rusty",
  "maxNameLength": 12,
  "moods": { "ok": "green", "lowPower": "blink-slow", "critical": "red-fast" },
  "triggers": ["solStart", "eventArrival", "resourceWarning", "missionEnd"],
  "lines": { "solStart": ["...", "...", "..."] },        // 3+ variants per trigger, no repeats per run
  "hints": { "m1": { "l1": "...", "l2": "...", "l2Cost": { "crewSlots": 1 } } },
  "rules": { "neverRevealBest": true, "maxLinesPerEvent": 3 }
}
```
**Engine rules:** pure functions for sol step; seeded RNG (`seed` shown on Debrief); unit tests for every threshold; a balance script that runs random and greedy strategies to confirm *no option is free* and *no strategy always wins*.
**UI essentials:** Resource bars with "days left"; Crew Panel (4 faces, Health/Stress); Option cards (cost icons + risk %); Science Card; Commander's Log; Live/Archived badge; Mission Control countdown; Data Credits; **Rover panel** (mood lights + text state, Hint L1/L2 buttons, Hush button); **name-your-rover** screen.

---

## 11. Mission Success/Failure Summary (campaign level)

- **Win:** all 4 crew alive; essential resources above critical; ≥4 of 5 objectives; colony stable at end of Critical Sol 5.
- **Loss:** a critical life-support failure unresolved; any essential resource at zero; crew safety below minimum (Health < 30 for two crew or any crew lost).
- *Reminder shown in-game: these are game rules, not official NASA mission requirements.*

---

## 12. Final Quality Checklist (copy from team brief)

- [ ] Five missions designed (done in §5)
- [ ] Every mission has 3–4 meaningful choices with cost and consequence
- [ ] Oxygen, water, food, power rules documented (§4)
- [ ] Science claims have source links (Source Register)
- [ ] At least two NASA data sources checked (DONKI, Curiosity RAD, MEDA, Opportunity, MOXIE, SWIM)
- [ ] Fields, units, limitations recorded (§8)
- [ ] Fictional values labelled **simulation values** in the UI
- [ ] Success/failure conditions clear
- [ ] AI explanations grounded in verified science
- [ ] Image/data credits + AI use disclosed on About
- [ ] Rover: child names it; mood lights have text/icon backup; Hush button works
- [ ] Rover hints: L1 free, L2 costs 1 slot, no hint reveals the best option or a dice roll
- [ ] Every Rover line is pre-written; every number in it is tagged REAL/DERIVED/SIM

### ⚠️ Open verification items (do these before submission)
1. **Gravity**: read the current NSSDC page and record 3.73 vs 3.71 with the exact line.
2. **DONKI**: make one API call to the CME analysis endpoint; confirm the exact JSON field names for the Mars impact estimate and the demo/free API key limits. Save a sample as `donki-fallback.json`.
3. **250 mSv per solar particle event**: confirm in NASA-STD-3001 Vol. 1 (current secondary source only).
4. **Full-scale ISRU rate (2,000–3,000 g/h)**: confirm on NASA's MOXIE page.
5. **BVAD values**: confirm 0.84 / 1.00 / 0.62 / water in the BVAD tables themselves (we read them reproduced in NASA technical papers S5/S6).
6. **MEDA**: download one derived sol file; write down its column names, units, sol number/date.
7. **Images**: record NASA credit line and usage terms for every image used.

---

## 13. Source Register

| ID | Source | URL |
|---|---|---|
| S1 | NASA NSSDC Mars Fact Sheet | https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html |
| S1b | NSSDC Mars Fact Sheet (archived copy: pressure, temperature ranges) | https://webarchive.library.unt.edu/eot2008/20090117205846/http://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html |
| S2 | NASA Mars Facts / Science | https://science.nasa.gov/mars/facts/ · https://science.nasa.gov/mars/ |
| S3 | SwRI/NASA: first Mars surface radiation measurements (Hassler et al., *Science*, 2013) | https://www.swri.org/press-release/swri-scientists-publish-first-radiation-measurements-surface-mars |
| S4 | PDS PPI MSL RAD dataset | https://pds-ppi.igpp.ucla.edu/data/MSL-M-RAD-3-RDR-V1.0/ |
| S5 | NASA NTRS 20100036823 (life-support mass flows) | https://ntrs.nasa.gov/api/citations/20100036823/downloads/20100036823.pdf |
| S6 | NASA NTRS 20190027610 (life-support consumables) | https://ntrs.nasa.gov/api/citations/20190027610/downloads/20190027610.pdf |
| S7 | NASA Life Support Baseline Values and Assumptions Document (BVAD) | https://ntrs.nasa.gov/citations/20210024855 |
| S8 | NASA MOXIE (mission page + Sept 2023 results coverage) | https://mars.nasa.gov/mars2020/spacecraft/instruments/moxie/ · https://phys.org/news/2023-09-nasa-oxygen-generating-moxie-mars-mission.html |
| S9 | NASA JPL: Opportunity regional dust storm (Sols 5105–5107, June 2018) | https://www.solardaily.com/reports/Regional_dust_storm_is_affecting_Opportunity_Mars_rover_999.html |
| S10 | NASA NTRS: Dust abrasion on Martian solar arrays (21-sol lag) | https://ntrs.nasa.gov/api/citations/20190028687/downloads/20190028687.pdf |
| S11 | NASA JPL: Update on Opportunity recovery (cleaning events) | https://www.jpl.nasa.gov/news/update-on-opportunity-rover-recovery-efforts |
| S12 | NASA JPL Photojournal PIA26045: SWIM ice map | https://photojournal.jpl.nasa.gov/catalog/PIA26045 |
| S13 | USGS: Ice resource mapping on Mars (SWIM) | https://pubs.usgs.gov/publication/70257663 |
| S14 | NASA Open APIs and DONKI (example WSA-Enlil record with Mars arrival, July 2026) | https://api.nasa.gov/ · https://kauai.ccmc.gsfc.nasa.gov/DONKI/view/WSA-ENLIL/47478/1 |
| S15 | NASA: Space communications — 7 things (latency 4–24 min) | https://www.nasa.gov/solar-system/space-communications-7-things-you-need-to-know/ |
| S16 | NASA NTRS: comms delay and blackouts for Mars (up to ~2 weeks) | https://ntrs.nasa.gov/api/citations/20190032318/downloads/20190032318.pdf |
| S17 | NASA CHAPEA announcement (four crew, 1,700 sq ft, 378 days, gardening, delay) | https://www.marsdaily.com/reports/NASA_Announces_CHAPEA_Crew_for_Year_Long_Mars_Mission_Simulation_999.html (confirm on nasa.gov) |
| S18 | NASA NTRS: radiation standard (600 mSv career limit; Mars GCR) | https://ntrs.nasa.gov/api/citations/20250006168/downloads/ASCEND%20Simonsen%20draft%201.pdf |
| S19 | National Academies report on NASA radiation limits | https://www.nationalacademies.org/news/nasa-should-update-astronaut-radiation-exposure-limits-improve-communication-of-cancer-risks |
| S20 | PDS Atmospheres: Perseverance MEDA | https://atmos.nmsu.edu/data_and_services/atmospheres_data/PERSEVERANCE/meda.html |
| S21 | PDS Atmospheres: Perseverance MOXIE | https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/PERSEVERANCE/moxie.html |
| S22 | NASA Images API / Library | https://images-api.nasa.gov/search?q=Mars · https://images.nasa.gov/ |

*Credit line for About page:* "Science data and imagery from NASA, NASA/JPL-Caltech, SwRI, PDS and USGS where noted. This is an independent educational project; NASA does not endorse it."
