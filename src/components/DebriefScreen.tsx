import { Award, RotateCcw, Shuffle, Home, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { CREW_PROFILES, SCORE_WEIGHTS } from '../sim/constants';
import { CampaignState, computeCampaignEvaluation } from '../sim/simEngine';

interface DebriefScreenProps {
  state: CampaignState;
  onReplaySameSeed: () => void;
  onPlayNewSeed: () => void;
  onOpenDataCredits: () => void;
  onReturnTitle: () => void;
}

export function DebriefScreen({
  state,
  onReplaySameSeed,
  onPlayNewSeed,
  onOpenDataCredits,
  onReturnTitle,
}: DebriefScreenProps) {
  const evalRes = computeCampaignEvaluation(state);

  const statusColor =
    evalRes.status === 'SUCCESSFUL'
      ? '#22C55E'
      : evalRes.status === 'NEEDS IMPROVEMENT'
        ? '#FFB703'
        : '#DC2626';

  const StatusIcon =
    evalRes.status === 'SUCCESSFUL'
      ? CheckCircle2
      : evalRes.status === 'NEEDS IMPROVEMENT'
        ? AlertTriangle
        : XCircle;

  const categories = [
    { label: 'Crew Safety', score: evalRes.breakdown.crewSafety, max: SCORE_WEIGHTS.crewSafety },
    {
      label: 'Resource Efficiency',
      score: evalRes.breakdown.resourceEfficiency,
      max: SCORE_WEIGHTS.resourceEfficiency,
    },
    {
      label: 'Mission Objectives',
      score: evalRes.breakdown.missionObjectives,
      max: SCORE_WEIGHTS.missionObjectives,
    },
    {
      label: 'Decision Quality',
      score: evalRes.breakdown.decisionQuality,
      max: SCORE_WEIGHTS.decisionQuality,
    },
    { label: 'Exploration (Ice)', score: evalRes.breakdown.exploration, max: SCORE_WEIGHTS.exploration },
  ];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#061020]/80 p-4 sm:p-6 overflow-y-auto">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="debrief-title"
        className="my-auto w-full max-w-4xl overflow-hidden rounded-2xl border border-[#E85D04]/60 bg-[#071324]/95 text-[#F8F9FA] shadow-[0_0_38px_rgba(232,93,4,0.26)] font-[family-name:var(--font-game)]"
      >
        <div className="h-1 w-full bg-gradient-to-r from-[#E85D04] via-[#FFB703] to-[#22C55E]" />

        <div className="p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-[#FFB703] tabular-nums">
              Sol {state.sol} Final Report · Seed #{state.seed}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-[#1B3A5F] px-3 py-1 text-[11px] font-bold text-[#F8F9FA]">
              <Award className="h-3.5 w-3.5 text-[#FFB703]" aria-hidden="true" />
              In-game mission certificate
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1
                id="debrief-title"
                className="flex items-center gap-2.5 text-2xl font-extrabold tracking-tight sm:text-3xl"
                style={{ color: statusColor }}
              >
                <StatusIcon className="h-7 w-7 shrink-0" aria-hidden="true" />
                <span>Mission {evalRes.status}</span>
              </h1>
              <p className="mt-1 text-sm text-[#F8F9FA]/90">{evalRes.statusReason}</p>
            </div>

            <div className="rounded-xl border border-white/15 bg-[#1B3A5F]/75 px-4 py-3 text-center">
              <p className="text-[11px] font-bold text-[#FFB703]">Total Score</p>
              <p className="text-3xl font-black tabular-nums text-[#F8F9FA]">
                {evalRes.totalScore}
                <span className="text-base text-[#F8F9FA]/60">/100</span>
              </p>
            </div>
          </div>

          {/* Process vs Outcome Banner */}
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-[#38BDF8]/40 bg-[#1B3A5F]/55 p-3.5">
              <p className="text-[11px] font-bold text-[#38BDF8]">Smart Choices Score</p>
              <p className="mt-1 text-xl font-extrabold tabular-nums">
                {evalRes.decisionQualityScore}%
              </p>
              <p className="mt-0.5 text-xs text-[#F8F9FA]/85">
                Checked data panels {state.inspectedDataCount}/5 times and kept crew safe.
              </p>
            </div>
            <div className="rounded-xl border border-[#FFB703]/40 bg-[#1B3A5F]/55 p-3.5">
              <p className="text-[11px] font-bold text-[#FFB703]">Base Status</p>
              <p className="mt-1 text-xl font-extrabold">{evalRes.outcomeLabel}</p>
              <p className="mt-0.5 text-xs text-[#F8F9FA]/85 tabular-nums">
                Goals: {evalRes.objectivesCount}/5 · O₂ {state.oxygenKg} kg · H₂O {state.waterKg} kg · Food {state.foodKg} kg
              </p>
            </div>
          </div>

          {/* Weighted Score Breakdown */}
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-5">
            {categories.map((cat) => (
              <div
                key={cat.label}
                className="rounded-xl border border-white/10 bg-[#1B3A5F]/45 p-3"
              >
                <p className="text-[11px] font-bold text-[#F8F9FA]/80">{cat.label}</p>
                <p className="mt-1 text-lg font-extrabold text-[#FFB703] tabular-nums">
                  {cat.score}
                  <span className="text-xs text-[#F8F9FA]/60">/{cat.max}</span>
                </p>
              </div>
            ))}
          </div>

          {/* Personal Crew Epilogues */}
          <div className="mt-4">
            <p className="text-xs font-bold text-[#FFB703]">
              Crew &amp; {state.roverName} Stories
            </p>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {state.crew.map((member) => {
                const profile = CREW_PROFILES.find((p) => p.id === member.id)!;
                const note = !member.alive
                  ? 'Did not survive life-support loss.'
                  : member.health < 70
                    ? `Tired after tough storms (Health ${member.health}%).`
                    : `Healthy and proud! (Health ${member.health}%).`;
                return (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#1B3A5F]/45 px-3 py-2 text-xs"
                  >
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-extrabold text-[#0B1D36]"
                      style={{ backgroundColor: profile.avatarColor }}
                    >
                      {profile.initials}
                    </div>
                    <div>
                      <p className="font-extrabold text-[#F8F9FA]">{member.name}</p>
                      <p className="text-[#F8F9FA]/80">{note}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-2 rounded-xl border border-white/10 bg-[#1B3A5F]/35 px-3 py-2 text-xs text-[#F8F9FA]/90">
              <strong className="text-[#22C55E]">{state.roverName}:</strong>{' '}
              {state.roverDamaged
                ? 'Bent a wheel in the Sol 34 storm, but still gave great hints!'
                : state.iceDrilledSuccess
                  ? 'Drilled into the buried ice seam and brought back clean core samples!'
                  : 'Stayed right beside you across all 88 Mars days.'}
            </p>
          </div>

          {/* Actions */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onOpenDataCredits}
                className="min-h-[42px] rounded-xl border border-white/20 bg-[#1B3A5F] px-4 text-xs font-bold text-[#F8F9FA] hover:border-[#FFB703] cursor-pointer"
              >
                NASA Data Credits
              </button>
              <button
                type="button"
                onClick={onReturnTitle}
                className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-white/20 bg-[#1B3A5F] px-4 text-xs font-bold text-[#F8F9FA] hover:border-[#FFB703] cursor-pointer"
              >
                <Home className="h-4 w-4 text-[#FFB703]" aria-hidden="true" />
                <span>Title Screen</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onReplaySameSeed}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#FFB703] bg-[#1B3A5F] px-4 text-xs font-extrabold text-[#FFB703] hover:bg-[#FFB703] hover:text-[#0B1D36] cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                <span>Try Again</span>
              </button>
              <button
                type="button"
                onClick={onPlayNewSeed}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-gradient-to-r from-[#FFB703] to-[#E85D04] px-5 text-xs font-extrabold text-[#0B1D36] shadow-lg hover:scale-[1.02] cursor-pointer"
              >
                <Shuffle className="h-4 w-4" aria-hidden="true" />
                <span>New Game</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
