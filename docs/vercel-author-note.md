---
name: Trisha — Vercel commit author note
description: Why this repo's git config has user.email overridden to berbernicatrisa@gmail.com despite Stefan's global identity being kaizen.triardor.
type: note
date: 2026-04-30
---

# Vercel commit author convention

This repo's `.git/config` has `user.email = berbernicatrisa@gmail.com`
(repo-local, not global) because the Vercel project is owned by that
account and Vercel Hobby plan blocks deploys from commit authors
registered under a different Vercel account.

Global git identity (`kaizen.triardor@gmail.com`) is preserved for
every other project on this machine.

**Don't change** `.git/config` user.email back to the global value —
deploys will start failing again with:

> The deployment was blocked because the commit author did not have
> contributing access to the project on Vercel.

If a future contributor needs to commit, they should either:
1. Set the same repo-local `user.email = berbernicatrisa@gmail.com`, or
2. Have their email added to the Vercel project (requires Pro plan).

`Co-Authored-By:` trailers in commit bodies don't fix this — Vercel
checks the `Author:` header, not co-authors.
