/**
 * TreadyBubble — floating chat button + slide-out panel.
 *
 * V1.7: voice removed (Z, 2026-05-14). Tours are now visual-only — highlight
 * ring + caption + timing. The speak / speak_async step kinds are retained
 * as silent no-ops so existing tour scripts keep parsing; speak still
 * respects its `wait` ms so per-step pacing is preserved. Re-enabling voice
 * later is a one-line swap inside runTour.
 *
 * Implementation: hand-rolled SSE streaming via fetch. Bypasses
 * @ai-sdk/react's useChat entirely (the v5 hook captured transport
 * at first render and didn't propagate auth-token updates).
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { X, Send, Loader2, Sparkles, Play } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { TreadyCharacter, type TreadyState } from './TreadyCharacter';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? '';
const TREADY_ENDPOINT = `${SUPABASE_URL}/functions/v1/tready`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
const WELCOMED_KEY_PREFIX = 'tready_welcomed_';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

// ============================================================================
// Scripted "welcome tour" — deterministic, no LLM. Proves the visual
// primitives work end-to-end. Each step does ONE thing then waits.
// ============================================================================
// `speak` / `speak_async` are silent no-ops since voice was removed (PR #45).
// Their `text` and `wait` fields are ignored by the engine — pacing is driven
// entirely by `pause` and `highlight wait`. Step kinds retained so existing
// tour scripts keep parsing; remove from new tours.
type TourStep =
  | { kind: 'speak'; text: string; wait?: number }
  | { kind: 'speak_async'; text: string }
  | { kind: 'highlight'; element_id: string; caption?: string; waitForClick?: boolean; wait?: number }
  | { kind: 'navigate'; path: string; wait?: number }
  | { kind: 'pause'; ms: number };

const WELCOME_TOUR: TourStep[] = [
  // ---- ORIENTATION + FIRST HIGHLIGHT (parallel — first ring appears in <1s) ----
  // Long intro fires async so the user immediately sees the Clients tab pulse.
  // Voice continues talking through the highlight; no dead air, no dead screen.
  { kind: 'speak_async', text: "Welcome to TreadSet. I'll walk you through creating your first client end to end — hands on, about three minutes. Tap the highlighted Clients tab when you're ready." },
  { kind: 'pause', ms: 400 },
  { kind: 'highlight', element_id: 'topnav-clients', caption: 'Clients tab — tap to continue.', waitForClick: true },

  // ---- STEP 2: Open Add Client dialog ----
  { kind: 'speak', text: "Now tap the Add Client button.", wait: 100 },
  { kind: 'pause', ms: 800 },
  { kind: 'highlight', element_id: 'clients-add-button', caption: 'Add Client — tap to open the form.', waitForClick: true },

  // ---- STEP 3: Walk the form fields one at a time ----
  { kind: 'speak', text: "First, the company name. Try Acme Tire Recyclers.", wait: 200 },
  { kind: 'pause', ms: 800 },
  { kind: 'highlight', element_id: 'clientform-company-name', caption: 'Type the company name. Required.', wait: 9000 },

  { kind: 'speak', text: "Now the contact name — who you'll talk to there.", wait: 200 },
  { kind: 'highlight', element_id: 'clientform-contact-name', caption: 'Type the primary contact.', wait: 7000 },

  { kind: 'speak', text: "Their email goes here. Manifests and invoices auto-send to this address.", wait: 200 },
  { kind: 'highlight', element_id: 'clientform-email', caption: 'Email — used for auto-sending manifests + invoices.', wait: 7000 },

  { kind: 'speak', text: "Phone number.", wait: 200 },
  { kind: 'highlight', element_id: 'clientform-phone', caption: 'Phone, format 313-555-1234.', wait: 5500 },

  { kind: 'speak', text: "Now the pickup address — required for the compliance manifest.", wait: 200 },
  { kind: 'highlight', element_id: 'clientform-address', caption: 'Street address. Required for manifest generation.', wait: 7000 },

  { kind: 'speak', text: "City.", wait: 200 },
  { kind: 'highlight', element_id: 'clientform-city', caption: 'City.', wait: 5000 },

  { kind: 'speak', text: "State — two letters. This determines which compliance template the manifests use.", wait: 200 },
  { kind: 'highlight', element_id: 'clientform-state', caption: 'State — 2-letter code (e.g. CO, MI). Sets the compliance template.', wait: 6500 },

  { kind: 'speak', text: "ZIP code.", wait: 200 },
  { kind: 'highlight', element_id: 'clientform-zip', caption: 'ZIP code.', wait: 5000 },

  // ---- STEP 4: Submit ----
  { kind: 'speak', text: "When the form looks right, hit Save.", wait: 200 },
  { kind: 'highlight', element_id: 'client-form-submit', caption: 'Save — creates the client.', waitForClick: true },

  // ---- STEP 5: Celebrate + handoff ----
  { kind: 'speak', text: "Done. Your first client is live. They show up in the Clients list, ready to schedule pickups for. Same flow for the rest of TreadSet — tap me anytime and I'll walk you through scheduling a pickup, signing a manifest, or anything else.", wait: 200 },
  { kind: 'pause', ms: 8000 },
];

// Drop-off tour — walks the user through the 5-step Process Drop-off wizard.
// User-driven advance through the wizard (waitForClick on Next); we never
// mutate currentStep ourselves because it lives inside the dialog's local
// state.
// ============================================================================
const DROPOFF_TOUR: TourStep[] = [
  // ---- ORIENTATION + FIRST HIGHLIGHT (no voice → no orientation pause) ----
  { kind: 'pause', ms: 250 },
  { kind: 'highlight', element_id: 'topnav-dropoffs', caption: 'Drop-offs tab — tap to start the walkthrough.', waitForClick: true },

  // ---- STEP 2: Open the Process Drop-off dialog ----
  { kind: 'pause', ms: 250 },
  { kind: 'highlight', element_id: 'dropoffs-process-button', caption: 'Process Drop-off — opens the 5-step wizard.', waitForClick: true },

  // ---- STEP 3: Generator ----
  { kind: 'speak', text: "Leave the walk-in switch off for a regular drop-off. First, pick the Generator — the business whose tires you're receiving.", wait: 200 },
  { kind: 'pause', ms: 900 },
  { kind: 'highlight', element_id: 'dropoff-generator-select', caption: 'Generator — search and pick the source client.', wait: 8000 },

  // ---- STEP 4: Receiver ----
  { kind: 'speak', text: "Now pick the Receiver — which of your facilities is taking the tires.", wait: 200 },
  { kind: 'highlight', element_id: 'dropoff-receiver-select', caption: 'Receiver — your facility.', wait: 6500 },

  // ---- STEP 5: Tire counts ----
  { kind: 'speak', text: "Enter the tire counts by type. Try 40 passenger tires to start.", wait: 200 },
  { kind: 'highlight', element_id: 'dropoff-pte-input', caption: 'Passenger tires — 1 tire = 1 PTE.', wait: 7000 },

  // ---- STEP 6: Amount ----
  { kind: 'speak', text: "Now the amount you're charging the client.", wait: 200 },
  { kind: 'highlight', element_id: 'dropoff-revenue-input', caption: 'Amount charged in dollars — required.', wait: 7000 },

  // ---- STEP 7: Next to generator signature ----
  { kind: 'speak', text: "Tap Next to move to the generator signature.", wait: 100 },
  { kind: 'highlight', element_id: 'dropoff-next-button', caption: 'Next — advances the wizard.', waitForClick: true },

  // ---- STEP 8: Generator signature ----
  { kind: 'speak', text: "The generator signs first. Type their name, then draw their signature in the box.", wait: 200 },
  { kind: 'pause', ms: 700 },
  { kind: 'highlight', element_id: 'dropoff-signature-print-name', caption: 'Print name — required for the manifest.', wait: 6500 },
  { kind: 'speak', text: "Now tap Next once they've signed.", wait: 100 },
  { kind: 'highlight', element_id: 'dropoff-next-button', caption: 'Next — moves to the hauler signature.', waitForClick: true },

  // ---- STEP 9: Skip hauler signature ----
  { kind: 'speak', text: "Hauler signature is optional — leave the switch off if the driver isn't standing here, and tap Next.", wait: 200 },
  { kind: 'pause', ms: 500 },
  { kind: 'highlight', element_id: 'dropoff-hauler-sig-toggle', caption: 'Hauler signature toggle — off is fine for now.', wait: 5500 },
  { kind: 'highlight', element_id: 'dropoff-next-button', caption: 'Next — skips the hauler signature.', waitForClick: true },

  // ---- STEP 10: Receiver signature ----
  { kind: 'speak', text: "Receiver is your staff member taking the tires. Same drill — print name and sign.", wait: 200 },
  { kind: 'pause', ms: 500 },
  { kind: 'highlight', element_id: 'dropoff-signature-print-name', caption: 'Print name — receiver signer.', wait: 6500 },
  { kind: 'speak', text: "Tap Next to review.", wait: 100 },
  { kind: 'highlight', element_id: 'dropoff-next-button', caption: 'Next — goes to the review screen.', waitForClick: true },

  // ---- STEP 11: Review + submit ----
  { kind: 'speak', text: "Review everything looks right, then tap Complete Drop-off — that fires the manifest.", wait: 200 },
  { kind: 'pause', ms: 500 },
  { kind: 'highlight', element_id: 'dropoff-submit-button', caption: 'Complete Drop-off — generates the manifest.', waitForClick: true },

  // ---- STEP 12: Celebrate ----
  { kind: 'speak', text: "Done. That drop-off is logged, the manifest is on its way, and the dashboard totals just updated. Same flow every time. Tap me if you want to learn another one.", wait: 200 },
  { kind: 'pause', ms: 9000 },
];

// ============================================================================
// Trailers tour — guided walk of the four trailer sub-pages (Inventory,
// Vehicles, Drivers, Routes), explaining the mental model and ending on the
// Create Route entry point. No data mutation — pure orientation.
// ============================================================================
const TRAILERS_TOUR: TourStep[] = [
  // ---- ORIENTATION + FIRST HIGHLIGHT (no voice → no orientation pause) ----
  { kind: 'pause', ms: 250 },
  { kind: 'highlight', element_id: 'topnav-trailers', caption: 'Trailers tab — tap to tour the four trailer sub-pages.', waitForClick: true },

  // ---- STEP 2: Inventory page — status board ----
  { kind: 'navigate', path: '/trailers/inventory', wait: 1200 },
  { kind: 'speak', text: "This is your trailer inventory — a live status board. Every trailer lives in one of three columns: Empty, Full, or Staged.", wait: 200 },
  { kind: 'highlight', element_id: 'trailers-page-header', caption: 'Trailer Inventory — the real-time status board.', wait: 6000 },

  { kind: 'speak', text: "Drag a card between columns to update its status. Or click any trailer to see its full event history.", wait: 200 },
  { kind: 'highlight', element_id: 'trailers-status-board', caption: 'Drag cards between columns to change status. Click a card for history.', wait: 7000 },

  { kind: 'speak', text: "Add a new trailer here when one joins your fleet. Just the trailer number and ownership info — TreadSet handles the rest.", wait: 200 },
  { kind: 'highlight', element_id: 'trailers-add-button', caption: 'Add Trailer — register a new asset.', wait: 6000 },

  // ---- STEP 3: Vehicles page ----
  { kind: 'navigate', path: '/trailers/vehicles', wait: 1200 },
  { kind: 'speak', text: "Trailers don't move themselves — they need a semi truck. This page is your fleet of pulling vehicles.", wait: 200 },
  { kind: 'highlight', element_id: 'trailer-vehicles-page-header', caption: 'Trailer Vehicles — your semi-truck fleet.', wait: 6500 },

  // ---- STEP 4: Driver Management page ----
  { kind: 'navigate', path: '/trailers/drivers', wait: 1200 },
  { kind: 'speak', text: "And drivers — only ones with the semi-hauler capability can be assigned to a trailer route. Flip the switch to grant it.", wait: 200 },
  { kind: 'highlight', element_id: 'trailer-drivers-page-header', caption: 'Trailer Driver Management — gate who can haul trailers.', wait: 7000 },

  // ---- STEP 5: Routes page ----
  { kind: 'navigate', path: '/trailers/routes', wait: 1200 },
  { kind: 'speak', text: "Once you've got trailers, vehicles, and qualified drivers, you build a route — a sequenced plan of stops for one driver, one truck, one day.", wait: 200 },
  { kind: 'highlight', element_id: 'trailer-routes-page-header', caption: 'Trailer Routes — plan a day of moves.', wait: 6500 },

  // ---- STEP 6: Handoff to Create Route ----
  { kind: 'speak', text: "Hit Create Route whenever you're ready to plan your first run. The wizard walks you through picking a date, driver, vehicle, and stops.", wait: 200 },
  { kind: 'highlight', element_id: 'trailer-route-create-button', caption: 'Create Route — opens the route wizard.', wait: 8000 },

  // ---- CLOSE ----
  { kind: 'speak', text: "That's the trailer loop. Inventory tells you what's where, vehicles and drivers gate who can move them, and routes tie it all into a day's plan. Tap me anytime.", wait: 200 },
  { kind: 'pause', ms: 7000 },
];

// Element-ids that autopilot must NOT click — they create real data or
// fire file downloads. Autopilot pauses on these to let the visual breathe,
// then closes any open dialog with Escape and continues.
const AUTOPILOT_SKIP_CLICK = new Set([
  'dropoff-submit-button',
  'manifest-wizard-submit',
  'pickup-submit-button',
  'compliance-export-csv',
  'compliance-export-pdf',
]);

interface RunTourOptions {
  /** Autopilot mode: auto-advance every waitForClick after a brief pause. */
  autopilot?: boolean;
  /** Pause duration on waitForClick steps when autopilot is on. */
  autopilotClickDelay?: number;
}

