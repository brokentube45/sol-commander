# MARS: LAST HABITAT — Junior Explorer: Mission Plan & Learning System

Ages 7–9 | Simple English | 3D Mars Adventure

> **Purpose of this document.** This is the implementation guide for Junior Explorer mode (ages 7–9). It gives mission timing, story, player actions, Rusty's dialogue, quiz questions, two simple answers, the correct answer, feedback when wrong, science cards, rewards and developer notes.

> **Implementation constraints (added for the AI implementer).** All player-facing text is **English only**. Rusty speaks only through **text bubbles and synthesized beeps** (no text-to-speech, no voice-over). No NASA/JPL logos, flags or mission patches anywhere; credit NASA in plain text only.

**PLAY → DISCOVER → ANSWER → LEARN → DECIDE → CELEBRATE**

# 1. The Junior Explorer experience

Junior Explorer does not test the child like a scientist, with hard language. The child becomes Commander Nova, explores the Mars base, solves small problems, and Rusty teaches science like a friend.

| **Design rule** | **How to implement** |
|---|---|
| One topic at a time | One science idea per popup; at most 1–2 short sentences. |
| Short questions | One question per quiz, 2 answer options. |
| Simple words | Keep words like oxygen, water, sunlight; explain any new word immediately. |
| Action first, lesson after | The player inspects the tank first; then the oxygen lesson appears. |
| No fear for mistakes | A wrong answer gets "Try again" and a hint; the score never shames the child. |
| No free choice | Both options of the main decision have trade-offs; no option is completely free. |
| Time is not against the player | Moving slowly with mouse/keyboard does not reduce resources. Resources change only when an action happens or the sol advances. |
| Optional learning | Science cards have Continue / Explore more / Skip. The main mission is never blocked. |

> **Important.** The original research plan has 4 crew (including the Commander), five Critical Sols, four resources (O₂, Water, Food, Power), the Rover companion and the Look → Compare → Choose → Review loop. This Junior mode shows the same things in simple language; decide as a team before changing core simulation rules.

# 2. First-play timing — 30–35 minutes total

| **Game time** | **What happens** | **Learning** |
|---|---|---|
| 00:00–00:45 | Mars arrival cinematic; meet Commander Nova | Story setup |
| 00:45–02:00 | Meet Rusty; learn WASD, mouse, E | Basic controls |
| 02:00–03:00 | Jump challenge + Mars gravity | Gravity |
| 03:00–04:00 | Inspect the oxygen tank + see the crew | Mars air is not breathable |
| 04:00–09:00 | Mission 1: Whisper in Tank 2 | Oxygen, CO₂, leak isolation |
| 09:00–14:00 | Mission 2: Red Sky | Dust, sunlight, solar power |
| 14:00–19:00 | Mission 3: Water You Can't Drink Yet | Water recycling, buried ice, purification |
| 19:00–24:00 | Mission 4: Cold Greenhouse | Plants, light, water, warmth |
| 24:00–30:00 | Mission 5: Storm Over the Ice | Sun activity, radiation, shelter |
| 30:00–35:00 | Commander's debrief + badges | Recall and reflection |

These timings are first-play pacing design targets, not real NASA times. If the player explores more, the session may run longer. The story timeline of the five Critical Sols stays separate: Sol 21, 34, 52, 67 and 88.

# 3. Tutorial — A New Home on Mars (00:00–04:00)

Story: Commander Nova and three more crew members are in the Mars habitat. Rusty is a small AI rover friend. He shows the player around the base.

| **Time** | **Action** | **Rusty line / UI** |
|---|---|---|
| 00:00 | Landing scene ends; the player gets control | “Welcome to Mars, Commander!” |
| 00:45 | Walk forward with WASD | “Use WASD to move.” |
| 01:15 | Press E to inspect an object in the rover bay | “Press E to explore.” |
| 02:00 | Jump to collect 3 glowing crystals | “Whoa! You jumped so high!” |
| 02:30 | Gravity Science Card | “Mars pulls you down less than Earth.” |
| 03:00 | Go near the oxygen tank and inspect it | “Can we breathe Mars air?” |
| 03:30 | See the crew panel and habitat map | “This home keeps our crew safe.” |

