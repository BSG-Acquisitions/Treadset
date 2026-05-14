---
name: treadset-ship
description: The ship protocol for ending every Treadset session. Load this at session start so the ending is never an afterthought. Every Treadset session concludes with the Ship Report — what shipped, what's blocked, what's parked, what's next. Prevents sessions from ending in summaries of intentions instead of results. Use this skill at the start and end of every Treadset session.
---

# Treadset Ship Protocol

Every Treadset session ends with the Ship Report. Load this at the start of the session so the ending is built in, not bolted on.

## Why This Exists

Treadset sessions are run between a full-time job and family time, on a phone, with cold context every time. A session that ends in "here's everything we discussed" is a session that has to be re-litigated next time. A session that ends in a Ship Report is a session the next one can build on directly.

The Ship Report is also what feeds `REVIEWS/`. The continuity discipline in `treadset-core` depends on this ritual actually happening.

## The Ship Report Format

Every session closes with exactly this:

```
## Ship Report — [date]

SHIPPED
- [Things that are actually done. Code committed, doc written,
  decision made, DNS record changed. Observable, finished results.
  Not "started" — done.]

BLOCKED
- [Things that can't move without something else. Name the blocker
  and who owns it — Zachariah, Ethan, Justin, a verify-in-repo step.]

PARKED
- [Things deliberately set aside. Not blocked — chosen not to do
  now. Named so they don't get silently forgotten or silently
  resurrected.]

NEXT SESSION — FIRST MOVE
- [One concrete thing. The single action that starts the next
  session. Phone-sized if possible.]
```

## Rules for an Honest Ship Report

**"Shipped" means done, not attempted.** A diagnosis document fully written is shipped. A plan to write one is not. A Claude Code prompt handed over ready to run is shipped. "We talked about running Claude Code" is not.

**For a diagnosis-only session, the diagnosis IS the ship.** Treadset runs diagnose-before-fix. A session whose entire job was a diagnosis pass ships when `REVIEWS/<TOPIC>.md` is written. That's a complete, legitimate shipped result — don't treat a no-code-change session as a session with nothing to show.

**Blocked items name their owner.** "Blocked on the PTE remediation decision" is incomplete. "Blocked — joint call with Ethan on historical manifest remediation" is right. Every blocker has a name attached.

**Parked is a real category — use it.** Treadset has a lot of known-but-deferred surface (70+ public edge functions, the training package reframe, Lovable AI replacement). Parking something is a decision, and naming it as parked is how it stays visible without being active scope. Scope creep gets named here too: if the session pulled in something beyond its stated job, it goes in PARKED with a note.

**Next move is one thing.** Not a list. Not a plan. One concrete first action for next session. If it can be done on a phone, even better.

## Append to REVIEWS/

After the Ship Report is written, it gets appended to the relevant `REVIEWS/` document — same format. The PTE bug session log and the ownership audit are both in this shape. New topic, new file: `REVIEWS/<TOPIC>.md`. Continuing a topic, append to the existing file. This is the mechanism that makes `treadset-core`'s continuity rule actually work — the Ship Report isn't just shown to Zachariah, it's persisted.

## The Session Doesn't End Without It

A Treadset session that stops without a Ship Report is unfinished, regardless of how much got done inside it. The report is the deliverable that makes every other deliverable findable next time.
