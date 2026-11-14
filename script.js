const pageLoader = document.querySelector(".page-loader");
if (pageLoader) {
  const reduceLoaderMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pageReady = document.readyState === "complete"
    ? Promise.resolve()
    : new Promise((resolve) => window.addEventListener("load", resolve, { once: true }));
  const logoImagesReady = Promise.all(
    [...pageLoader.querySelectorAll("img")].map((image) =>
      typeof image.decode === "function" ? image.decode().catch(() => {}) : Promise.resolve()
    )
  );
  const logoRevealFinished = logoImagesReady.then(() => {
    pageLoader.classList.add("is-animating");
    if (reduceLoaderMotion) return;

    return new Promise((resolve) => {
      const fill = pageLoader.querySelector(".page-loader__mark-fill");
      let holdStarted = false;
      const holdFilledLogo = () => {
        if (holdStarted) return;
        holdStarted = true;
        window.setTimeout(resolve, 550);
      };

      fill.addEventListener("animationend", holdFilledLogo, { once: true });
      // Safety net if the browser doesn't emit animationend for a cancelled animation.
      window.setTimeout(holdFilledLogo, 3000);
    });
  });

  let loaderDismissed = false;
  const dismissPageLoader = () => {
    if (loaderDismissed) return;
    loaderDismissed = true;
    Promise.all([pageReady, logoRevealFinished]).then(() => {
      if (!pageLoader.isConnected) return;
      pageLoader.classList.add("is-leaving");
      window.setTimeout(() => pageLoader.remove(), 700);
    });
  };

  dismissPageLoader();

  // Fallback prevents a slow or unavailable asset from leaving the overlay in place indefinitely.
  window.setTimeout(() => {
    if (!pageLoader.isConnected) return;
    pageLoader.classList.add("is-leaving");
    window.setTimeout(() => pageLoader.remove(), 700);
  }, 10000);

  window.addEventListener("pageshow", (event) => {
    if (event.persisted) pageLoader.remove();
  });
}

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const body = document.body;
const header = document.querySelector(".site-header");
const sections = [...document.querySelectorAll("main > section[data-theme]")];
const assistanceSection = document.querySelector("#assistance");
const aboutSection = document.querySelector("#about");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Reveal copy as its section enters the viewport.
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.16 });
document.querySelectorAll(".reveal").forEach((item) => {
  if (!item.closest("#about")) revealObserver.observe(item);
});

if (aboutSection) {
  const aboutRevealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.querySelectorAll(".about-mark, .about-copy").forEach((item) => item.classList.add("is-visible"));
      aboutRevealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.16, rootMargin: "0px 0px -12% 0px" });
  aboutRevealObserver.observe(aboutSection);
}

// Page colors follow the active section, blending to light near the end of assistance.
function updateTheme() {
  const center = window.innerHeight * 0.53;
  const current = sections.find((section) => {
    const rect = section.getBoundingClientRect();
    return rect.top <= center && rect.bottom > center;
  });
  const theme = current?.dataset.theme || "light";
  let lightMix = theme === "dark" ? 0 : 1;
  let isBlending = false;
  if (assistanceSection && aboutSection) {
    const assistanceRect = assistanceSection.getBoundingClientRect();
    const pinRange = Math.max(1, assistanceRect.height - window.innerHeight);
    const pinProgress = clamp(-assistanceRect.top / pinRange);
    if (pinProgress >= 1) {
      const aboutRect = aboutSection.getBoundingClientRect();
      if (aboutRect.top < window.innerHeight && aboutRect.bottom > 0) {
        lightMix = clamp((window.innerHeight - aboutRect.top) / window.innerHeight);
      }
    }
    isBlending = lightMix > 0 && lightMix < 1;
  }
  const darkWeight = `${((1 - lightMix) * 100).toFixed(2)}%`;
  const lightWeight = `${(lightMix * 100).toFixed(2)}%`;
  body.style.setProperty("--page", `color-mix(in srgb, #050505 ${darkWeight}, #ffffff ${lightWeight})`);
  body.style.setProperty("--ink", `color-mix(in srgb, #ffffff ${darkWeight}, #080808 ${lightWeight})`);
  body.style.setProperty("--muted", `color-mix(in srgb, #a9a9a9 ${darkWeight}, #6e6e6e ${lightWeight})`);
  body.style.setProperty("--line", `color-mix(in srgb, rgba(255,255,255,.2) ${darkWeight}, rgba(0,0,0,.18) ${lightWeight})`);
  body.classList.toggle("theme-dark", lightMix < 0.5);
  body.classList.toggle("theme-light", lightMix >= 0.5);
  body.classList.toggle("theme-blending", isBlending);
  header.classList.toggle("is-scrolled", window.scrollY > 24);
}