async function runTour(
  steps: TourStep[],
  navigate: (path: string) => void,
  setRunning: (b: boolean) => void,
  options: RunTourOptions = {},
) {
  setRunning(true);

  // Cancellation: any code can dispatch `tready:cancel-tour` to bail out.
  let cancelled = false;
  const onCancel = () => {
    cancelled = true;
    window.dispatchEvent(new CustomEvent('tready:step-complete'));
  };
  window.addEventListener('tready:cancel-tour', onCancel);

  const cancellableSleep = (ms: number) =>
    new Promise<void>((resolve) => {
      const t = setTimeout(() => {
        window.removeEventListener('tready:cancel-tour', earlyWake);
        resolve();
      }, ms);
      const earlyWake = () => {
        clearTimeout(t);
        window.removeEventListener('tready:cancel-tour', earlyWake);
        resolve();
      };
      window.addEventListener('tready:cancel-tour', earlyWake);
    });

  const clickDelay = options.autopilotClickDelay ?? 2500;

  try {
    for (const step of steps) {
      if (cancelled) break;

      if (step.kind === 'speak' || step.kind === 'speak_async') {
        // Voice removed (PR #45). Both step kinds are silent no-ops.
      } else if (step.kind === 'highlight') {
        window.dispatchEvent(
          new CustomEvent('tready:highlight', {
            detail: { element_id: step.element_id, caption: step.caption, wait_for_click: step.waitForClick },
          }),
        );
        if (step.waitForClick) {
          if (options.autopilot) {
            // Autopilot: pause on the highlight, then either click the
            // target (if safe) or press Escape to clear any modal.
            await cancellableSleep(clickDelay);
            if (cancelled) break;
            const id = step.element_id;
            if (AUTOPILOT_SKIP_CLICK.has(id)) {
              // Don't fire destructive actions on the kiosk display. Press
              // Escape to dismiss whatever dialog the user was looking at.
              document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
              document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
            } else {
              const el = document.querySelector<HTMLElement>(`[data-tready-id="${id}"]`);
              if (el) el.click();
            }
          } else {
            // Manual: wait for the real click event (or cancel-tour unblock).
            await new Promise<void>((resolve) => {
              const handler = () => {
                window.removeEventListener('tready:step-complete', handler);
                resolve();
              };
              window.addEventListener('tready:step-complete', handler);
            });
          }
        } else if (step.wait) {
          await cancellableSleep(step.wait);
        }
      } else if (step.kind === 'navigate') {
        navigate(step.path);
        if (step.wait) await cancellableSleep(step.wait);
      } else if (step.kind === 'pause') {
        await cancellableSleep(step.ms);
      }
    }
  } finally {
    window.removeEventListener('tready:cancel-tour', onCancel);
    window.dispatchEvent(new CustomEvent('tready:clear-highlight'));
    setRunning(false);
  }
}

