

## Add Client Portal Login Button to Public Landing Page

Right now, if a client visits `bsgtires.com` (the public landing page), there's no way for them to get to their portal login. They'd have to know the exact URL `app.treadset.co/client-login`. We should add a visible "Client Portal" button so they can find it easily.

### Changes

**1. `src/components/public/PublicNavbar.tsx`** — Add a "Client Portal" button/link in the navbar that links to `https://app.treadset.co/client-login`. This keeps it visible on every page of the public site. Will be styled as a secondary/outline button next to existing nav items.

**2. `src/components/public/PublicFooter.tsx`** — Add a "Client Portal Login" link in the footer links section for discoverability.

**3. `src/components/public/CTASection.tsx`** — Add a subtle "Already a customer? Sign in to your portal" link below the existing CTA buttons, linking to `https://app.treadset.co/client-login`.

The links will point to the full URL `https://app.treadset.co/client-login` since the public site and app are on different domains.