// The practice section stays pinned while the cards roll through the center.
const practice = document.querySelector("#practice");
const practiceCards = [...document.querySelectorAll(".practice-card")];

function updatePractice() {
  const rect = practice.getBoundingClientRect();
  const scrollable = Math.max(1, practice.offsetHeight - window.innerHeight);
  const progress = clamp(-rect.top / scrollable);
  const morphStart = 0.78;
  const morphProgress = reduceMotion ? 1 : clamp((progress - morphStart) / (1 - morphStart));
  const gridMix = morphProgress * morphProgress * (3 - 2 * morphProgress);
  const roll = reduceMotion ? practiceCards.length - 1 : clamp(progress / morphStart) * (practiceCards.length - 1);

  const isMobile = window.innerWidth < 760;
  const columns = isMobile ? 2 : 4;
  const gridStepX = isMobile ? window.innerWidth * 0.3 : Math.min(window.innerWidth * 0.22, 285);
  const rollStepX = isMobile ? Math.min(window.innerWidth * 0.64, 340) : Math.min(window.innerWidth * 0.36, 480);
  const stepY = isMobile ? Math.min(150, Math.max(108, window.innerWidth * 0.2)) : 190;
  const baseCardWidth = isMobile
    ? Math.min(window.innerWidth * 0.64, 300)
    : clamp(window.innerWidth * 0.26, 240, 340);
  const gridCardWidth = isMobile
    ? clamp(window.innerWidth * 0.17, 80, 130)
    : clamp(window.innerWidth * 0.12, 115, 155);
  const gridScaleX = (gridStepX * 0.9) / baseCardWidth;
  const gridScaleY = gridCardWidth / baseCardWidth;

  practiceCards.forEach((card, index) => {
    const distance = index - roll;
    const carouselX = distance * rollStepX;
    const carouselY = Math.abs(distance) * 8;
    const carouselZ = -Math.abs(distance) * 170;
    const carouselRotation = -distance * 24;
    const carouselOpacity = Math.max(0, 1 - Math.abs(distance) * 0.38);
    const carouselScale = 1 - Math.min(Math.abs(distance) * 0.075, 0.3);

    const col = index % columns;
    const row = Math.floor(index / columns);
    const gridX = (col - (columns - 1) / 2) * gridStepX;
    const gridY = (row - (Math.ceil(practiceCards.length / columns) - 1) / 2) * stepY;
    const mix = (from, to) => from + (to - from) * gridMix;
    const x = mix(carouselX, gridX);
    const y = mix(carouselY, gridY);
    const z = mix(carouselZ, 0);
    const rotation = mix(carouselRotation, 0);
    const opacity = mix(carouselOpacity, 1);
    const artworkScale = mix(carouselScale, gridScaleY);
    const backgroundScaleX = mix(carouselScale, gridScaleX);
    const carouselZIndex = 20 - Math.round(Math.abs(distance));
    const gridZIndex = 10 + index;

    card.style.zIndex = String(Math.round(mix(carouselZIndex, gridZIndex)));
    card.style.opacity = String(opacity);
    card.style.transform = `translate(-50%, -50%) translate3d(${x}px, ${y}px, ${z}px) rotateY(${rotation}deg)`;
    card.style.setProperty("--practice-art-scale", String(artworkScale));
    card.style.setProperty("--practice-bg-scale-x", String(backgroundScaleX));
    card.style.setProperty("--practice-bg-scale-y", String(artworkScale));
    // Position is tied directly to scroll progress; CSS easing here would lag on direction changes.
    card.style.transition = "background-color .9s, color .9s";
  });
}

