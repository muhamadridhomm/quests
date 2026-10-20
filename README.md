# QUESTS — Work Planning & Capacity Dashboard

A portfolio edition of a work-planning dashboard. It demonstrates work intake, campaign views, status boards, workload summaries, filtered searches, and demo dispatch suggestions.

This copy contains synthetic tasks, teams, and contributors. Refresh reloads only the local demo records; there is no employer data source or employer endpoint. Optional AI suggestions use user-supplied Gemini credentials. The key file and runtime task edits are git-ignored.

## Start locally

1. Install Node.js 18 or later.
2. Run `npm install`.
3. Copy `.env.example` to `.env` only if using the optional AI feature, then enter your own API key.
4. Run `npm run dev` and open the Vite address shown in the terminal.

The first API request copies `server/data/demo_tasks.json` into a git-ignored local runtime file. Changes made in the demo stay on your machine.

All tasks, contributors, campaigns, identifiers, and dates in the seed fixture are synthetic.