## Tutorial quiz

Q: Can we breathe the air on Mars?

| **Option A** | **Option B** | **Correct** |
|---|---|---|
| Yes, like Earth | No, we need oxygen | B |

Correct feedback: “That’s right! Mars air is not safe to breathe.”

Wrong feedback: “Not quite! Let’s check the oxygen tank.”

## Tutorial Science Cards

| **When** | **Card title** | **Player-facing copy** |
|---|---|---|
| 02:30 | Mars Gravity | “Mars has weaker gravity than Earth. You can jump higher here!” |
| 03:30 | Mars Air | “Mars air is mostly carbon dioxide. Astronauts need a safe oxygen supply.” |
| 03:45 | A Mars Day | “A day on Mars is called a sol. One sol is about 24 hours and 39 minutes.” |

Developer note: the 3.73 m/s² gravity value and the 2.6× jump comparison are in the research pack; the gravity source value must be verified before shipping. For the Junior card, saying "weaker gravity" instead of a number is enough.

# 4. Main Missions

## MISSION 1 — Whisper in Tank 2

**Time:** 04:00–09:00 | Story timeline: Critical Sol 21

Story: Rafi sees the pressure in Tank 2 dropping. Oxygen is leaking from the tank. To keep the crew safe, the Commander must find and stop the leak.

**What the player learns:** What oxygen is, why Mars air is not breathable, and why an isolation valve helps stop a leak.

**Scene / 3D action:** Oxygen storage bay; a small white vapour puff from Tank 2, an amber warning light, and the pressure gauge goes down. The player must inspect the tank and three pipes.

### Gameplay flow

| **Time** | **What the player does** | **What the game / Rusty does** |
|---|---|---|
| 04:00 | Hear the alarm and go to Tank 2 | Rusty: “Commander! Tank 2 is losing air!” |
| 04:45 | Look at the pressure gauge | UI: “Pressure is falling.” |
| 05:30 | Inspect three pipes/valves to find the leak | Rusty: “Look for the loose valve.” |
| 06:30 | Two-option decision card | Command Mode; the world pauses |
| 07:30 | Hold E to isolate the valve / move the crew to the backup room | Valve turn animation or crew move animation |
| 08:30 | Science Card + Oxygen Guardian badge | “We stopped the leak!” |

### Short quiz

**Question:** What do astronauts need to breathe?

| **Option A** | **Option B** | **Correct answer** |
|---|---|---|
| Water | Oxygen | B |

If correct, Rusty says: “Yes! Astronauts need oxygen to breathe.”

If wrong, Rusty says: “Try again! Look at the oxygen tank.”

### Mini activity

Pipe Detective: Among the three pipes, inspect the one with the blinking warning light next to it. Then go to the correct valve and hold E.

### Main decision — in simple words

| **Choice 1** | **Choice 2** | **What the player should understand** |
|---|---|---|
| A. Close the damaged valve (the leak shrinks or stops; Tank 2 is locked for some time) | B. Move the crew to the backup room (the crew is safe for now; but the leak continues) | With A the source is fixed; with B people are moved first but the oxygen loss does not stop. Both options create a time/resource trade-off. |

Science Card (short): “A valve can close one part of a pipe system. This helps stop a leak.”

**Reward:** Oxygen Guardian Badge — an oxygen tank badge icon and 1 journal fact.

> **Implementation note:** The original plan has four A–D decisions. The Junior UI shows these two simple options; if you want, keep the backend's four options intact and offer the other two as "More choices". Do not make any option a free win.

## MISSION 2 — Red Sky

**Time:** 09:00–14:00 | Story timeline: Critical Sol 34

Story: The Mars sky is filling with dust. The solar panels get less sunlight, so the base battery is dropping fast.

**What the player learns:** Dust in the air can reduce sunlight; solar panels make electricity from light; a battery stores energy.

**Scene / 3D action:** Solar array field and power room. The sky slowly turns orange-grey, dust particles increase, and the solar panel output meter drops.

### Gameplay flow