// Pin the assistance scene while the hammer approaches, strikes, and reveals the copy.
const assistance = assistanceSection;
const hammer = document.querySelector(".gavel-hammer");
const block = document.querySelector(".gavel-block");
if (assistance && !reduceMotion) assistance.dataset.scrollHammer = "";
function updateGavel() {
  if (!assistance || !hammer || !block || reduceMotion) return;
  const rect = assistance.getBoundingClientRect();
  const scrollRange = Math.max(1, rect.height - window.innerHeight);
  const progress = clamp(-rect.top / scrollRange);
  const fadeIn = clamp(progress / 0.12);
  const approachProgress = clamp((progress - 0.12) / 0.54);
  const approach = approachProgress * approachProgress * (3 - 2 * approachProgress);
  const impact = clamp(1 - Math.abs(progress - 0.7) / 0.035);
  const rebound = clamp((progress - 0.7) / 0.08);
  const distance = window.innerHeight * 0.12;

  let y = -distance * (1 - approach);
  let angle = -2.5 * (1 - approach);
  if (progress >= 0.66) {
    const hitProgress = clamp((progress - 0.66) / 0.04);
    y = hitProgress * 18;
    angle = hitProgress * 2.5;
  }
  if (progress >= 0.7) {
    y = 18 * (1 - rebound);
    angle = 2.5 * (1 - rebound);
  }

  block.style.setProperty("--block-opacity", String(fadeIn));
  hammer.style.setProperty("--hammer-opacity", String(fadeIn));
  hammer.style.setProperty("--hammer-y", `${y}px`);
  hammer.style.setProperty("--hammer-scale", String(0.82 + approach * 0.18));
  hammer.style.setProperty("--hammer-angle", `${angle}deg`);
  block.style.setProperty("--block-bump", `${impact * 3}px`);
  assistance.classList.toggle("is-struck", progress >= 0.78);
}

// Draw the roadmap and reveal numbered steps in scroll order.
const approach = document.querySelector("#approach");
const roadmaps = {
  desktop: document.querySelector(".roadmap-desktop"),
  mobile: document.querySelector(".roadmap-mobile")
};
const roadmapNodes = {
  desktop: [...roadmaps.desktop.querySelectorAll(".roadmap-node")],
  mobile: [...roadmaps.mobile.querySelectorAll(".roadmap-node")]
};
const nodes = [...roadmapNodes.desktop, ...roadmapNodes.mobile];
const roadmapTrack = roadmaps.desktop.querySelector(".roadmap-track");
const roadmapSteps = [...roadmaps.desktop.querySelectorAll(".roadmap-step")];
roadmapSteps.forEach((step) => {
  [...step.querySelectorAll(":scope > path")]
    .find((path) => path.getAttribute("fill") === "black")
    ?.classList.add("roadmap-step-caption");
});
const approachHeading = document.querySelector(".approach-heading--section");
const approachSticky = document.querySelector(".approach-sticky");
const roadmapPathLength = roadmapTrack.getTotalLength();
roadmapTrack.style.strokeDasharray = `${roadmapPathLength} ${roadmapPathLength}`;
roadmapTrack.style.strokeDashoffset = String(roadmapPathLength);
const roadmapPathSamples = Math.ceil(roadmapPathLength / 1.5);
const roadmapPoints = roadmapSteps.map((step) => {
  const circle = step.querySelector("circle");
  const targetX = Number(circle.getAttribute("cx"));
  const targetY = Number(circle.getAttribute("cy"));
  let closestLength = 0;
  let closestDistance = Infinity;
  for (let sample = 0; sample <= roadmapPathSamples; sample += 1) {
    const length = roadmapPathLength * sample / roadmapPathSamples;
    const point = roadmapTrack.getPointAtLength(length);
    const distance = Math.hypot(point.x - targetX, point.y - targetY);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestLength = length;
    }
  }
  const circleRadius = Number(circle.getAttribute("r"));
  return clamp((closestLength - circleRadius) / roadmapPathLength);
});
const roadmapAnchors = roadmapSteps.map((step) => {
  const circle = step.querySelector("circle");
  return { x: Number(circle.getAttribute("cx")), y: Number(circle.getAttribute("cy")) };
});
const roadmapBaseD = roadmapTrack.getAttribute("d");
const roadmapMorphSamples = Math.max(180, Math.ceil(roadmapPathLength / 7));