// ============================================================================
// Autopilot — loops through every shipped tour, indefinitely. For tradeshow
// display screens. Stops when cancel-tour is dispatched (click the character
// to exit). Closes dialogs + nav home between tours.
// ============================================================================
async function runAutopilot(
  navigate: (path: string) => void,
  setRunning: (b: boolean) => void,
  getTours: () => TourStep[][],
) {
  let cancelled = false;
  const onCancel = () => {
    cancelled = true;
  };
  window.addEventListener('tready:cancel-tour', onCancel);

  const sleep = (ms: number) =>
    new Promise<void>((resolve) => {
      const t = setTimeout(resolve, ms);
      const earlyWake = () => {
        clearTimeout(t);
        window.removeEventListener('tready:cancel-tour', earlyWake);
        resolve();
      };
      window.addEventListener('tready:cancel-tour', earlyWake);
    });

  try {
    while (!cancelled) {
      const tours = getTours();
      for (const tour of tours) {
        if (cancelled) break;
        // Reset between tours: close any open dialog, return home.
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        await sleep(300);
        navigate('/dashboard');
        await sleep(900);
        if (cancelled) break;
        await runTour(tour, navigate, setRunning, { autopilot: true });
        await sleep(2500); // breath between tours
      }
    }
  } finally {
    window.removeEventListener('tready:cancel-tour', onCancel);
  }
}

