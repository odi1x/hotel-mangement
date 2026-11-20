/**
 * Curated soft per-unit palette — muted pastels, calm not neon.
 *
 * Green is deliberately excluded so it never collides with the emerald
 * accent (which stays reserved for "today" + money). Each unit maps
 * deterministically by its index in the apartments list.
 *
 * Shared by the timeline (AvailabilityView) and the monthly grid
 * (MonthlyGridSchedule) so a unit keeps the same colour in both layouts.
 */
export const UNIT_PALETTE = [
  { bg:'#eff6ff', tx:'#1e40af', bd:'#dbeafe', dbg:'rgba(59,130,246,0.16)',  dtx:'#93c5fd', dbd:'rgba(59,130,246,0.32)' },
  { bg:'#f5f3ff', tx:'#5b21b6', bd:'#ede9fe', dbg:'rgba(139,92,246,0.16)',  dtx:'#c4b5fd', dbd:'rgba(139,92,246,0.32)' },
  { bg:'#fff7ed', tx:'#9a3412', bd:'#ffedd5', dbg:'rgba(249,115,22,0.16)',  dtx:'#fdba74', dbd:'rgba(249,115,22,0.32)' },
  { bg:'#fff1f2', tx:'#9f1239', bd:'#ffe4e6', dbg:'rgba(244,63,94,0.16)',   dtx:'#fda4af', dbd:'rgba(244,63,94,0.32)' },
  { bg:'#ecfeff', tx:'#155e75', bd:'#cffafe', dbg:'rgba(6,182,212,0.16)',   dtx:'#67e8f9', dbd:'rgba(6,182,212,0.32)' },
  { bg:'#eef2ff', tx:'#3730a3', bd:'#e0e7ff', dbg:'rgba(99,102,241,0.16)',  dtx:'#a5b4fc', dbd:'rgba(99,102,241,0.32)' },
  { bg:'#fdf4ff', tx:'#86198f', bd:'#fae8ff', dbg:'rgba(217,70,239,0.16)',  dtx:'#f0abfc', dbd:'rgba(217,70,239,0.32)' },
  { bg:'#fffbeb', tx:'#92400e', bd:'#fef3c7', dbg:'rgba(245,158,11,0.16)',  dtx:'#fcd34d', dbd:'rgba(245,158,11,0.32)' },
];