function sampleRoadmapPath(pathData) {
  const samplePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  samplePath.setAttribute("d", pathData);
  samplePath.setAttribute("fill", "none");
  samplePath.setAttribute("stroke", "none");
  samplePath.setAttribute("visibility", "hidden");
  roadmapTrack.parentNode.append(samplePath);
  const length = samplePath.getTotalLength();
  const points = Array.from({ length: roadmapMorphSamples + 1 }, (_, index) => {
    const point = samplePath.getPointAtLength(length * index / roadmapMorphSamples);
    return { x: point.x, y: point.y };
  });
  samplePath.remove();
  return points;
}

const roadmapBaseShape = sampleRoadmapPath(roadmapBaseD);
const roadmapBaseAnchors = roadmapAnchors;
let roadmapCurrentShape = roadmapBaseShape.map((point) => ({ ...point }));
let roadmapCurrentAnchors = roadmapBaseAnchors.map((point) => ({ ...point }));
let roadmapMorphFrame = 0;
let roadmapMorphing = false;

function roadmapPathFromPoints(points) {
  const format = (value) => Number(value.toFixed(2));
  let path = `M ${format(points[0].x)} ${format(points[0].y)}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[Math.max(0, index - 1)];
    const p1 = points[index];
    const p2 = points[index + 1];
    const p3 = points[Math.min(points.length - 1, index + 2)];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    path += ` C ${format(c1x)} ${format(c1y)}, ${format(c2x)} ${format(c2y)}, ${format(p2.x)} ${format(p2.y)}`;
  }
  return path;
}

function applyRoadmapAnchors(anchors) {
  roadmapCurrentAnchors = anchors.map((point) => ({ ...point }));
  roadmapSteps.forEach((step, stepIndex) => {
    const base = roadmapAnchors[stepIndex];
    const point = anchors[stepIndex];
    const dx = point.x - base.x;
    const dy = point.y - base.y;
    if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) step.removeAttribute("transform");
    else step.setAttribute("transform", `translate(${dx.toFixed(2)} ${dy.toFixed(2)})`);
    roadmapNodes.desktop[stepIndex].style.left = `${point.x / 1440 * 100}%`;
    roadmapNodes.desktop[stepIndex].style.top = `${point.y / 766 * 100}%`;
  });
}

function setRoadmapGeometry(index) {
  if (roadmapMorphFrame) cancelAnimationFrame(roadmapMorphFrame);
  const state = index < 0 ? null : window.roadmapReferenceStates?.[index];
  const targetShape = state ? sampleRoadmapPath(state.track) : roadmapBaseShape.map((point) => ({ ...point }));
  const targetAnchors = state ? state.nodes.map(([x, y]) => ({ x, y })) : roadmapBaseAnchors.map((point) => ({ ...point }));
  const startShape = roadmapCurrentShape.map((point) => ({ ...point }));
  const startAnchors = roadmapCurrentAnchors.map((point) => ({ ...point }));
  const startedAt = performance.now();
  const duration = reduceMotion ? 0 : 720;
  roadmapMorphing = true;
  if (state) {
    roadmapTrack.style.strokeDasharray = "10000 10000";
    roadmapTrack.style.strokeDashoffset = "0";
  }

  const render = (progress) => {
    roadmapCurrentShape = startShape.map((point, pointIndex) => ({
      x: point.x + (targetShape[pointIndex].x - point.x) * progress,
      y: point.y + (targetShape[pointIndex].y - point.y) * progress
    }));
    roadmapTrack.setAttribute("d", roadmapPathFromPoints(roadmapCurrentShape));
    applyRoadmapAnchors(startAnchors.map((point, stepIndex) => ({
      x: point.x + (targetAnchors[stepIndex].x - point.x) * progress,
      y: point.y + (targetAnchors[stepIndex].y - point.y) * progress
    })));
  };

  const finish = () => {
    roadmapCurrentShape = targetShape;
    applyRoadmapAnchors(targetAnchors);
    roadmapTrack.setAttribute("d", state ? state.track : roadmapBaseD);
    if (state) {
      roadmapTrack.style.strokeDasharray = "10000 10000";
      roadmapTrack.style.strokeDashoffset = "0";
    } else {
      roadmapTrack.style.strokeDasharray = `${roadmapPathLength} ${roadmapPathLength}`;
      roadmapTrack.style.strokeDashoffset = String(roadmapPathLength * (1 - approachProgress));
    }
    roadmapMorphing = false;
    roadmapMorphFrame = 0;
  };

  if (!duration) {
    render(1);
    finish();
    return;
  }

  const animate = (now) => {
    const rawProgress = clamp((now - startedAt) / duration);
    const easedProgress = 1 - Math.pow(1 - rawProgress, 3);
    render(easedProgress);
    if (rawProgress < 1) roadmapMorphFrame = requestAnimationFrame(animate);
    else finish();
  };
  roadmapMorphFrame = requestAnimationFrame(animate);
}

const detail = document.querySelector(".approach-detail");
roadmapNodes.desktop.forEach((node, index) => {
  if (node.querySelector("span")) return;
  const number = document.createElement("span");
  number.textContent = String(index + 1).padStart(2, "0");
  node.append(number);
});
const descriptions = [
  "Understanding the client's concerns, objectives, immediate requirements and the nature of the legal issue. Identifying the assistance sought and establishing the scope of the engagement",
  "Gathering and examining relevant documents, correspondence, records and supporting materials. Establishing the factual background, identifying evidentiary gaps and tracing the chronology of events.",
  "Identifying the legal questions involved and examining applicable statutes, rules, regulations, judicial precedents and relevant legal principles governing the matter.",
  "Evaluating the merits of the matter, available remedies, potential defences, procedural requirements and associated legal risks. Providing an informed assessment of the client's legal position.",
  "Formulating an appropriate legal strategy based on the client's objectives and the assessed legal position. Determining the suitable course of action, whether through negotiation, statutory remedies or judicial proceedings.",
  "Drafting, reviewing and refining legal notices, pleadings, petitions, affidavits, agreements and written submissions. Organising supporting documents and ensuring compliance with applicable procedural requirements.",
  "Pursuing appropriate legal remedies and undertaking representation before competent courts, tribunals and other authorities, where engaged. Monitoring proceedings, advancing legal submissions and keeping clients informed of developments.",
  "Examining the outcome of proceedings or negotiations, advising on consequential steps, assisting with implementation and compliance, and evaluating further remedies where warranted."
];
const stepTitles = [
  "Client Consultation", "Factual Assessment", "Research & Analysis", "Legal Opinion & Advisory",
  "Strategic Planning", "Drafting & Documentation", "Advocacy & Representation", "Continued Assistance"
];
let activeStep = -1;
let pointerActivationBounds = null;
let approachProgress = 0;
let desktopLayoutActive = false;
let detailMoveTimer = 0;

function positionApproachDetail(index) {
  const shellRect = roadmaps.desktop.getBoundingClientRect();
  const stickyRect = approachSticky.getBoundingClientRect();
  const scale = shellRect.width / 1440;
  const state = window.roadmapReferenceStates?.[index];
  const [panelX, panelY, panelWidth, panelHeight] = state?.panel || [48, 335, 337, 264];
  const activeNode = roadmapNodes.desktop[index];

  detail.style.width = `${panelWidth}px`;
  detail.style.height = `${panelHeight}px`;
  detail.style.minHeight = `${panelHeight}px`;
  detail.style.transform = `scale(${scale})`;
  detail.style.transformOrigin = "top left";
  activeNode.style.borderWidth = `${5 * scale}px`;
  activeNode.style.fontSize = `${20 * scale}px`;
  detail.style.left = `${shellRect.left - stickyRect.left + panelX * scale}px`;
  detail.style.top = `${shellRect.top - stickyRect.top + panelY * scale}px`;
  const targetNodeX = state?.nodes?.[index]?.[0] ?? roadmapCurrentAnchors[index].x;
  detail.classList.toggle("is-before", panelX + panelWidth / 2 < targetNodeX);
  return { left: panelX, right: panelX + panelWidth, top: panelY, bottom: panelY + panelHeight };
}

function clearDesktopDetailPosition() {
  ["left", "top", "width", "height", "min-height", "transform", "transform-origin"].forEach((property) => detail.style.removeProperty(property));
}

function showStep(index) {
  const mobileRoadmap = window.matchMedia("(max-width: 760px)").matches;
  if (index >= 0 && !mobileRoadmap && approachProgress < roadmapPoints[roadmapPoints.length - 1]) return;
  const previousStep = activeStep;
  activeStep = index;
  const moveDetail = index >= 0 && previousStep >= 0 && previousStep !== index && !mobileRoadmap;
  window.clearTimeout(detailMoveTimer);
  detail.classList.toggle("is-moving", moveDetail);
  if (moveDetail) detailMoveTimer = window.setTimeout(() => detail.classList.remove("is-moving"), 760);
  approachSticky.classList.toggle("has-active-detail", index >= 0 && !mobileRoadmap);
  roadmapNodes.desktop.forEach((node, i) => node.classList.toggle("is-active", !mobileRoadmap && i === index));
  roadmapNodes.mobile.forEach((node, i) => node.classList.toggle("is-active", mobileRoadmap && i === index));
  roadmapNodes.desktop.forEach((node, i) => {
    if (mobileRoadmap || i !== index) {
      node.style.removeProperty("border-width");
      node.style.removeProperty("font-size");
    }
  });
  if (index < 0) {
    detail.classList.remove("is-moving");
    pointerActivationBounds = null;
    detail.classList.remove("is-visible");
    if (desktopLayoutActive) {
      desktopLayoutActive = false;
      setRoadmapGeometry(-1);
    }
    if (mobileRoadmap) clearDesktopDetailPosition();
    return;
  }
  detail.dataset.step = String(index);
  detail.querySelector(".detail-number").textContent = String(index + 1).padStart(2, "0");
  detail.querySelector("h3").textContent = stepTitles[index];
  detail.querySelector("p").textContent = descriptions[index];
  if (mobileRoadmap) {
    if (desktopLayoutActive) {
      desktopLayoutActive = false;
      setRoadmapGeometry(-1);
    }
    clearDesktopDetailPosition();
    detail.classList.remove("is-before");
  } else {
    positionApproachDetail(index);
    if (!desktopLayoutActive || previousStep !== index) setRoadmapGeometry(index);
    desktopLayoutActive = true;
  }
  if (previousStep !== index) detail.classList.remove("is-visible");
  void detail.offsetWidth;
  detail.classList.add("is-visible");
}

nodes.forEach((node) => {
  const index = Number(node.dataset.step);
  node.addEventListener("pointerenter", (event) => {
    if (event.pointerType !== "mouse") return;
    const rect = node.getBoundingClientRect();
    pointerActivationBounds = { left: rect.left - 22, right: rect.right + 22, top: rect.top - 22, bottom: rect.bottom + 22 };
    showStep(index);
  });
  node.addEventListener("focus", () => showStep(index));
  node.addEventListener("blur", () => showStep(-1));
  node.addEventListener("click", () => {
    if (window.matchMedia("(hover: none)").matches) showStep(activeStep === index ? -1 : index);
  });
});

window.addEventListener("pointermove", (event) => {
  if (!pointerActivationBounds || activeStep < 0 || event.pointerType !== "mouse") return;
  if (event.target.closest?.(".roadmap-node")) return;
  const { left, right, top, bottom } = pointerActivationBounds;
  if (event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom) showStep(-1);
}, { passive: true });

function updateApproach() {
  const rect = approach.getBoundingClientRect();
  const scrollRange = Math.max(1, approach.offsetHeight - window.innerHeight);
  const progress = reduceMotion ? 1 : clamp(-rect.top / scrollRange);
  approachProgress = progress;
  const headingProgress = reduceMotion ? 1 : clamp(progress / 0.08);
  approachHeading.style.setProperty("--approach-heading-opacity", String(headingProgress));
  approachHeading.style.setProperty("--approach-heading-offset", `${(1 - headingProgress) * 48}px`);
  const mobileRoadmap = window.matchMedia("(max-width: 760px)").matches;
  const layout = mobileRoadmap ? "mobile" : "desktop";
  if (desktopLayoutActive && (mobileRoadmap || progress < roadmapPoints[roadmapPoints.length - 1])) showStep(-1);
  if (mobileRoadmap) {
    roadmaps.mobile.style.setProperty("--line-progress", `${progress * 100}%`);
  } else {
    if (desktopLayoutActive) positionApproachDetail(activeStep);
    roadmapTrack.style.strokeDashoffset = desktopLayoutActive || roadmapMorphing
      ? "0"
      : String(roadmapPathLength * (1 - progress));
    roadmapSteps.forEach((step, index) => {
      step.classList.toggle("is-visible", progress >= roadmapPoints[index]);
    });
  }
  roadmapNodes[layout].forEach((node, index) => {
    const revealAt = mobileRoadmap ? (index + 1) / (roadmapNodes[layout].length + 1) : roadmapPoints[index];
    node.classList.toggle("is-visible", progress >= revealAt);
  });
}

// Header and mobile navigation.
const menuToggle = document.querySelector(".menu-toggle");
const nav = document.querySelector(".main-nav");
menuToggle.addEventListener("click", () => {
  const open = menuToggle.getAttribute("aria-expanded") !== "true";
  menuToggle.setAttribute("aria-expanded", String(open));
  nav.classList.toggle("is-open", open);
});
nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => {
  menuToggle.setAttribute("aria-expanded", "false");
  nav.classList.remove("is-open");
}));

// Send the visitor's composed enquiry to their mail app for delivery to HLC.
document.querySelector("#enquiry-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const fields = new FormData(form);
  const subject = `Website enquiry from ${fields.get("name") || "HLC website"}`;
  const message = [
    `Name: ${fields.get("name") || ""}`,
    `Email: ${fields.get("email") || ""}`,
    `Phone: ${fields.get("phone") || ""}`,
    "",
    "Matter:",
    fields.get("message") || ""
  ].join("\n");
  window.location.href = `mailto:himnalawconsulting@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
  document.querySelector(".form-note").textContent = "Your email app should open with the enquiry ready to send.";
});

document.querySelector("[data-year]").textContent = new Date().getFullYear();

let frameQueued = false;
function onScroll() {
  if (frameQueued) return;
  frameQueued = true;
  requestAnimationFrame(() => {
    updateTheme();
    updatePractice();
    updateGavel();
    updateApproach();
    frameQueued = false;
  });
}
window.addEventListener("scroll", onScroll, { passive: true });
window.addEventListener("resize", onScroll);
if (reduceMotion) {
  practice.style.height = "100svh";
  approach.style.height = "100svh";
  approach.style.minHeight = "100svh";
}
updateTheme();
updatePractice();
updateGavel();
updateApproach();