// ============================================================================
// Sign Manifest tour — walks the driver wizard standalone-mode end to end.
// Captions-first convention: no speak steps, all narration in highlight
// captions. User drives wizard advance via waitForClick on Next.
// ============================================================================
const MANIFEST_TOUR: TourStep[] = [
  // ---- ORIENTATION + FIRST HIGHLIGHT ----
  { kind: 'pause', ms: 250 },
  { kind: 'navigate', path: '/driver/manifests', wait: 1200 },
  { kind: 'highlight', element_id: 'driver-manifests-new-button', caption: 'Tap New Manifest — opens the 7-step wizard. Standalone mode, no existing pickup needed.', waitForClick: true },

  // ---- STEP 1: Info — generator + hauler ----
  { kind: 'pause', ms: 500 },
  { kind: 'highlight', element_id: 'manifest-generator-search', caption: 'Generator — search for the client whose tires you are hauling. Pick any one.', wait: 9000 },
  { kind: 'highlight', element_id: 'manifest-hauler-select', caption: 'Hauler — your company. Required to advance.', wait: 7000 },
  { kind: 'highlight', element_id: 'manifest-wizard-next', caption: 'Tap Next — advances to tire counts.', waitForClick: true },

  // ---- STEP 2: Tires ----
  { kind: 'pause', ms: 500 },
  { kind: 'highlight', element_id: 'manifest-pte-off-rim-input', caption: 'Off-rim passenger tires — type 40 to start. At least one count > 0 required.', wait: 8000 },
  { kind: 'highlight', element_id: 'manifest-wizard-next', caption: 'Tap Next — advances to pricing.', waitForClick: true },

  // ---- STEP 3: Pricing ----
  { kind: 'pause', ms: 500 },
  { kind: 'highlight', element_id: 'manifest-pte-off-rim-rate', caption: 'Pick a preset rate — $3 per tire is typical. Total updates live.', wait: 7000 },
  { kind: 'highlight', element_id: 'manifest-wizard-next', caption: 'Tap Next — advances to payment method.', waitForClick: true },

  // ---- STEP 4: Payment method ----
  { kind: 'pause', ms: 500 },
  { kind: 'highlight', element_id: 'manifest-payment-method-cash', caption: 'Cash — payment will mark COMPLETED on submit. Tap to select.', wait: 5500 },
  { kind: 'highlight', element_id: 'manifest-wizard-next', caption: 'Tap Next — advances to signatures, the legal step.', waitForClick: true },

  // ---- STEP 5: Generator signature ----
  { kind: 'pause', ms: 700 },
  { kind: 'highlight', element_id: 'manifest-generator-print-name', caption: 'Generator print name — the individual signing, not the company.', wait: 7000 },
  { kind: 'highlight', element_id: 'manifest-generator-signature-pad', caption: 'Draw the generator signature with your finger or mouse. Clear to redo.', wait: 9000 },

  // ---- STEP 6: Hauler signature ----
  { kind: 'highlight', element_id: 'manifest-hauler-print-name', caption: 'Hauler print name — the driver signing. Pre-filled from your account if available.', wait: 6500 },
  { kind: 'highlight', element_id: 'manifest-hauler-signature-pad', caption: 'Driver signs here. Both signatures required to advance.', wait: 8000 },
  { kind: 'highlight', element_id: 'manifest-wizard-next', caption: 'Tap Next — wizard validates both sigs captured.', waitForClick: true },

  // ---- STEP 7: Review + submit ----
  { kind: 'pause', ms: 700 },
  { kind: 'highlight', element_id: 'manifest-wizard-submit', caption: 'Create Manifest — generates the PDF, uploads sigs, emails the client.', waitForClick: true },

  // ---- CLOSE ----
  { kind: 'pause', ms: 9000 },
];

// ============================================================================
// Schedule Pickup tour — single-page Schedule Pickup dialog on /routes/today.
// One submit at the end, no Next clicks (the form is single-page). Captions
// carry all narration.
// ============================================================================
const PICKUP_TOUR: TourStep[] = [
  // ---- ORIENTATION + FIRST HIGHLIGHT ----
  { kind: 'pause', ms: 250 },
  { kind: 'highlight', element_id: 'topnav-pickups', caption: 'Pickups menu — tap to open.', waitForClick: true },

  // ---- STEP 2: Drill into Today's Routes ----
  { kind: 'pause', ms: 400 },
  { kind: 'highlight', element_id: 'topnav-pickups-today', caption: "Today's Routes — the dispatch board.", waitForClick: true },

  // ---- STEP 3: Open the Schedule Pickup dialog ----
  { kind: 'pause', ms: 700 },
  { kind: 'highlight', element_id: 'routes-schedule-pickup-button', caption: 'Schedule Pickup — opens the form.', waitForClick: true },

  // ---- STEP 4: Client ----
  { kind: 'pause', ms: 600 },
  { kind: 'highlight', element_id: 'pickup-client-select', caption: 'Client — searchable list of every client you have. Required.', wait: 8500 },

  // ---- STEP 5: Service address ----
  { kind: 'highlight', element_id: 'pickup-location-select', caption: "Service address — defaults to the client's on-file address. Pick a different one if needed.", wait: 7000 },

  // ---- STEP 6: Truck / Hauler ----
  { kind: 'highlight', element_id: 'pickup-truck-select', caption: 'Truck or hauler — your own trucks and external haulers in one list. Required.', wait: 7500 },

  // ---- STEP 7: Driver ----
  { kind: 'highlight', element_id: 'pickup-driver-select', caption: 'Driver — auto-fills from the truck if one is assigned. Override here if needed.', wait: 7000 },

  // ---- STEP 8: Date ----
  { kind: 'highlight', element_id: 'pickup-date-picker', caption: 'Pickup date — today or later. Past dates are blocked.', wait: 6500 },

  // ---- STEP 9: Window ----
  { kind: 'highlight', element_id: 'pickup-window-select', caption: 'Morning, afternoon, or any time — drives the route order.', wait: 5500 },

  // ---- STEP 10: PTE count ----
  { kind: 'highlight', element_id: 'pickup-pte-input', caption: 'PTE — passenger tire count. Estimate is fine. Try 30 to start.', wait: 6500 },

  // ---- STEP 11: OTR count ----
  { kind: 'highlight', element_id: 'pickup-otr-input', caption: 'OTR — off-the-road tires. Skip if there are none.', wait: 5500 },

  // ---- STEP 12: Tractor count ----
  { kind: 'highlight', element_id: 'pickup-tractor-input', caption: 'Tractor — semi-truck tires. Skip if zero.', wait: 5500 },

  // ---- STEP 13: Notes ----
  { kind: 'highlight', element_id: 'pickup-notes-input', caption: 'Notes show on the driver mobile manifest. Gate codes, contact name, dock numbers — drop it all here.', wait: 8000 },

  // ---- STEP 14: Submit ----
  { kind: 'highlight', element_id: 'pickup-submit-button', caption: 'Schedule Pickup — puts it on the dispatch board.', waitForClick: true },

  // ---- CLOSE ----
  { kind: 'pause', ms: 9000 },
];

