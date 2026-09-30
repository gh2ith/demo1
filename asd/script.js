/**
 * ============================================================================
 * BRIDGEWAY HR MANAGEMENT SYSTEM — SAAS GUEST LANDING ENGINE (script.js)
 * ============================================================================
 * Presentation-only script managing video recovery, dashboard showcase tabs,
 * workflow stepper animations, mobile navigation drawer, and scroll states.
 * 
 * STRICT PRIVACY & INTEGRATION BOUNDARIES:
 * - ZERO auth touch: Does not manipulate credentials, tokens, or redirects.
 * - ZERO storage access: Does not read or write localStorage/sessionStorage.
 * ============================================================================
 */

(function () {
  'use strict';

  // --------------------------------------------------------------------------
  // 1. VIDEO AUTOPLAY RECOVERY
  // --------------------------------------------------------------------------
  function initVideoAutoplay(videoElement) {
    if (!videoElement) return;

    const playAttempt = () => {
      videoElement.muted = true;
      const playPromise = videoElement.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Autoplay blocked by browser policy until user gesture; silently ignore
        });
      }
    };

    playAttempt();

    // Secondary recovery triggers
    document.addEventListener('click', playAttempt, { once: true });
    document.addEventListener('touchstart', playAttempt, { once: true });
    window.addEventListener('focus', playAttempt);
  }

  const heroVideo = document.getElementById('heroVideo');
  const aboutVideo = document.getElementById('aboutVideo');

  initVideoAutoplay(heroVideo);
  initVideoAutoplay(aboutVideo);

  // --------------------------------------------------------------------------
  // 2. NAVBAR SCROLL DYNAMICS & SHADOW
  // --------------------------------------------------------------------------
  const siteHeader = document.getElementById('siteHeader');

  function handleNavbarScroll() {
    if (!siteHeader) return;
    if (window.scrollY > 40) {
      siteHeader.classList.add('scrolled');
    } else {
      siteHeader.classList.remove('scrolled');
    }
  }

  window.addEventListener('scroll', handleNavbarScroll, { passive: true });
  handleNavbarScroll();

  // --------------------------------------------------------------------------
  // 3. MOBILE NAVIGATION DRAWER
  // --------------------------------------------------------------------------
  const hamburgerToggle = document.getElementById('hamburgerToggle');
  const mobileDrawer = document.getElementById('mobileDrawer');
  const drawerLinks = document.querySelectorAll('.drawer-link');

  function openDrawer() {
    if (!hamburgerToggle || !mobileDrawer) return;
    hamburgerToggle.setAttribute('aria-expanded', 'true');
    mobileDrawer.setAttribute('aria-hidden', 'false');
    mobileDrawer.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    if (!hamburgerToggle || !mobileDrawer) return;
    hamburgerToggle.setAttribute('aria-expanded', 'false');
    mobileDrawer.setAttribute('aria-hidden', 'true');
    mobileDrawer.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  if (hamburgerToggle) {
    hamburgerToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isExpanded = hamburgerToggle.getAttribute('aria-expanded') === 'true';
      if (isExpanded) {
        closeDrawer();
      } else {
        openDrawer();
      }
    });
  }

  drawerLinks.forEach((link) => {
    link.addEventListener('click', () => {
      closeDrawer();
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && hamburgerToggle && hamburgerToggle.getAttribute('aria-expanded') === 'true') {
      closeDrawer();
      hamburgerToggle.focus();
    }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
      closeDrawer();
    }
  });

  // --------------------------------------------------------------------------
  // 4. ACTIVE NAVIGATION LINK TRACKING
  // --------------------------------------------------------------------------
  const navItems = document.querySelectorAll('.nav-item');
  const sections = [
    document.getElementById('home'),
    document.getElementById('problem'),
    document.getElementById('system'),
    document.getElementById('hr-features'),
    document.getElementById('employee-features'),
    document.getElementById('task-flow'),
    document.getElementById('about')
  ].filter(Boolean);

  function updateActiveNavLink() {
    const scrollPos = window.scrollY + 160;

    sections.forEach((sec) => {
      const top = sec.offsetTop;
      const height = sec.offsetHeight;
      const id = sec.getAttribute('id');

      if (scrollPos >= top && scrollPos < top + height) {
        navItems.forEach((item) => {
          if (item.getAttribute('href') === `#${id}`) {
            item.classList.add('active');
          } else {
            item.classList.remove('active');
          }
        });
      }
    });
  }

  window.addEventListener('scroll', updateActiveNavLink, { passive: true });

  // --------------------------------------------------------------------------
  // 5. INTERACTIVE DASHBOARD SHOWCASE TABS
  // --------------------------------------------------------------------------
  const tabButtons = document.querySelectorAll('.tab-btn');
  const mockupViews = document.querySelectorAll('.mockup-view');
  const featureCallouts = document.querySelectorAll('.feature-callout');

  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const tabTarget = btn.getAttribute('data-tab');

      // Update active state on tab buttons
      tabButtons.forEach((b) => {
        const isActive = b === btn;
        b.classList.toggle('active', isActive);
        b.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });

      // Show matching canvas view
      mockupViews.forEach((view) => {
        if (view.id === `view-${tabTarget}`) {
          view.classList.add('active');
        } else {
          view.classList.remove('active');
        }
      });
    });
  });

  // Interactive Callout highlights
  featureCallouts.forEach((callout) => {
    callout.addEventListener('mouseenter', () => {
      const targetArea = callout.getAttribute('data-highlight');
      const targetCard = document.querySelector(`.metric-card[data-area="${targetArea}"]`);
      if (targetCard) {
        targetCard.style.borderColor = '#0079F1';
        targetCard.style.boxShadow = '0 0 16px rgba(0, 121, 241, 0.25)';
      }
    });

    callout.addEventListener('mouseleave', () => {
      const targetArea = callout.getAttribute('data-highlight');
      const targetCard = document.querySelector(`.metric-card[data-area="${targetArea}"]`);
      if (targetCard) {
        targetCard.style.borderColor = '#E2E8F0';
        targetCard.style.boxShadow = 'none';
      }
    });

    // Clicking callout switches to relevant tab
    callout.addEventListener('click', () => {
      const targetArea = callout.getAttribute('data-highlight');
      const matchingTab = document.querySelector(`.tab-btn[data-tab="${targetArea}"]`);
      if (matchingTab) {
        matchingTab.click();
      }
    });
  });

  // --------------------------------------------------------------------------
  // 6. TASK WORKFLOW PROGRESS TRACKER
  // --------------------------------------------------------------------------
  const workflowSection = document.getElementById('task-flow');
  const workflowProgressFill = document.getElementById('workflowProgressFill');

  function updateWorkflowProgress() {
    if (!workflowSection || !workflowProgressFill) return;
    const rect = workflowSection.getBoundingClientRect();
    const windowH = window.innerHeight;

    if (rect.top <= windowH && rect.bottom >= 0) {
      const progress = Math.min(100, Math.max(0, ((windowH - rect.top) / (rect.height + windowH)) * 100));
      workflowProgressFill.style.width = `${progress}%`;
    }
  }

  window.addEventListener('scroll', updateWorkflowProgress, { passive: true });

  // --------------------------------------------------------------------------
  // 7. LEAVE MANAGEMENT DEMO ACTION INTERACTION
  // --------------------------------------------------------------------------
  const btnApproveDemo = document.querySelector('.btn-approve-demo');
  const btnRejectDemo = document.querySelector('.btn-reject-demo');
  const leaveStatusPill = document.querySelector('.lc-status-pill');

  if (btnApproveDemo && leaveStatusPill) {
    btnApproveDemo.addEventListener('click', () => {
      leaveStatusPill.textContent = 'APPROVED BY HR ADMIN';
      leaveStatusPill.className = 'lc-status-pill status-approved';
    });
  }

  if (btnRejectDemo && leaveStatusPill) {
    btnRejectDemo.addEventListener('click', () => {
      leaveStatusPill.textContent = 'REVISION REQUESTED';
      leaveStatusPill.style.background = '#FEE2E2';
      leaveStatusPill.style.color = '#B91C1C';
    });
  }

  // --------------------------------------------------------------------------
  // 8. SEQUENTIAL REVEAL ON SCROLL (IntersectionObserver)
  // --------------------------------------------------------------------------
  const revealItems = document.querySelectorAll('.activity-card, .feature-row-item, .step-card, .pf-card');

  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
          revealObserver.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -50px 0px', threshold: 0.1 });

    revealItems.forEach((item) => {
      item.style.opacity = '0';
      item.style.transform = 'translateY(16px)';
      item.style.transition = 'opacity 0.45s ease, transform 0.45s ease, border-color 0.2s ease, box-shadow 0.2s ease';
      revealObserver.observe(item);
    });
  }

})();