| **Time** | **What the player does** | **What the game / Rusty does** |
|---|---|---|
| 09:00 | Dust storm alert | Rusty: “The sky is getting dusty!” |
| 09:45 | Go toward the solar panels | UI: “Less sunlight is reaching the panels.” |
| 10:30 | Compare the output of three panels | Rusty: “Which panel gets more light?” |
| 11:30 | Dust/Sunlight mini activity | The player raises dust with a slider and sees the light meter drop |
| 12:30 | Power decision | A simple choice: battery reserve, or turning off non-essential machines |
| 13:30 | Science Card + Solar Engineer badge | Explains the safe plan instead of sending the Rover into the storm |

### Short quiz

**Question:** What do solar panels use to make electricity?

| **Option A** | **Option B** | **Correct answer** |
|---|---|---|
| Sunlight | Moonlight | A |

If correct, Rusty says: “Correct! Solar panels use sunlight.”

If wrong, Rusty says: “Try again! Look at the bright Sun above the panels.”

### Mini activity

Sunlight Slider: Clear sky → dusty sky. The player raises the dust slider, and the panel's light/output meter drops. No calculation needed.

### Main decision — in simple words

| **Choice 1** | **Choice 2** | **What the player should understand** |
|---|---|---|
| A. Keep important systems ON and turn off extra machines (the battery is saved; greenhouse/science work may slow down) | B. Keep every machine running (all work continues; the battery may run out fast) | A gives priority to life-support systems; B is convenient now but raises blackout risk later. |

Science Card (short): “Dust in the air blocks some sunlight. Solar panels make less power when less light reaches them.”

**Reward:** Solar Engineer Badge — sun and solar panel icons.

> **Implementation note:** Original data: the Opportunity rover's historical output went 468 → 345 → 133 Wh, dropping as dust opacity rose. Junior mode does not need to show Wh or tau; keep the data in an optional "Grown-up Science" card. Include the timing lesson: do not clean the panels during the storm; clean them after the storm.

## MISSION 3 — Water You Can't Drink Yet

**Time:** 14:00–19:00 | Story timeline: Critical Sol 52

Story: The Water Recycler is not cleaning and returning water properly. Lucía's rover scan shows a chance of ice under the ground.

**What the player learns:** Water can be recycled; some places on Mars may have ice under the soil; even after ice melts, the water must be cleaned before drinking.

**Scene / 3D action:** From the water recycler room to the rover bay, then the ice scan site. The scanner shows possible ice spots with a blue glow.

### Gameplay flow

| **Time** | **What the player does** | **What the game / Rusty does** |
|---|---|---|
| 14:00 | Water warning | Rusty: “Our water supply is getting low!” |
| 14:45 | Inspect the recycler | UI: “The recycler needs help.” |
| 15:30 | Recycler mini puzzle: fit the filter part | When the filter goes in the correct slot, the recycler animation starts |
| 16:30 | Go outside with the rover scanner | Rusty: “Let’s search for buried ice.” |
| 17:30 | Scan three ground spots | One spot gives an ice signal |
| 18:15 | Decision + Science Card | Repair / emergency reserve trade-off; badge |

### Short quiz

**Question:** Can we drink ice straight from the ground?

| **Option A** | **Option B** | **Correct answer** |
|---|---|---|
| Yes, right away | No, melt and clean it first | B |

If correct, Rusty says: “Correct! Ice must be melted and cleaned first.”

If wrong, Rusty says: “Not yet! Water needs to be safe and clean.”

### Mini activity

Ice Scanner: Scan three places. If the scanner beeps faster, ice is more likely there. If the ice discovery is not confirmed, the UI says "possible ice", not confirmed proof.

### Main decision — in simple words

