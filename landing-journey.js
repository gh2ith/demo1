/**
 * ============================================================================
 * HR MANAGEMENT SYSTEM — SCROLL-CONTROLLED JOURNEY ENGINE (landing-journey.js)
 * 9-Stop Structured Continuous Road Journey with Individual Service Destinations
 * ============================================================================
 * Presentation-only script managing the fixed road world, traveler tangent,
 * camera focal tracking, 9-stop dwell/travel phases, and lifecycle cleanup.
 *
 * STRICT BOUNDARIES:
 * - ZERO auth touch: Self-contained presentation-only portal overview stop
 * - ZERO storage access: Does not read or write localStorage/sessionStorage
 * ============================================================================
 */

(function () {
  'use strict';

  // --------------------------------------------------------------------------
  // 0. STOP CONFIGURATION & LABELS (9 SECTIONS)
  // --------------------------------------------------------------------------
  const STOP_NAMES = [
    'Home',
    'About',
    'Leave',
    'Employees',
    'Policies',
    'Tasks',
    'Feedback',
    'Stats',
    'Contact'
  ];

  const TOTAL_STOPS = STOP_NAMES.length; // 9
  const TOTAL_INTERVALS = TOTAL_STOPS - 1; // 8 intervals: 0 to 8

  // State
  let masterScrollTrigger = null;
  let roadPath = null;
  let roadTrail = null;
  let traveler = null;
  let worldWrapper = null;
  let stopPanels = [];
  let sideStepLinks = [];
  let navMenuLinks = [];
  let roadNodes = [];
  let mobileCounter = null;
  let nextHintText = null;
  let ariaAnnouncer = null;
  let connectorSvg = null;
  let connectorLine = null;
  let connectorCardPip = null;
  let connectorNodePip = null;
  let roadTotalLength = 0;
  let currentActiveStop = -1;
  let isMounted = false;

  // --------------------------------------------------------------------------
  // 1. PATH PRE-COMPUTATION & EXACT 9-NODE ARC LENGTHS
  // --------------------------------------------------------------------------
  // Precomputed exact node arc lengths along the SVG path to guarantee
  // that the traveler and glowing progress trail land dead-center on each stop dot.
  const BASE_NODE_DISTANCES = [
    0.0,      // Stop 1: Start / Home (1000, 400)
    955.84,   // Stop 2: About (1450, 1150)
    1876.85,  // Stop 3: Leave Application (1200, 1950)
    3057.74,  // Stop 4: View Employees Information (550, 2750)
    3901.00,  // Stop 5: Company Policies (750, 3550)
    5012.14,  // Stop 6: Task Management (1400, 4350)
    5960.76,  // Stop 7: Feedback System (1100, 5150)
    7043.50,  // Stop 8: Stats (600, 5950)
    7903.56   // Stop 9: Contact / Destination (1000, 6700)
  ];
  const BASE_TOTAL_LENGTH = 7903.56;

  let nodeDistances = [...BASE_NODE_DISTANCES];

  function cachePathDimensions() {
    if (!roadPath) return;
    roadTotalLength = roadPath.getTotalLength();

    // Scale node distances proportionally to match exact runtime roadTotalLength
    const scale = roadTotalLength > 0 ? (roadTotalLength / BASE_TOTAL_LENGTH) : 1;
    nodeDistances = BASE_NODE_DISTANCES.map(d => d * scale);

    if (roadTrail) {
      roadTrail.style.strokeDasharray = `${roadTotalLength} ${roadTotalLength}`;
      roadTrail.style.strokeDashoffset = `${roadTotalLength}`;
    }
  }

  // Piece-wise interpolation between exact node arc lengths:
  // Maps scroll progress [0..1] directly across the 8 stop intervals [0..8],
  // guaranteeing that progress = stopIndex / 8 lands EXACTLY on nodeDistances[stopIndex].
  function getDistanceAtProgress(progress) {
    const p = Math.max(0, Math.min(1, progress));
    const exactStop = p * TOTAL_INTERVALS; // 0.0 to 8.0
    const intervalIdx = Math.min(TOTAL_INTERVALS - 1, Math.floor(exactStop));
    const ratio = exactStop - intervalIdx; // 0.0 to 1.0 within interval

    const d0 = nodeDistances[intervalIdx];
    const d1 = nodeDistances[intervalIdx + 1];

    return d0 + ratio * (d1 - d0);
  }

  // --------------------------------------------------------------------------
  // 2. CAMERA & TRAVELER SCENERY SCRUBBER
  // --------------------------------------------------------------------------
  function updateJourney(progress) {
    if (!roadPath || !traveler || !worldWrapper) return;

    // Clamp progress & calculate exact road distance
    const p = Math.max(0, Math.min(1, progress));
    const currentDist = getDistanceAtProgress(p);

    // 1. Get Traveler Coordinates & Heading Tangent (symmetric difference)
    const pt = roadPath.getPointAtLength(currentDist);
    const aheadDist = Math.min(currentDist + 4, roadTotalLength);
    const behindDist = Math.max(currentDist - 4, 0);
    const ptAhead = roadPath.getPointAtLength(aheadDist);
    const ptBehind = roadPath.getPointAtLength(behindDist);

    const deltaX = ptAhead.x - ptBehind.x;
    const deltaY = ptAhead.y - ptBehind.y;
    const angleRad = Math.atan2(deltaY, deltaX);
    const angleDeg = (angleRad * 180) / Math.PI;

    // 2. Camera Focal Point
    const isMobile = window.innerWidth <= 768;
    const focalX = window.innerWidth * 0.50;
    const baseFocalY = window.innerHeight * (isMobile ? 0.72 : 0.65);

    // As traveler approaches the final Destination (Stop 7 to 8, progress 0.875 to 1.0),
    // smoothly adjust focalY so the road naturally leads downward into the final destination
    // card, positioning the end of the road at the top center with the destination card below it.
    let focalY = baseFocalY;
    const finalIntervalStart = (TOTAL_STOPS - 2) / TOTAL_INTERVALS; // 7/8 = 0.875
    if (p > finalIntervalStart) {
      const t = (p - finalIntervalStart) / (1 - finalIntervalStart);
      const easeT = t * t * (3 - 2 * t); // Smooth cubic ease
      const destFocalY = window.innerHeight * (isMobile ? 0.16 : 0.19);
      focalY = baseFocalY + (destFocalY - baseFocalY) * easeT;
    }

    // 3. Move World beneath Traveler
    const transX = focalX - pt.x;
    const transY = focalY - pt.y;

    // Rock-solid camera translation with zero rotation/tilt
    worldWrapper.style.transform = `translate3d(${transX.toFixed(1)}px, ${transY.toFixed(1)}px, 0px)`;

    // 4. Position & Rotate Traveler (centered dead-on node)
    traveler.style.transform = `translate3d(${pt.x.toFixed(1)}px, ${pt.y.toFixed(1)}px, 0px) rotate(${(angleDeg - 90).toFixed(1)}deg)`;

    // 5. Update Glowing Road Trail (ends exactly at traveler position)
    if (roadTrail) {
      roadTrail.style.strokeDashoffset = `${Math.max(0, roadTotalLength - currentDist).toFixed(1)}`;
    }

    // 6. Stop Phase & Dwell/Travel Logic (8 intervals)
    const exactStopIndex = p * TOTAL_INTERVALS;
    const nearestStopIndex = Math.round(exactStopIndex);
    const stopCenterProgress = nearestStopIndex / TOTAL_INTERVALS;
    const distFromStop = Math.abs(p - stopCenterProgress);

    // Dwell threshold: within ~62% of the stop slot
    const isDwelling = distFromStop <= (0.62 / (TOTAL_INTERVALS * 2));

    // Update Active Stop
    if (nearestStopIndex !== currentActiveStop) {
      currentActiveStop = nearestStopIndex;
      onStopChange(currentActiveStop);
    }

    // Handle Content Transitions & Directional Movement
    stopPanels.forEach((panel, idx) => {
      if (idx === nearestStopIndex) {
        if (isDwelling) {
          panel.classList.add('is-active');
          panel.removeAttribute('inert');
          panel.setAttribute('aria-hidden', 'false');
        } else {
          // Exiting/transitioning
          panel.classList.remove('is-active');
        }
      } else {
        panel.classList.remove('is-active');
        panel.setAttribute('inert', '');
        panel.setAttribute('aria-hidden', 'true');
      }
    });

    // 7. Update dynamic full-span connector (Card edge to Road Node)
    updateConnector(nearestStopIndex, isDwelling);

    // Update Node visual classes on road (completed, active, upcoming)
    roadNodes.forEach((nodeEl, idx) => {
      nodeEl.classList.remove('active', 'completed');
      if (idx < nearestStopIndex) {
        nodeEl.classList.add('completed');
      } else if (idx === nearestStopIndex) {
        nodeEl.classList.add('active');
      }
    });

    // Fade "Scroll to explore" on Stop 1
    const startHint = document.getElementById('startScrollHint');
    if (startHint) {
      startHint.style.opacity = p > 0.03 ? '0' : '1';
    }
  }

  // --------------------------------------------------------------------------
  // 3. STOP CHANGE DISPATCHER & ACCESSIBILITY
  // --------------------------------------------------------------------------
  function onStopChange(stopIndex) {
    // 1. Side Nav indicators (9 items)
    sideStepLinks.forEach((link, idx) => {
      if (idx === stopIndex) {
        link.setAttribute('aria-current', 'step');
      } else {
        link.removeAttribute('aria-current');
      }
    });

    // 2. Top Header Nav Links (Home, About, Services, Stats, Contact)
    navMenuLinks.forEach((link) => {
      link.classList.remove('active');
      const jumpVal = parseInt(link.getAttribute('data-jump'), 10);
      if (jumpVal === 0 && stopIndex === 0) {
        link.classList.add('active');
      } else if (jumpVal === 1 && stopIndex === 1) {
        link.classList.add('active');
      } else if (jumpVal === 2 && stopIndex >= 2 && stopIndex <= 6) {
        // Services spans stops 2 through 6
        link.classList.add('active');
      } else if (jumpVal === 7 && stopIndex === 7) {
        link.classList.add('active');
      } else if (jumpVal === 8 && stopIndex === 8) {
        link.classList.add('active');
      }
    });

    // 3. Mobile Counter (01 / 09 · StopName)
    if (mobileCounter) {
      mobileCounter.textContent = `0${stopIndex + 1} / 0${TOTAL_STOPS} · ${STOP_NAMES[stopIndex]}`;
    }

    // 4. Next Stop Hint
    if (nextHintText) {
      if (stopIndex < TOTAL_STOPS - 1) {
        nextHintText.textContent = `NEXT: STOP 0${stopIndex + 2} — ${STOP_NAMES[stopIndex + 1].toUpperCase()}`;
      } else {
        nextHintText.textContent = `JOURNEY COMPLETE · CONTACT & MAP`;
      }
    }

    // 5. Polite Screen Reader Announcement
    if (ariaAnnouncer) {
      ariaAnnouncer.textContent = `Arrived at Stop ${stopIndex + 1} of ${TOTAL_STOPS}: ${STOP_NAMES[stopIndex]}`;
    }
  }

  // --------------------------------------------------------------------------
  // 4. DYNAMIC ROAD CONNECTOR (CARD ─────── ● NODE)
  // --------------------------------------------------------------------------
  function updateConnector(stopIndex, isDwelling) {
    if (!connectorSvg || !connectorLine || !connectorCardPip || !connectorNodePip) return;

    if (!isDwelling || window.innerWidth <= 768) {
      connectorLine.style.opacity = '0';
      connectorCardPip.style.opacity = '0';
      connectorNodePip.style.opacity = '0';
      return;
    }

    const panel = stopPanels[stopIndex];
    const nodeEl = roadNodes[stopIndex];
    if (!panel || !nodeEl) return;

    const cardRect = panel.getBoundingClientRect();
    const nodeRect = nodeEl.getBoundingClientRect();
    const nX = nodeRect.left + nodeRect.width / 2;
    const nY = nodeRect.top + nodeRect.height / 2;

    let cX, cY, tX, tY, d;

    if (panel.classList.contains('pos-left')) {
      cX = cardRect.right;
      cY = cardRect.top + cardRect.height * 0.50;
      tX = nX - 22; // meet node outer ring
      tY = nY;
      const midX = (cX + tX) / 2;
      d = `M ${cX.toFixed(1)} ${cY.toFixed(1)} C ${midX.toFixed(1)} ${cY.toFixed(1)}, ${midX.toFixed(1)} ${tY.toFixed(1)}, ${tX.toFixed(1)} ${tY.toFixed(1)}`;
    } else if (panel.classList.contains('pos-right')) {
      cX = cardRect.left;
      cY = cardRect.top + cardRect.height * 0.50;
      tX = nX + 22; // meet node outer ring
      tY = nY;
      const midX = (cX + tX) / 2;
      d = `M ${cX.toFixed(1)} ${cY.toFixed(1)} C ${midX.toFixed(1)} ${cY.toFixed(1)}, ${midX.toFixed(1)} ${tY.toFixed(1)}, ${tX.toFixed(1)} ${tY.toFixed(1)}`;
    } else {
      // pos-center (Stop 8: Contact / Destination)
      // Connect vertically from bottom of Node 8 into top center of Destination card
      cX = cardRect.left + cardRect.width * 0.5;
      cY = cardRect.top;
      tX = nX;
      tY = nY + 26; // meet node bottom ring
      d = `M ${tX.toFixed(1)} ${tY.toFixed(1)} L ${cX.toFixed(1)} ${cY.toFixed(1)}`;
    }

    connectorLine.setAttribute('d', d);
    connectorCardPip.setAttribute('cx', cX.toFixed(1));
    connectorCardPip.setAttribute('cy', cY.toFixed(1));
    connectorNodePip.setAttribute('cx', tX.toFixed(1));
    connectorNodePip.setAttribute('cy', tY.toFixed(1));

    connectorLine.style.opacity = '1';
    connectorCardPip.style.opacity = '1';
    connectorNodePip.style.opacity = '1';
  }

  // --------------------------------------------------------------------------
  // 5. SMOOTH NAVIGATION TO SPECIFIC STOP
  // --------------------------------------------------------------------------
  function scrollToStop(stopIndex) {
    const targetProgress = Math.max(0, Math.min(TOTAL_STOPS - 1, stopIndex)) / TOTAL_INTERVALS;
    const spacer = document.getElementById('journeyScrollSpacer');
    if (!spacer) return;

    const maxScroll = spacer.offsetHeight - window.innerHeight;
    const targetY = targetProgress * maxScroll;

    window.scrollTo({
      top: targetY,
      behavior: 'smooth'
    });
  }

  // --------------------------------------------------------------------------
  // 6. KEYBOARD NAVIGATION
  // --------------------------------------------------------------------------
  function handleKeyboard(e) {
    // Avoid hijacking when inside an interactive form element
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT')) {
      return;
    }

    if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
      if (currentActiveStop < TOTAL_STOPS - 1) {
        e.preventDefault();
        scrollToStop(currentActiveStop + 1);
      }
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      if (currentActiveStop > 0) {
        e.preventDefault();
        scrollToStop(currentActiveStop - 1);
      }
    } else if (e.key === 'Home') {
      e.preventDefault();
      scrollToStop(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      scrollToStop(TOTAL_STOPS - 1);
    }
  }

  // --------------------------------------------------------------------------
  // 7. QUICK JUMP LINK HANDLERS
  // --------------------------------------------------------------------------
  function initJumpLinks() {
    document.querySelectorAll('[data-jump]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const targetIndex = parseInt(el.getAttribute('data-jump'), 10);
        if (!isNaN(targetIndex)) {
          scrollToStop(targetIndex);
        }
      });
    });
  }

  // --------------------------------------------------------------------------
  // 8. INITIALIZE JOURNEY (MOUNT LIFECYCLE)
  // --------------------------------------------------------------------------
  function initJourney() {
    if (isMounted) return;

    // Cache DOM Elements
    roadPath = document.getElementById('journeyRoadPath');
    roadTrail = document.getElementById('journeyRoadTrail');
    traveler = document.getElementById('journeyTraveler');
    worldWrapper = document.getElementById('journeyWorld');
    mobileCounter = document.getElementById('mobileProgressPill');
    nextHintText = document.getElementById('nextStopHintText');
    ariaAnnouncer = document.getElementById('journeyAnnouncer');

    stopPanels = Array.from(document.querySelectorAll('.stop-panel'));
    sideStepLinks = Array.from(document.querySelectorAll('.side-step-link'));
    navMenuLinks = Array.from(document.querySelectorAll('.nav-menu-link'));
    roadNodes = Array.from(document.querySelectorAll('.road-node'));
    connectorSvg = document.getElementById('journeyConnectorSvg');
    connectorLine = document.getElementById('connectorRoadLine');
    connectorCardPip = document.getElementById('connectorCardPip');
    connectorNodePip = document.getElementById('connectorNodePip');

    if (!roadPath || !traveler || !worldWrapper) {
      console.warn('Journey elements not found; using fallback view.');
      return;
    }

    cachePathDimensions();

    // Register Click Handlers on Road Nodes and Side Nav
    sideStepLinks.forEach((link, idx) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        scrollToStop(idx);
      });
    });

    roadNodes.forEach((nodeEl, idx) => {
      nodeEl.addEventListener('click', (e) => {
        e.preventDefault();
        scrollToStop(idx);
      });
    });

    // Start Journey CTA button on Stop 0
    const beginBtn = document.getElementById('beginJourneyBtn');
    if (beginBtn) {
      beginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        scrollToStop(1);
      });
    }

    // Back to Start CTA button on Stop 8
    const restartBtn = document.getElementById('restartJourneyBtn');
    if (restartBtn) {
      restartBtn.addEventListener('click', (e) => {
        e.preventDefault();
        scrollToStop(0);
      });
    }

    // Initialize Jump Links
    initJumpLinks();

    // Attach Keyboard Listener
    window.addEventListener('keydown', handleKeyboard);

    // Initialize GSAP + ScrollTrigger for 9 stops (8 intervals)
    if (window.gsap && window.ScrollTrigger) {
      window.gsap.registerPlugin(window.ScrollTrigger);

      masterScrollTrigger = window.ScrollTrigger.create({
        trigger: '#journeyScrollSpacer',
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.8,
        snap: {
          snapTo: 1 / TOTAL_INTERVALS,
          duration: { min: 0.2, max: 0.45 },
          ease: 'power1.inOut'
        },
        onUpdate: (self) => {
          updateJourney(self.progress);
        }
      });
    } else {
      // Fallback: Use standard scroll event listener
      const scrollHandler = () => {
        const spacer = document.getElementById('journeyScrollSpacer');
        if (!spacer) return;
        const maxScroll = spacer.offsetHeight - window.innerHeight;
        const progress = maxScroll > 0 ? window.scrollY / maxScroll : 0;
        updateJourney(progress);
      };
      window.addEventListener('scroll', scrollHandler, { passive: true });
    }

    // Initial render at progress 0
    updateJourney(0);
    isMounted = true;
  }

  // --------------------------------------------------------------------------
  // 9. DESTROY JOURNEY (UNMOUNT LIFECYCLE)
  // --------------------------------------------------------------------------
  function destroyJourney() {
    if (!isMounted) return;

    if (masterScrollTrigger) {
      masterScrollTrigger.kill();
      masterScrollTrigger = null;
    }

    window.removeEventListener('keydown', handleKeyboard);
    isMounted = false;
  }

  // Auto-init on DOM Ready & Cleanup on Page Navigation
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initJourney);
  } else {
    initJourney();
  }

  window.addEventListener('resize', () => {
    cachePathDimensions();
    if (currentActiveStop >= 0) {
      updateConnector(currentActiveStop, true);
    }
    if (masterScrollTrigger) {
      masterScrollTrigger.refresh();
    }
  });

  window.addEventListener('pagehide', destroyJourney);
  window.addEventListener('beforeunload', destroyJourney);

})();
