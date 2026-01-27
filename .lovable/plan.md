
## What’s happening (confirmed)
- When you go to **https://treadset.lovable.app**, it **redirects to bsgtires.com** (you confirmed this).
- Lovable’s domain behavior: **if a project has a “Primary” custom domain set, the `*.lovable.app` URL will automatically redirect to that primary domain**. There is **no supported way to disable that redirect** and keep different domains showing different “homepages” in one project.

That means: as long as **bsgtires.com** is attached as the primary domain on this same project, **treadset.lovable.app can’t be used as a separate TreadSet entry URL** because it will keep redirecting to BSG.

## Goal
- **treadset.lovable.app** must stay on treadset and show the **TreadSet landing** (AppLanding).
- **bsgtires.com** must stay on BSG and show the **BSG marketing site** (PublicLanding).

## Recommended solution (no-risk to operations): split domains across 2 Lovable projects
Because Lovable forces redirect-to-primary, the only stable way is:
- **Project A (this project): TreadSet App**
  - Published URL: `https://treadset.lovable.app`
  - No BSG custom domains attached (so no redirect away from treadset)
- **Project B: BSG Marketing**
  - Custom domains: `bsgtires.com` and `www.bsgtires.com`
  - Primary domain: `bsgtires.com`

### Step-by-step (what we’ll do / you’ll do)
#### 1) Create the BSG Marketing project (safe staging first)
You (in Lovable UI):
- Create a **Remix** of the current project and name it something like **“BSG Marketing”**.
- In the BSG project, we’ll keep routing such that `/` always shows **PublicLanding** (so even the BSG project’s own `*.lovable.app` URL looks correct).

Me (after you approve and we switch to Default mode):
- Make a minimal routing adjustment in the *BSG project* so its `/` is always BSG marketing (no TreadSet landing on that project).

#### 2) Publish the BSG Marketing project
You:
- Click **Publish → Update** (Desktop: top-right. Mobile: Preview mode → “…” → Publish).

#### 3) Move the bsgtires.com domain to the BSG Marketing project
You (in Lovable UI → Project Settings → Domains):
- On the **current (TreadSet) project**: **remove/disconnect** `bsgtires.com` and `www.bsgtires.com`.
- On the **BSG Marketing project**: **connect** `bsgtires.com` and `www.bsgtires.com`, and set `bsgtires.com` as **Primary**.
  - DNS should usually stay the same (still pointing to Lovable), but Lovable will guide you if anything needs re-verification.

This step is what stops `treadset.lovable.app` from redirecting to BSG.

#### 4) Verify treadset.lovable.app no longer redirects
Validation checks (we will verify before calling it “fixed”):
- Open `https://treadset.lovable.app`:
  - It should **NOT** redirect to bsgtires.com
  - It should show **“Tire Logistics, Simplified”**
- Open `https://bsgtires.com` and `https://www.bsgtires.com`:
  - They should show the BSG marketing site
  - They should NOT redirect to treadset

#### 5) Update your beta tester email link (post-fix)
- Use **exactly**: `https://treadset.lovable.app` (no `www.`)
- I’ll also add a short “don’t add www” note in the template.

## Alternative “fast but disruptive” option (not recommended)
- Remove `bsgtires.com` from this project immediately so `treadset.lovable.app` stops redirecting.
- Downside: BSG site will go offline until it’s connected to another project.

## Implementation notes (technical)
- Your current code for `RootRoute()` is fine; the reason you can’t see it at treadset is **not code**, it’s the **forced domain redirect-to-primary** behavior.
- After the domain split, the TreadSet landing will work as intended at `treadset.lovable.app` without fighting redirects.

## Acceptance criteria (what “done” means)
1. `https://treadset.lovable.app` loads TreadSet landing and **does not redirect**.
2. `https://bsgtires.com` and `https://www.bsgtires.com` load BSG marketing and **do not redirect** to treadset.
3. `/auth` works normally from the TreadSet side.
4. No disruption to existing driver/admin app routes.

## Rollback plan
- If anything goes wrong during the domain move, reconnect `bsgtires.com` back to the original project to restore the current state.
- If needed, use Lovable **History** to restore the last known-good version of routing/UI on either project.