// ============================================================================
// Compliance Reports tour — walks the State Compliance Reports surface.
// /reports/compliance is the canonical compliance view; tour orients the
// user to the year picker, totals, tabs, and export pane.
// ============================================================================
const REPORTS_TOUR: TourStep[] = [
  // ---- ORIENTATION + FIRST HIGHLIGHT ----
  { kind: 'pause', ms: 250 },
  { kind: 'highlight', element_id: 'topnav-reports', caption: 'Reports menu — tap to open the dropdown.', waitForClick: true },

  // ---- STEP 2: Compliance Reports menu item ----
  { kind: 'pause', ms: 400 },
  { kind: 'highlight', element_id: 'topnav-reports-compliance', caption: 'Compliance Reports — the state-compliance report.', waitForClick: true },

  // ---- STEP 3: Page header ----
  { kind: 'pause', ms: 800 },
  { kind: 'highlight', element_id: 'compliance-page-header', caption: 'State Compliance Reports — your annual scrap-tire reporting view.', wait: 5000 },

  // ---- STEP 4: Year picker ----
  { kind: 'highlight', element_id: 'compliance-year-select', caption: 'Year picker — drives every metric on the page. Switches between the last five years.', wait: 6000 },

  // ---- STEP 5: Totals overview ----
  { kind: 'highlight', element_id: 'compliance-totals-row', caption: 'Headline totals — PTEs in, tons in, tons out, counties, processed. Auto-calculated from every manifest + drop-off in the year.', wait: 9000 },

  // ---- STEP 6: Tabs ----
  { kind: 'highlight', element_id: 'compliance-tabs-list', caption: 'Eight tabs slice the report by inbound, outbound, counties, processing, sites, state totals, and export.', wait: 7500 },

  // ---- STEP 7: Export tab ----
  { kind: 'highlight', element_id: 'compliance-export-tab', caption: 'Tap Export when you are ready to generate a file for the state.', waitForClick: true },

  // ---- STEP 8: CSV button ----
  { kind: 'pause', ms: 500 },
  { kind: 'highlight', element_id: 'compliance-export-csv', caption: 'Export CSV — opens the spreadsheet most states accept directly.', wait: 6500 },

  // ---- STEP 9: PDF button ----
  { kind: 'highlight', element_id: 'compliance-export-pdf', caption: 'Export PDF — printable version with formatting for filing or audit.', wait: 6500 },

  // ---- CLOSE ----
  { kind: 'pause', ms: 9000 },
];