| **Choice 1** | **Choice 2** | **What the player should understand** |
|---|---|---|
| A. Repair the water recycler (water starts coming back; needs a spare part and power) | B. Use the emergency water reserve (today's problem eases; later there is no emergency backup) | A fixes the system in the long run; B helps now but spends the reserve. |

Science Card (short): “Recycling helps us use water again. Buried ice must be collected, melted and cleaned before drinking.”

**Reward:** Ice Explorer Badge — ice crystal + rover icon.

> **Implementation note:** In the original plan, the recycler recovery falls from 85% to 40%; the 85% recycling rate and the water amounts are simulation values. In the Junior HUD, show "Recycler: Needs repair / Working" instead of a percentage.

## MISSION 4 — Cold Greenhouse

**Time:** 19:00–24:00 | Story timeline: Critical Sol 67

Story: The greenhouse temperature control is broken. Frost is forming on the glass and the plants are drooping. The crew's food supply is also dropping.

**What the player learns:** Plants need light, water, warmth and nutrients; in photosynthesis plants use light to make sugar and release oxygen; the greenhouse protects plants from Mars's cold.

**Scene / 3D action:** Greenhouse interior. Frost slowly spreads on the glass, the grow light dims, and plant leaves droop. Replacing the thermostat module plays a recovery animation.

### Gameplay flow

| **Time** | **What the player does** | **What the game / Rusty does** |
|---|---|---|
| 19:00 | Greenhouse alarm | Rusty: “The plants are getting cold!” |
| 19:45 | Inspect plant health | See the leaf condition of 3 plants |
| 20:30 | Plant needs mini activity | Place light, water and warmth icons next to the plant |
| 21:30 | Thermostat repair interaction | Put the module in the correct slot |
| 22:30 | Food choice | Repair / stored food bridge |
| 23:30 | Science Card + Greenhouse Guardian badge | The plants stand upright again |

### Short quiz

**Question:** What helps a plant grow?

| **Option A** | **Option B** | **Correct answer** |
|---|---|---|
| Light and water | Only rocks | A |

If correct, Rusty says: “Yes! Plants need light and water to grow.”

If wrong, Rusty says: “Try again! Look at the healthy green plant.”

### Mini activity

Plant Helper: Place three icons next to the plant: sunlight, water, warmth. Nutrients can be left out of the Junior quiz; they can be added to the journal's extra fact.

### Main decision — in simple words

| **Choice 1** | **Choice 2** | **What the player should understand** |
|---|---|---|
| A. Fix the thermostat (raises the chance of saving the plants; needs power and a spare kit) | B. Use stored food for now (the crew gets food now; the greenhouse is not fixed and the reserve drops) | A protects the future harvest; B handles today's shortage but leaves the future crop at risk. |

Science Card (short): “Plants need light, water and warmth. A greenhouse helps protect them from the cold.”

**Reward:** Greenhouse Guardian Badge — leaf icon.

> **Implementation note:** According to the original plan, crops are a supplement to stored food, not a replacement for all food. If growth time is compressed in the game, label it "game time". −63°C is Mars's average temperature; the greenhouse's target temperature is a separate simulation setting.

## MISSION 5 — Storm Over the Ice

**Time:** 24:00–30:00 | Story timeline: Critical Sol 88

Story: The rover has found an ice site. Just then a space-weather warning arrives: energetic particles may come from the Sun. Keeping the crew in a safe shelter is urgent.

**What the player learns:** The Sun can release energetic particles; high radiation can harm people; a shelter and shielding help reduce exposure.

**Scene / 3D action:** In the radiation shelter, the water tanks are visible by the wall. The alert light blinks and the dosimeter meter rises. The strobe must not be too fast or hard on the eyes.

### Gameplay flow

| **Time** | **What the player does** | **What the game / Rusty does** |
|---|---|---|
| 24:00 | Space-weather alert | Rusty: “A space-weather warning! Let’s protect the crew.” |
| 24:45 | Go toward the shelter | UI: “Stay protected during the warning.” |
| 25:30 | Radiation demo | Compare protection bars on the shielding panel |
| 26:30 | Crew safety decision | Stay in the shelter / go outside |
| 27:30 | Hatch close action | The player holds E to close the shelter door |
| 28:30 | Rover ice mission status | Rover safe / delayed outcome |
| 29:15 | Science Card + Space Safety badge | Short debrief cue |

### Short quiz

**Question:** What can help protect astronauts?

| **Option A** | **Option B** | **Correct answer** |
|---|---|---|
| A safe shielded shelter | Standing outside | A |

If correct, Rusty says: “That’s right! A shielded shelter can help protect the crew.”

If wrong, Rusty says: “Try again! Look at the shelter walls.”

### Mini activity

Shield Builder: Among three shield layers, place the water tank layer. The visual bar shows: More shielding → more protection. Do not scare children with real dose numbers.

### Main decision — in simple words

| **Choice 1** | **Choice 2** | **What the player should understand** |
|---|---|---|
| A. Move the crew into the shielded shelter (the crew is better protected; the rover/ice task may be delayed) | B. Continue outside work (work may go faster; the crew is at more risk) | A puts crew safety first; B tries to save the schedule but raises exposure risk. |

Science Card (short): “Radiation is energy that can be harmful. A well-shielded shelter helps protect astronauts.”

**Reward:** Space Safety Badge — shield icon; final campaign badge.

> **Implementation note:** The DONKI CME record in the original plan is a model forecast, not a radiation dose measurement. In the Junior UI, say only "Space-weather warning". The dose values 15/60/30/180 mSv are simulation values; it is better not to show numeric doses in this age mode.

# 5. After the mission — Commander's Debrief (30:00–35:00)

Do not judge the child with a big score number on the final screen. Celebrate what they discovered and how they helped the crew.

| **Screen part** | **Shows** |
|---|---|
| Celebration | “Great work, Commander!” + short confetti/star animation |
| Crew status | 4 crew members safe / need help — face icon |
| Mission badges | The badges that were unlocked |
| Discovery Journal | Mars gravity, air, solar power, water, plants, radiation — a one-line recap each |
| One reflection question | “What helped the crew most?” |
| Retry | “Play again” — same scenario seed, try a different choice |

Final reflection Q: “What helps astronauts stay safe on Mars?”

| **Option A** | **Option B** | **Correct** |
|---|---|---|
| Only a fast rover | Safe air, water, power and shelter | B |

Rusty closing line: “You explored Mars, solved problems and helped your crew. You are a Junior Explorer!”

> **Badge disclaimer.** Write "In-game achievement" on the badge. It must not be called an official NASA certificate.

# 6. Educational content system — when and how to show it

| **Content type** | **When it triggers** | **How much content** | **UI behaviour** |
|---|---|---|---|
| Rusty hint | When the player stops near an objective / goes to the wrong place | One short line | Bubble; no more than 2–3 lines |
| Discovery prompt | When a new object is inspected for the first time | One question | Small 2-option card |
| Science Card | After a quiz or main decision | 1–2 sentences | Continue / Skip |
| Mini activity | In the middle of a mission | One simple action | 30–60 sec target |
| Journal entry | At the end of each mission | One fact + small icon | The player opens it later if they want |
| Debrief | At the end | Recap of 5 themes | One screen, optional replay |

Suggested content pacing: in 30–35 minutes, 5 missions, 5 quizzes, 5 mini activities, 8–10 Science Cards and 1 final recap. Do not pop up the same fact repeatedly.

# 7. Junior UI text rules

| **Do** | **Avoid** |
|---|---|
| “Find the leaking pipe.” | “Investigate the oxygen storage system failure.” |
| “Choose a safe plan.” | “Evaluate the optimal risk mitigation strategy.” |
| “Dust blocks sunlight.” | “Atmospheric opacity attenuates solar irradiance.” |
| “Melt and clean the ice.” | “Extract, process and purify subsurface water resources.” |
| “Plants need light and water.” | Long photosynthesis paragraph |
| “Try again. Look at the tank.” | “Incorrect answer.” |

# 8. Sound, animation & accessibility

- Rusty's lines are 2–3 short sentences at most; text/subtitles are always ON by default (Rusty uses text bubbles and synthesized beeps only, no voice-over).
- Quiz answer buttons are big, two options, icon + a 2–5 word label.
- Correct answer: soft chime + green glow; wrong answer: a gentle hint, never a harsh buzzer.
- Radiation alert: no intense flashing or strobe; use a calm pulsing light and a text warning.
- Every science card has Skip/Continue; the simulation stops when paused.
- Do not show status by colour alone; also use an icon + text label.
- Settings to reduce motion, reduce camera bob, and a Quiet Rover option.

# 9. Developer implementation checklist

- Tutorial state machine: landing → move → jump → inspect oxygen → crew intro → M1 unlock.
- Each mission uses trigger-based events; if the player is slow, resources do not drain.
- Data for each quiz: question, optionA, optionB, correctOption, correctFeedback, wrongFeedback.
- Data for each Science Card: title, oneSentence, optionalMoreInfo, sourceId, skipEnabled.
- Each mission has two Junior choices; the choice outcome must be mapped into the resource/ripple system.
- At the end of each mission, the journal fact and the badge-unlock flag are saved.
- If you want to keep the original four-choice engine, use a two-stage choice or "More choices" in the Junior UI; hidden choices must not be an unfair surprise.
- All invented values (resource costs, risk, timing, growth, dose) must be tagged SIM in code and game credits.
- Do not call NASA historical data LIVE; if it is archived data, show an ARCHIVED label and the date.
- No AI-generated Rover text; always keep a pre-written line fallback.

# 10. Source-plan alignment & science safety

This Junior guide is based on your MARS: LAST HABITAT — Mission Design & Science/Data Research Pack (v2). The mission titles, Sol 21/34/52/67/88, crew count, Rover role, resource themes, the Opportunity dust curve, SWIM buried ice, the greenhouse, the DONKI/CME trigger and the decision/ripple philosophy are taken from the original plan.

| **Topic** | **What to do in Junior mode** |
|---|---|
| REAL data | Say it in simple language for children; detailed numbers are optional, in the journal. |
| DERIVED data | Show as "calculated from real data" in an adult / extra-science view. |
| SIM values | Label "Game simulation"; do not present as a real NASA measurement. |
| VERIFY item | Until the source is verified, do not tell children the exact number or official limit. |
| DONKI | A modelled arrival warning; not a dose measured on Mars. |
| Opportunity | Rover solar output; not the real power of a Mars habitat. |
| MOXIE | An experiment-scale oxygen demonstration; not the full habitat oxygen supply. |
| Water ice | Possible ice on orbital maps; the player scan says "possible ice", not a guaranteed discovery. |
| Radiation | In Junior mode, the shelter concept; hide mSv dose numbers and the unverified event limit. |

> **Important science correction.** In the original plan, the 250 mSv event limit, the gravity source value, the full-scale ISRU rate and several references are still marked VERIFY. Do not put these in the UI as official NASA facts without verifying them.

# 11. What to build first — recommended order

| **Build order** | **Implement** | **Test when done** |
|---|---|---|
| 1 | Tutorial + Rusty dialogue | Can a new player learn to move, jump and inspect in 4 minutes? |
| 2 | Science Card + 2-option quiz component | Is the same component reused in all 5 missions? |
| 3 | Mission 1 + decision outcome | Can the player find the leak and interact with the valve? |
| 4 | Mission 2 + dust/light visual | When dust increases, can you see the panel output drop? |
| 5 | Mission 3 + recycler/ice scanner | Does the player understand that ice cannot be drunk directly? |
| 6 | Mission 4 + plant activity | Does the player understand plant needs and the thermostat action? |
| 7 | Mission 5 + safe shelter | Can the player choose the shelter and protect the crew? |
| 8 | Journal, badges, final debrief | Does one screen recap what the player learned? |

# 12. Junior Explorer — success criteria

After playtesting, if a first-time 7–9-year-old can do the following without adult help, Junior mode is working:

- Can walk, jump and inspect objects with E on their own.
- Understands that Mars air cannot be breathed directly.
- Understands that dust can reduce a solar panel's power.
- Understands that ice must be melted and cleaned before drinking.
- Understands that a plant needs light, water and warmth.
- Understands that a shelter is the safe choice when a radiation warning arrives.
- Even after a wrong answer, tries again without fear or embarrassment.
- After the game, can say at least 3 science facts in their own words.

# Appendix — Original plan facts to preserve

- Four-person crew includes the player-Commander. Crew: Commander, Dr. Amara Nwosu, Lucía Ferreira, Rafi Chowdhury.
- Five Critical Sols: 21, 34, 52, 67, 88. Routine Operations time-lapse advances the resource simulation between them.
- Resource HUD: Oxygen, Water, Food, Power. Radiation is an additional hazard/dose meter, especially in Mission 5.
- Core decision loop: Look → Compare → Choose → Review. No option is free; show costs and consequences.
- Rover companion provides short pre-written hints, has quiet mode, and is not allowed to invent science numbers.
- Final badge must say “in-game achievement — not an official NASA certificate.”
- NASA does not endorse this independent educational project; show data and asset credits.
