/**
 * District / NCDA Impugukirwa (actionable follow-up alerts).
 * Contract: GET /api/v1/alerts/follow-up (+ /summary) — no dismiss/ack mutations.
 */
export { useFollowUpAlerts, useFollowUpSummary } from './queries'