// ============================================================================
// Main component
// ============================================================================
export function TreadyBubble() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tourRunning, setTourRunning] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch + watch JWT
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (alive) setAccessToken(data.session?.access_token ?? null);
    })();
    const sub = supabase.auth.onAuthStateChange((_, session) => {
      if (alive) setAccessToken(session?.access_token ?? null);
    });
    return () => {
      alive = false;
      sub.data.subscription.unsubscribe();
    };
  }, []);

  // Pre-warm the Tready edge function on bubble mount. Supabase edge fns can
  // cold-start in 1-3s; firing one cheap OPTIONS request right after JWT load
  // keeps the runtime warm so the first real chat message streams faster.
  // Fire-and-forget — never block the UI on this.
  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      void fetch(TREADY_ENDPOINT, {
        method: 'OPTIONS',
        headers: { apikey: ANON_KEY },
      }).catch(() => {
        // Pre-warm failures are silent — they'd just mean the first chat
        // pays the cold-start cost like before.
      });
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [accessToken]);

  // Autoscroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  // First-login auto-open (only if user hasn't been welcomed)
  useEffect(() => {
    if (loading || !user) return;
    const key = WELCOMED_KEY_PREFIX + user.id;
    if (localStorage.getItem(key)) return;
    const t = setTimeout(() => {
      setIsOpen(true);
      localStorage.setItem(key, new Date().toISOString());
    }, 1200);
    return () => clearTimeout(t);
  }, [loading, user]);

  // ===========================================================================
  // Character target tracking — when the tour engine fires a highlight,
  // resolve the element on screen so TreadyCharacter can lean + look at it.
  // ===========================================================================
  const [highlightTarget, setHighlightTarget] = useState<{ x: number; y: number } | null>(null);
  useEffect(() => {
    let rafId = 0;
    let activeElement: HTMLElement | null = null;

    const refresh = () => {
      if (!activeElement) return;
      const r = activeElement.getBoundingClientRect();
      setHighlightTarget({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
      rafId = requestAnimationFrame(refresh);
    };

    const onHighlight = (e: Event) => {
      const detail = (e as CustomEvent<{ element_id?: string }>).detail;
      if (!detail?.element_id) return;
      const el = document.querySelector<HTMLElement>(`[data-tready-id="${detail.element_id}"]`);
      activeElement = el;
      if (el) {
        const r = el.getBoundingClientRect();
        setHighlightTarget({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(refresh);
      } else {
        setHighlightTarget(null);
      }
    };
    const onClear = () => {
      activeElement = null;
      cancelAnimationFrame(rafId);
      setHighlightTarget(null);
    };

    window.addEventListener('tready:highlight', onHighlight as EventListener);
    window.addEventListener('tready:clear-highlight', onClear);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('tready:highlight', onHighlight as EventListener);
      window.removeEventListener('tready:clear-highlight', onClear);
    };
  }, []);

  // Derive the character state from current activity.
  const characterState: TreadyState = useMemo(() => {
    if (loading || !user) return 'hidden';
    if (tourRunning && highlightTarget) return 'pointing';
    if (tourRunning) return 'thinking';
    if (isStreaming) return 'thinking';
    return 'idle';
  }, [loading, user, tourRunning, highlightTarget, isStreaming]);

  // Listen for tready:navigate events from the navigate_to tool
  useEffect(() => {
    const onNavigate = (e: Event) => {
      const detail = (e as CustomEvent<{ path: string; reason?: string }>).detail;
      console.log('[Tready/event] tready:navigate received', detail);
      if (!detail?.path) return;
      if (detail.path === location.pathname) return;
      navigate(detail.path);
    };
    window.addEventListener('tready:navigate', onNavigate as EventListener);
    return () => window.removeEventListener('tready:navigate', onNavigate as EventListener);
  }, [navigate, location.pathname]);

  // ==========================================================================
  // sendMessage: hand-rolled SSE stream parser with verbose logging
  // ==========================================================================
  const sendMessage = useCallback(
    async (text: string) => {
      if (!accessToken) {
        setError('Not authenticated yet — wait a moment and try again.');
        return;
      }
      const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: text };
      const assistantId = crypto.randomUUID();

      const conversation = messages.map((m) => ({ role: m.role, content: m.content }));
      conversation.push({ role: 'user', content: text });

      setMessages((prev) => [...prev, userMsg, { id: assistantId, role: 'assistant', content: '' }]);
      setIsStreaming(true);
      setError(null);

      try {
        console.log('[Tready/req] sending', { sessionId, currentPage: location.pathname, turns: conversation.length });
        const response = await fetch(TREADY_ENDPOINT, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            apikey: ANON_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            session_id: sessionId,
            current_page: location.pathname,
            messages: conversation,
          }),
        });

        console.log('[Tready/req] response', { status: response.status, contentType: response.headers.get('content-type') });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errText.substring(0, 300)}`);
        }
        if (!response.body) throw new Error('No response body');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantText = '';
        let buffer = '';
        let speechBuffer = ''; // buffer for sentence-by-sentence speech

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          let nlIdx;
          while ((nlIdx = buffer.indexOf('\n\n')) !== -1) {
            const event = buffer.slice(0, nlIdx);
            buffer = buffer.slice(nlIdx + 2);

            const dataLines = event
              .split('\n')
              .filter((l) => l.startsWith('data:'))
              .map((l) => l.slice(5).trimStart());
            if (dataLines.length === 0) continue;
            const dataStr = dataLines.join('\n').trim();
            if (!dataStr || dataStr === '[DONE]') continue;

            let evt: any;
            try {
              evt = JSON.parse(dataStr);
            } catch {
              continue;
            }

            // CATCH-ALL LOGGING — see every event type
            console.log('[Tready/evt]', evt.type, evt);

            if (evt.type === 'text-delta' && typeof evt.delta === 'string') {
              assistantText += evt.delta;
              speechBuffer += evt.delta;
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, content: assistantText } : m)),
              );
            } else if (evt.type === 'tool-output-available' || evt.type === 'tool-result') {
              // Multiple possible shapes from AI SDK v5 — try them all
              const toolName = evt.toolName ?? evt.tool ?? evt.name;
              const output = evt.output ?? evt.result ?? evt.data;
              console.log('[Tready/tool]', toolName, output);

              if (toolName === 'highlight_ui' && output?.highlighted) {
                console.log('[Tready/dispatch] tready:highlight', output);
                // AUTO-CLOSE the chat panel so the highlight isn't blocked
                setIsOpen(false);
                window.dispatchEvent(
                  new CustomEvent('tready:highlight', {
                    detail: {
                      element_id: output.element_id,
                      caption: output.caption,
                      wait_for_click: output.wait_for_click,
                    },
                  }),
                );
              } else if (toolName === 'navigate_to' && output?.navigated_to) {
                console.log('[Tready/dispatch] tready:navigate', output);
                // AUTO-CLOSE the chat panel; the visual is the show
                setIsOpen(false);
                window.dispatchEvent(
                  new CustomEvent('tready:navigate', {
                    detail: { path: output.navigated_to, reason: output.reason },
                  }),
                );
              }
            } else if (evt.type === 'error') {
              throw new Error(evt.error ?? 'stream-error');
            }
          }
        }

        console.log('[Tready/req] stream done. text length:', assistantText.length);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[Tready/req] error:', msg);
        setError(msg);
        setMessages((prev) => prev.filter((m) => m.id !== assistantId || m.content));
      } finally {
        setIsStreaming(false);
      }
    },
    [accessToken, sessionId, location.pathname, messages],
  );

  const onSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const text = input.trim();
      if (!text || isStreaming) return;
      setInput('');
      void sendMessage(text);
    },
    [input, isStreaming, sendMessage],
  );

  const startTour = useCallback(() => {
    setIsOpen(false); // get the chat panel out of the way during the tour
    void runTour(WELCOME_TOUR, navigate, setTourRunning);
  }, [navigate]);

  const startDropoffTour = useCallback(() => {
    setIsOpen(false);
    void runTour(DROPOFF_TOUR, navigate, setTourRunning);
  }, [navigate]);

  const startTrailersTour = useCallback(() => {
    setIsOpen(false);
    void runTour(TRAILERS_TOUR, navigate, setTourRunning);
  }, [navigate]);

  const startManifestTour = useCallback(() => {
    setIsOpen(false);
    void runTour(MANIFEST_TOUR, navigate, setTourRunning);
  }, [navigate]);

  const startPickupTour = useCallback(() => {
    setIsOpen(false);
    void runTour(PICKUP_TOUR, navigate, setTourRunning);
  }, [navigate]);

  const startReportsTour = useCallback(() => {
    setIsOpen(false);
    void runTour(REPORTS_TOUR, navigate, setTourRunning);
  }, [navigate]);

  const startAutopilot = useCallback(() => {
    setIsOpen(false);
    const tours = [WELCOME_TOUR, DROPOFF_TOUR, TRAILERS_TOUR, MANIFEST_TOUR, PICKUP_TOUR, REPORTS_TOUR];
    void runAutopilot(navigate, setTourRunning, () => tours);
  }, [navigate]);

  // Kiosk auto-launch: any URL with ?autopilot=1 kicks the loop on auth load.
  // Click Tready to exit. Only fires once per session (autopilot itself loops
  // internally; we don't want a remount to relaunch on top of itself).
  const autopilotStartedRef = useRef(false);
  useEffect(() => {
    if (loading || !user) return;
    if (autopilotStartedRef.current) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('autopilot') !== '1') return;
    autopilotStartedRef.current = true;
    // Small delay so the page has time to render before highlights fire.
    const t = setTimeout(() => startAutopilot(), 1200);
    return () => clearTimeout(t);
  }, [loading, user, startAutopilot]);

  const toggle = useCallback(() => {
    // If a tour is running, the X / bubble button is a "stop the tour" button
    // — don't toggle the chat panel until the tour is over.
    if (tourRunning) {
      window.dispatchEvent(new CustomEvent('tready:cancel-tour'));
      return;
    }
    setIsOpen((v) => !v);
  }, [tourRunning]);

  if (loading || !user) return null;

  return (
    <>
      {/* Tready character — replaces the old green circle. Click toggles
          the chat panel; during a tour, click cancels the tour. Eyes track
          the current highlight element when a tour is pointing at something. */}
      <TreadyCharacter
        state={characterState}
        target={highlightTarget ?? undefined}
        size={80}
        position={{ right: 16, bottom: 16 }}
        onClick={toggle}
        ariaLabel={tourRunning ? 'Stop tour' : isOpen ? 'Close Tready' : 'Open Tready'}
      />

      {isOpen && (
        <div
          role="dialog"
          aria-label="Tready chat"
          style={{
            position: 'fixed',
            right: 20,
            bottom: 112,
            width: 380,
            height: 580,
            maxHeight: 'calc(100vh - 120px)',
            background: '#ffffff',
            borderRadius: 16,
            boxShadow: '0 16px 48px rgba(0,0,0,0.18), 0 4px 12px rgba(0,0,0,0.08)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 90001,
            border: '1px solid #e5e7eb',
          }}
        >
          {/* Header — voice toggle + close */}
          <div
            style={{
              padding: '12px 16px',
              background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
              color: '#fff',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: 15 }}>Tready</div>
              <div style={{ fontSize: 11, opacity: 0.85, fontWeight: 400 }}>Your TreadSet AI copilot</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                onClick={toggle}
                aria-label="Close"
                style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: 6 }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              background: '#f9fafb',
            }}
          >
            {messages.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '4px' }}>
                <div style={{ textAlign: 'center', color: '#374151', fontSize: 13, padding: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 6 }}>
                    <Sparkles size={16} color="#16a34a" />
                    <p style={{ margin: 0, fontWeight: 600, color: '#111827', fontSize: 14 }}>
                      Hi {user.email?.split('@')[0]} — I'm Tready
                    </p>
                  </div>
                  <p style={{ margin: 0, lineHeight: 1.5 }}>
                    Hands-on tutorials walk you through every TreadSet flow.
                  </p>
                </div>

                {/* Tutorials menu — pick a hands-on walkthrough */}
                <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, padding: '8px 4px 0' }}>
                  Tutorials
                </div>

                {/* The first deep tour — actually creates a client */}
                <button
                  type="button"
                  onClick={startTour}
                  disabled={tourRunning}
                  style={{
                    background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 12,
                    padding: '14px 16px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: tourRunning ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    boxShadow: '0 4px 12px rgba(22,163,74,0.3)',
                    opacity: tourRunning ? 0.6 : 1,
                    textAlign: 'left',
                  }}
                >
                  <Play size={16} fill="#fff" style={{ marginTop: 2, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div>{tourRunning ? 'Tour running…' : 'Add Your First Client'}</div>
                    <div style={{ fontSize: 11, opacity: 0.85, fontWeight: 400, marginTop: 2 }}>
                      Hands-on, ~3 minutes. Walks you through every field.
                    </div>
                  </div>
                </button>

                {/* Drop-off tour — second shipped deep tour */}
                <button
                  type="button"
                  onClick={startDropoffTour}
                  disabled={tourRunning}
                  style={{
                    background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 12,
                    padding: '14px 16px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: tourRunning ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    boxShadow: '0 4px 12px rgba(22,163,74,0.3)',
                    opacity: tourRunning ? 0.6 : 1,
                    textAlign: 'left',
                  }}
                >
                  <Play size={16} fill="#fff" style={{ marginTop: 2, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div>{tourRunning ? 'Tour running…' : 'Process a Drop-off'}</div>
                    <div style={{ fontSize: 11, opacity: 0.85, fontWeight: 400, marginTop: 2 }}>
                      Hands-on, ~3 minutes. Walks the wizard end to end.
                    </div>
                  </div>
                </button>

                {/* Trailers tour — third shipped deep tour */}
                <button
                  type="button"
                  onClick={startTrailersTour}
                  disabled={tourRunning}
                  style={{
                    background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 12,
                    padding: '14px 16px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: tourRunning ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    boxShadow: '0 4px 12px rgba(22,163,74,0.3)',
                    opacity: tourRunning ? 0.6 : 1,
                    textAlign: 'left',
                  }}
                >
                  <Play size={16} fill="#fff" style={{ marginTop: 2, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div>{tourRunning ? 'Tour running…' : 'Manage Trailers'}</div>
                    <div style={{ fontSize: 11, opacity: 0.85, fontWeight: 400, marginTop: 2 }}>
                      Hands-on, ~2 minutes. Tours the four trailer sub-pages.
                    </div>
                  </div>
                </button>

                {/* Manifest tour — fourth shipped deep tour */}
                <button
                  type="button"
                  onClick={startManifestTour}
                  disabled={tourRunning}
                  style={{
                    background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 12,
                    padding: '14px 16px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: tourRunning ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    boxShadow: '0 4px 12px rgba(22,163,74,0.3)',
                    opacity: tourRunning ? 0.6 : 1,
                    textAlign: 'left',
                  }}
                >
                  <Play size={16} fill="#fff" style={{ marginTop: 2, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div>{tourRunning ? 'Tour running…' : 'Sign Your First Manifest'}</div>
                    <div style={{ fontSize: 11, opacity: 0.85, fontWeight: 400, marginTop: 2 }}>
                      Hands-on, ~3 minutes. Walks the 7-step driver wizard end to end.
                    </div>
                  </div>
                </button>

                {/* Pickup tour — fifth shipped deep tour */}
                <button
                  type="button"
                  onClick={startPickupTour}
                  disabled={tourRunning}
                  style={{
                    background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 12,
                    padding: '14px 16px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: tourRunning ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    boxShadow: '0 4px 12px rgba(22,163,74,0.3)',
                    opacity: tourRunning ? 0.6 : 1,
                    textAlign: 'left',
                  }}
                >
                  <Play size={16} fill="#fff" style={{ marginTop: 2, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div>{tourRunning ? 'Tour running…' : 'Schedule Your First Pickup'}</div>
                    <div style={{ fontSize: 11, opacity: 0.85, fontWeight: 400, marginTop: 2 }}>
                      Hands-on, ~3 minutes. Walks the form end to end.
                    </div>
                  </div>
                </button>

                {/* Reports tour — sixth (final) shipped deep tour */}
                <button
                  type="button"
                  onClick={startReportsTour}
                  disabled={tourRunning}
                  style={{
                    background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 12,
                    padding: '14px 16px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: tourRunning ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    boxShadow: '0 4px 12px rgba(22,163,74,0.3)',
                    opacity: tourRunning ? 0.6 : 1,
                    textAlign: 'left',
                  }}
                >
                  <Play size={16} fill="#fff" style={{ marginTop: 2, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div>{tourRunning ? 'Tour running…' : 'Generate a Compliance Report'}</div>
                    <div style={{ fontSize: 11, opacity: 0.85, fontWeight: 400, marginTop: 2 }}>
                      Hands-on, ~2 minutes. Tours the compliance report end to end.
                    </div>
                  </div>
                </button>

                {/* Autopilot — loops every tour for a tradeshow display */}
                <button
                  type="button"
                  onClick={startAutopilot}
                  disabled={tourRunning}
                  style={{
                    background: 'linear-gradient(135deg, hsl(212,70%,52%) 0%, hsl(212,70%,40%) 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 12,
                    padding: '12px 16px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: tourRunning ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    boxShadow: '0 4px 12px rgba(37,99,235,0.30)',
                    opacity: tourRunning ? 0.6 : 1,
                    textAlign: 'left',
                    marginTop: 4,
                  }}
                >
                  <Play size={16} fill="#fff" style={{ marginTop: 2, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div>{tourRunning ? 'Autopilot running…' : 'Run every tour (Autopilot)'}</div>
                    <div style={{ fontSize: 11, opacity: 0.85, fontWeight: 400, marginTop: 2 }}>
                      Loops all six tours back-to-back. Tap me to stop. Or add <code>?autopilot=1</code> to any URL.
                    </div>
                  </div>
                </button>

                <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, padding: '12px 4px 0' }}>
                  Or ask anything
                </div>
                {[
                  "What's on my dashboard today?",
                  'Find a client called Mountain',
                  'How many pickups did we do this week?',
                ].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => sendMessage(s)}
                    disabled={!accessToken || isStreaming}
                    style={{
                      textAlign: 'left',
                      background: '#fff',
                      border: '1px solid #d1d5db',
                      borderRadius: 10,
                      padding: '8px 12px',
                      fontSize: 12,
                      color: '#374151',
                      cursor: accessToken && !isStreaming ? 'pointer' : 'not-allowed',
                      transition: 'all 120ms ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f0fdf4';
                      e.currentTarget.style.borderColor = '#16a34a';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#fff';
                      e.currentTarget.style.borderColor = '#d1d5db';
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}
            {isStreaming && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6b7280', fontSize: 12 }}>
                <Loader2 size={14} className="animate-spin" /> Tready is thinking…
              </div>
            )}
            {error && (
              <div
                style={{
                  background: '#fee2e2',
                  color: '#991b1b',
                  padding: 10,
                  borderRadius: 8,
                  fontSize: 12,
                  border: '1px solid #fecaca',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                <strong>Tready error:</strong> {error}
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={onSubmit}
            style={{
              padding: 12,
              borderTop: '1px solid #e5e7eb',
              background: '#fff',
              display: 'flex',
              gap: 8,
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={accessToken ? 'Ask Tready…' : 'Loading session…'}
              disabled={isStreaming}
              style={{
                flex: 1,
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: 10,
                fontSize: 14,
                outline: 'none',
                background: accessToken ? '#fff' : '#f3f4f6',
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              style={{
                padding: '0 14px',
                borderRadius: 10,
                background: '#16a34a',
                color: '#fff',
                border: 'none',
                cursor: input.trim() && !isStreaming ? 'pointer' : 'not-allowed',
                opacity: input.trim() && !isStreaming ? 1 : 0.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 44,
              }}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}

// Typewriter — reveals chars at a measured pace (~22ms each) regardless of
// how fast the upstream text actually streams. Gives the JARVIS feel where
// Tready appears to be thinking + typing.
function useTypewriter(target: string, speedMs = 22): string {
  const [shown, setShown] = useState('');
  useEffect(() => {
    // If target shrunk below shown (re-render edge case), snap to target
    if (target.length <= shown.length) {
      setShown(target);
      return;
    }
    // Reveal one char at a time
    const t = setTimeout(() => {
      setShown(target.slice(0, shown.length + 1));
    }, speedMs);
    return () => clearTimeout(t);
  }, [target, shown, speedMs]);
  return shown;
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  // Only typewriter for assistant messages
  const displayText = isUser ? message.content : useTypewriter(message.content, 22);
  const isCaughtUp = displayText === message.content;

  return (
    <div
      style={{
        alignSelf: isUser ? 'flex-end' : 'flex-start',
        maxWidth: '85%',
        background: isUser ? '#16a34a' : '#ffffff',
        color: isUser ? '#fff' : '#111827',
        padding: '8px 12px',
        borderRadius: 14,
        fontSize: 13,
        lineHeight: 1.45,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        boxShadow: isUser ? 'none' : '0 1px 2px rgba(0,0,0,0.06)',
        border: isUser ? 'none' : '1px solid #f3f4f6',
      }}
    >
      {displayText || (isUser ? '' : '...')}
      {!isUser && !isCaughtUp && (
        // Blinking cursor while typing
        <span
          style={{
            display: 'inline-block',
            width: 2,
            height: '1em',
            background: '#16a34a',
            verticalAlign: 'text-bottom',
            marginLeft: 2,
            animation: 'tready-cursor-blink 1s step-end infinite',
          }}
        />
      )}
      <style>{`
        @keyframes tready-cursor-blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
