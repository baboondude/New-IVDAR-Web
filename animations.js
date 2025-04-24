/**
 * animations.js
 * Contains animation logic using anime.js or other libraries/techniques.
 */

// Helper function to format numbers with commas (copied from script.js for standalone use)
function formatNumberWithCommas(number, minimumFractionDigits = 0, maximumFractionDigits = 2) {
    const num = Number(number);
    if (number == null || isNaN(num)) {
        return '--'; // Placeholder for invalid numbers
    }
    try {
        return num.toLocaleString('en-US', {
            minimumFractionDigits: minimumFractionDigits,
            maximumFractionDigits: maximumFractionDigits
        });
    } catch (error) {
        console.error("Error formatting number:", number, error);
        return '--'; // Fallback on error
    }
}

// Function to animate a number counter, ensuring every whole percentage is hit visually
function animateNumberCounter(element, targetValueInput, duration = 1200, isPercentage = true) {
    if (!element) return; // Guard against null elements

    let targetDecimalValue;
    let originalText = String(targetValueInput); // Keep original format for final set
    let isDollar = false;

    // 1. Determine the numeric decimal target value and type
    if (typeof targetValueInput === 'string') {
        isDollar = targetValueInput.includes('$');
        // Convert percentage string "xx.xx%" to decimal 0.xxxx
        if (targetValueInput.includes('%')) {
            targetDecimalValue = parseFloat(targetValueInput.replace(/%/g, '')) / 100;
        }
        // Convert dollar string "$x,xxx.xx" to number xxxx.xx
        else if (isDollar) {
            targetDecimalValue = parseFloat(targetValueInput.replace(/[$,]/g, ''));
        }
        // Assume plain number string
        else {
            targetDecimalValue = parseFloat(targetValueInput.replace(/,/g, ''));
        }
    } else if (typeof targetValueInput === 'number') {
        // Input is already a number (likely decimal for percentages, or a plain number)
        targetDecimalValue = targetValueInput;
    } else {
         // If the input is neither string nor number, try to get original text or default
         targetDecimalValue = NaN; // Mark as invalid for now
         originalText = element.textContent || (isPercentage ? '0.00%' : '0');
    }


    // If the target isn't a valid number, set original text or default and exit
    if (targetDecimalValue === null || targetDecimalValue === undefined || isNaN(targetDecimalValue)) {
        console.warn("Invalid target value for animation:", targetValueInput, "Setting default.");
        element.textContent = originalText; // Use original text if available, otherwise default
        return;
    }

    // 2. Calculate final values and animation target
    let finalDisplayValue; // The final formatted string (e.g., "49.96%" or "$1,234.56" or "1,234.56")
    let animationTarget;   // The numeric value animejs animates towards
    // --- EDIT: Determine if it's a plain number --- 
    const isPlainNumber = !isDollar && !isPercentage;

    if (isDollar) {
        finalDisplayValue = currencyFormatter.format(targetDecimalValue);
        animationTarget = targetDecimalValue;
    } else if (isPercentage) {
        const finalPercentage = targetDecimalValue * 100;
        finalDisplayValue = finalPercentage.toFixed(2) + '%';
        animationTarget = finalPercentage;
    } else {
        // --- EDIT: Use formatNumberWithCommas for plain numbers --- 
        finalDisplayValue = formatNumberWithCommas(targetDecimalValue, 0, 2);
        animationTarget = targetDecimalValue;
    }

    // 3. Set initial state
    // --- EDIT: Use formatNumberWithCommas for plain number initial state --- 
    element.textContent = isPercentage ? '0.00%' : (isDollar ? currencyFormatter.format(0) : formatNumberWithCommas(0));

    // 4. Perform animation
    let current = { val: 0 };

    anime({
        targets: current,
        val: animationTarget,
        round: 10000, // Increased precision further (was 1000) for more granular steps
        duration: duration,
        easing: 'easeOutExpo', // Changed from easeOutCubic for more pronounced slowdown
        update: function() {
            let display;
            // Format intermediate value with high precision for the "fast tick" effect
            const intermediateValueStr = current.val.toFixed(4); // Show 4 decimal places during update

            if (isDollar) {
                display = '$' + intermediateValueStr;
            } else if (isPercentage) {
                display = intermediateValueStr + '%';
            } else {
                display = intermediateValueStr;
            }
            element.textContent = display;
        },
        complete: function() {
            // Ensure the final value matches the final formatted string exactly
            element.textContent = finalDisplayValue;
        }
    });
}

// Function to animate percentage/dollar values in tables
function animateTableValues() {
    console.log("Running animateTableValues (Initial Load)...");
    // Find all table cells that likely contain numbers to animate ON INITIAL LOAD
    const tableCells = document.querySelectorAll('#daily-table-body td, #valuation-detail-body td, #calculationResultsBody td, #desktop-dollar-returns-body td, #desktop-dollar-valuation-body td');
    let animationDelay = 0;

    tableCells.forEach((cell, index) => {
        const text = cell.textContent.trim();
        // Slightly stricter check for initial animation
        const isNumericCell = (text.includes('%') || text.includes('$') || /^[+-]?[\\d,]+(\\.\\d+)?$/.test(text)) && text !== '-' && text !== '' && text !== 'Total';

        if (isNumericCell) {
            const originalClass = cell.className;

            // --- PARSE the value BEFORE passing to animation --- 
            let targetValueForAnimation;
            const isPercentage = text.includes('%');
            const isDollar = text.includes('$');

            if (isPercentage) {
                // Convert percentage string "xx.xx%" to decimal 0.xxxx
                targetValueForAnimation = parseFloat(text.replace(/%/g, '')) / 100;
            } else {
                // Convert number string "x,xxx.xx" (or dollar) to number xxxx.xx
                targetValueForAnimation = parseFloat(text.replace(/[$,]/g, ''));
            }
            // --- END PARSE --- 
            
            // Animate with no delay for the first cell, and minimal stagger for the rest
            setTimeout(() => {
                cell.className = originalClass; // Preserve class
                // Pass the PARSED numeric value and the isPercentage flag
                animateNumberCounter(cell, targetValueForAnimation, 800, isPercentage);
            }, index === 0 ? 0 : (10 * index)); // No delay for first cell, minimal delay for others
        }
    });
}

// Main function to trigger all page load animations
function runPageLoadAnimations() {
    console.log("Running page load animations...");
    // Animate summary values first
    const summaryItems = document.querySelectorAll('.summary-item p');
    staggerFadeIn(summaryItems, 700, 120);
    // Animate cards in grid
    const cards = document.querySelectorAll('.grid-container .card');
    staggerFadeIn(cards, 700, 100);
    // Fade in summary section and page header
    fadeIn(document.querySelector('.summary-section'), 600);
    fadeIn(document.querySelector('.page-header'), 600);
    // Animate table values after summary
    setTimeout(() => {
        animateTableValues();
    }, 500);
    // Add other complex animations here if needed (e.g., chart intro animations)
}

function updateStatAnimation(elementSelector, finalValue) {
  const targetElement = document.querySelector(elementSelector);
  if (!targetElement) return;

  let dummy = { value: 0 }; // Start from 0

  anime({
    targets: dummy,
    value: finalValue, // Animate to the final fetched value
    round: 1, // Round to the nearest whole number for percentage
    easing: 'linear', // Or another easing function
    duration: 1500, // Adjust duration as needed
    update: function() {
      targetElement.textContent = dummy.value + '%'; // Update the text content
    }
  });
}

// Example usage after fetching data:
// Assume fetchedData = { positiveChange: 85, accuracy: 92, ... }
// updateStatAnimation('#positive-change-value', fetchedData.positiveChange);
// updateStatAnimation('#accuracy-value', fetchedData.accuracy);
// ... and so on for other stats 

// --- NEW: Initial Page Load Animation Sequence ---
function runInitialLoadAnimations() {
    // Ensure elements exist before animating
    const pageHeader = document.querySelector('.page-header');
    const summarySection = document.querySelector('.summary-section');
    const gridContainer = document.querySelector('.grid-container');

    if (!pageHeader || !summarySection || !gridContainer) {
        console.warn("Initial load animation elements not found, skipping.");
        // Fallback: ensure content is visible if animation can't run
        if (pageHeader) pageHeader.style.opacity = 1;
        if (summarySection) summarySection.style.opacity = 1;
        if (gridContainer) gridContainer.style.opacity = 1;
        return;
    }

    // Use anime.js timeline for sequencing
    const tl = anime.timeline({
        easing: 'easeOutExpo', // Smooth easing
        duration: 800 // Slightly longer duration
    });

    // 1. Animate Page Header
    tl.add({
        targets: '.page-header',
        opacity: [0, 1],
        translateY: [20, 0], // Subtle slide up
    });

    // 2. Animate Summary Section (container first, then items)
    tl.add({
        targets: '.summary-section',
        opacity: [0, 1],
        translateY: [20, 0],
    }, '-=600'); // Overlap slightly with header animation

    // We'll trigger number animations *after* this timeline completes

    // 3. Animate Cards in Grid (staggered)
    tl.add({
        targets: '.grid-container .card',
        opacity: [0, 1],
        translateY: [20, 0],
        delay: anime.stagger(100, { start: 300 }) // Stagger card animation, start after summary fade
    }, '-=500'); // Overlap with summary animation

    // Return the timeline promise so we know when it's done
    return tl.finished;
}

// --- NEW: Element Update Animation ---
function animateElementUpdate(elementOrSelector, updateCallback, options = {}) {
    const { duration = 300, delay = 0 } = options;
    const elements = typeof elementOrSelector === 'string'
        ? document.querySelectorAll(elementOrSelector)
        : [elementOrSelector]; // Handle single element or selector

    if (!elements || elements.length === 0) {
        console.warn("Element not found for update animation:", elementOrSelector);
        if (updateCallback) updateCallback(); // Still run the update logic
        return Promise.resolve(); // Return resolved promise
    }

    // Create a timeline for each element to ensure proper sequencing
    const promises = Array.from(elements).map(el => {
        // Ensure element starts visible if it was hidden
        el.style.opacity = 1;

        return anime.timeline({
            targets: el,
            easing: 'easeInOutQuad',
            delay: delay,
        })
        .add({
            opacity: 0,
            duration: duration / 2,
            complete: () => {
                // Update content only after fade-out is complete
                if (updateCallback) {
                    try {
                        updateCallback(el); // Pass element to callback if needed
                    } catch (error) {
                        console.error("Error during update callback:", error, "Element:", el);
                    }
                }
            }
        })
        .add({
            opacity: 1,
            duration: duration / 2,
        })
        .finished; // Return promise for this element's timeline
    });

    // Return a promise that resolves when all element animations are complete
    return Promise.all(promises);
}

// --- Standardized Animation Helpers ---

/**
 * Fade in an element using anime.js
 * @param {HTMLElement} element
 * @param {number} duration (ms)
 */
function fadeIn(element, duration = 400) {
    anime({
        targets: element,
        opacity: [0, 1],
        duration,
        easing: 'easeOutCubic',
        begin: () => { element.style.display = ''; }
    });
}

/**
 * Fade out an element using anime.js
 * @param {HTMLElement} element
 * @param {number} duration (ms)
 */
function fadeOut(element, duration = 400) {
    anime({
        targets: element,
        opacity: [1, 0],
        duration,
        easing: 'easeInCubic',
        complete: () => { element.style.display = 'none'; }
    });
}

/**
 * Slide up (collapse) an element using anime.js
 * @param {HTMLElement} element
 * @param {number} duration (ms)
 */
function slideUp(element, duration = 400) {
    anime({
        targets: element,
        height: [element.offsetHeight, 0],
        opacity: [1, 0],
        duration,
        easing: 'easeInCubic',
        complete: () => { element.style.display = 'none'; }
    });
}

/**
 * Slide down (expand) an element using anime.js
 * @param {HTMLElement} element
 * @param {number} duration (ms)
 */
function slideDown(element, duration = 400) {
    element.style.display = '';
    element.style.height = 'auto';
    const targetHeight = element.offsetHeight;
    element.style.height = '0px';
    anime({
        targets: element,
        height: [0, targetHeight],
        opacity: [0, 1],
        duration,
        easing: 'easeOutCubic',
        complete: () => { element.style.height = ''; }
    });
}

/**
 * Staggered fade-in for a list of elements
 * @param {NodeList|Array} elements
 * @param {number} duration (ms)
 * @param {number} stagger (ms)
 */
function staggerFadeIn(elements, duration = 400, stagger = 80) {
    anime({
        targets: elements,
        opacity: [0, 1],
        translateY: [20, 0],
        delay: anime.stagger(stagger),
        duration,
        easing: 'easeOutCubic',
    });
}

// --- Anime.js Donut Chart Integration ---

// Sample data (replace with your dynamic data as needed)
const donutData = [
  { label: 'SP500', value: 36.4, color: '#3B82F6' },
  { label: 'NASDAQ', value: 12.4, color: '#60A5FA' },
  { label: 'International', value: 6.2, color: '#FBBF24' },
  { label: 'Bonds', value: 2.0, color: '#A78BFA' },
  { label: 'Money Market', value: 43.0, color: '#10B981' }
];

const donutRadius = 80;
const donutWidth = 32;
const center = donutRadius + donutWidth;
const svgSize = (donutRadius + donutWidth) * 2;

function polarToCartesian(cx, cy, r, angle) {
  const rad = (angle - 90) * Math.PI / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad)
  };
}

function describeArc(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return [
    'M', start.x, start.y,
    'A', r, r, 0, largeArcFlag, 0, end.x, end.y
  ].join(' ');
}

function renderAnimeDonutChart(data) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', svgSize);
  svg.setAttribute('height', svgSize);
  svg.setAttribute('viewBox', `0 0 ${svgSize} ${svgSize}`);
  svg.style.display = 'block';
  svg.style.margin = '0 auto';
  svg.style.overflow = 'visible';
  // Initial state for overall SVG animation
  svg.style.opacity = 0;
  svg.style.transformOrigin = 'center center';
  svg.style.transform = 'scale(0.8) rotate(-10deg)'; // Start slightly rotated

  // Prepare elements for animation
  const segmentPaths = [];
  const labelTexts = [];
  let startAngle = 0;

  data.forEach((d, i) => {
    // Create Segment Path
    const angle = (d.value / total) * 360;
    const endAngle = startAngle + angle;
    const arcPath = describeArc(center, center, donutRadius, startAngle, endAngle);
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', arcPath);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', d.color);
    path.setAttribute('stroke-width', donutWidth);
    path.setAttribute('stroke-linecap', 'round');
    path.style.filter = `drop-shadow(0 0 8px ${d.color}33)`;
    path.style.cursor = 'pointer';
    path.dataset.index = i;
    svg.appendChild(path);
    segmentPaths.push(path); // Collect path element

    // Prepare Label Group (Tooltip Style)
    const labelGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const labelPadding = { x: 10, y: 5 };
    const labelBgRadius = 5;
    const connectorLength = 25;
    const segmentOuterRadius = donutRadius + donutWidth / 2;

    // Calculate end point for connector line on the segment
    const midAngle = startAngle + angle / 2;
    const connectorEndPos = polarToCartesian(center, center, segmentOuterRadius, midAngle);
    // Calculate start point for connector line (further out)
    const connectorStartPos = polarToCartesian(center, center, segmentOuterRadius + connectorLength, midAngle);

    // Temporary text for size calculation
    const tempText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    tempText.setAttribute('font-size', '0.8rem');
    tempText.setAttribute('font-family', 'Inter, sans-serif');
    const tempTspanLabel = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
    tempTspanLabel.textContent = d.label;
    const tempTspanValue = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
    tempTspanValue.textContent = d.value.toFixed(1) + '%'; // Use final format for sizing
    tempText.appendChild(tempTspanLabel);
    tempText.appendChild(tempTspanValue); // Value on same line for now, adjust later if needed
    svg.appendChild(tempText); // Add temporarily to measure
    const textBBox = tempText.getBBox();
    svg.removeChild(tempText);

    const labelWidth = textBBox.width + 2 * labelPadding.x;
    const labelHeight = textBBox.height + 2 * labelPadding.y;

    // Determine label group anchor point based on angle (roughly)
    let labelAnchorX = connectorStartPos.x;
    let labelAnchorY = connectorStartPos.y;
    let textAnchor = 'middle';
    if (midAngle > 0 && midAngle < 180) { // Right side
        labelAnchorX -= labelWidth / 2;
        textAnchor = 'start';
    } else { // Left side
        labelAnchorX += labelWidth / 2;
        textAnchor = 'end';
    }
    if (midAngle > 90 && midAngle < 270) { // Bottom half
         labelAnchorY -= labelHeight / 2;
    } else { // Top half
         labelAnchorY += labelHeight / 2;
    }

    // Create Background Rect
    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRect.setAttribute('x', labelAnchorX - labelWidth / 2);
    bgRect.setAttribute('y', labelAnchorY - labelHeight / 2);
    bgRect.setAttribute('width', labelWidth);
    bgRect.setAttribute('height', labelHeight);
    bgRect.setAttribute('rx', labelBgRadius);
    bgRect.setAttribute('ry', labelBgRadius);
    bgRect.setAttribute('fill', 'rgba(20, 20, 30, 0.85)'); // Dark background
    bgRect.setAttribute('stroke', 'rgba(100, 100, 110, 0.6)');
    bgRect.setAttribute('stroke-width', 1);

    // Create Connector Line
    const connectorLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    connectorLine.setAttribute('d', `M${connectorEndPos.x},${connectorEndPos.y} L${connectorStartPos.x},${connectorStartPos.y}`);
    connectorLine.setAttribute('stroke', 'rgba(150, 150, 160, 0.8)');
    connectorLine.setAttribute('stroke-width', 1.5);
    connectorLine.setAttribute('fill', 'none');

    // Create Text Element (with TSpans)
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    // Position text inside the background rect
    text.setAttribute('x', labelAnchorX);
    text.setAttribute('y', labelAnchorY);
    text.setAttribute('fill', '#E0E0E5'); // Light text color
    text.setAttribute('font-size', '0.8rem');
    text.setAttribute('font-family', 'Inter, sans-serif');
    text.setAttribute('text-anchor', textAnchor);
    text.setAttribute('dominant-baseline', 'central');

    const tspanLabel = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
    tspanLabel.textContent = d.label + ': '; // Add colon
    tspanLabel.style.fontWeight = '500'; // Slightly lighter weight for label

    const tspanValue = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
    tspanValue.setAttribute('class', 'donut-label-value'); // Class for easier selection in animation
    tspanValue.textContent = '0.0%'; // Initial value
    tspanValue.style.fontWeight = '700'; // Bolder for value
    tspanValue.style.fill = d.color; // Use segment color for value

    text.appendChild(tspanLabel);
    text.appendChild(tspanValue);

    // Add elements to group (order matters for visibility)
    labelGroup.appendChild(bgRect);
    labelGroup.appendChild(connectorLine);
    labelGroup.appendChild(text);

    // Set initial state for group animation
    const startPos = polarToCartesian(center, center, donutRadius * 0.5, midAngle);
    labelGroup.setAttribute('transform', `translate(${startPos.x - labelAnchorX}, ${startPos.y - labelAnchorY}) scale(0.5) rotate(-15)`);
    labelGroup.style.opacity = 0;
    labelGroup.style.transformOrigin = `${labelAnchorX}px ${labelAnchorY}px`;

    svg.appendChild(labelGroup);
    labelTexts.push({ element: labelGroup, finalPos: { x: labelAnchorX, y: labelAnchorY }, value: d.value }); // Store group and its final anchor position

    startAngle = endAngle;
  });

  // --- Animation Timeline ---
  const tl = anime.timeline({
    easing: 'easeOutExpo', // Default easing for the timeline
    duration: 800 // Default duration
  });

  // 1. SVG Entrance Animation (with rotation)
  tl.add({
    targets: svg,
    opacity: [0, 1],
    scale: [0.8, 1],
    rotate: ['-10deg', '0deg'], // Animate rotation
    duration: 600
  });

  // 2. Arc Segment Animations (Staggered, Spring)
  // Set initial state just before animation
  segmentPaths.forEach((path, i) => {
      const arcData = data.find(d => d.path === path); // Need original arc data for origin calc
      if (!arcData) return; // Should not happen
      path.style.opacity = 0;
      const midAngle = arcData.startAngle + (arcData.endAngle - arcData.startAngle) / 2;
      const originPos = polarToCartesian(center, center, donutRadius, midAngle);
      path.style.transformOrigin = `${originPos.x}px ${originPos.y}px`;
      path.style.transform = 'scale(0.9) rotate(-15deg)';
  });

  tl.add({
    targets: segmentPaths,
    opacity: [0, 0.95],
    scale: [0.9, 1],
    rotate: [-15, 0],
    delay: anime.stagger(80), // Stagger the start of each arc animation
    duration: 1200,
    easing: 'spring(1, 80, 10, 0)'
  }, '-=400'); // Overlap with SVG entrance slightly

  // 3. Label Group Animations (Staggered, Slide, Scale, Rotate)
  tl.add({
    targets: labelTexts.map(lt => lt.element), // Target the group elements
    translateX: (el, i) => [labelTexts[i].startPos.x - labelTexts[i].finalPos.x, 0], // Animate transform:translate X
    translateY: (el, i) => [labelTexts[i].startPos.y - labelTexts[i].finalPos.y, 0], // Animate transform:translate Y
    opacity: [0, 1], // Fade in group
    scale: [0.5, 1],
    rotate: [-15, 0],
    delay: anime.stagger(80, { start: 400 }),
    duration: 700,
    easing: 'easeOutQuint',
    update: (anim) => {
      // Update percentage text during animation for each target
      anim.animatables.forEach(animatable => {
        const index = labelTexts.findIndex(lt => lt.element === animatable.target);
        if (index !== -1) {
          // Find the tspan with the correct class within the group
          const valueTspan = labelTexts[index].element.querySelector('.donut-label-value');
          if (valueTspan) {
             const currentPercent = anime.get(animatable.target, 'percent') || 0;
             valueTspan.textContent = currentPercent.toFixed(1) + '%';
          }
        }
      });
    },
    // Animate a custom 'percent' property on the group for the update function
    percent: (el, i) => [0, labelTexts[i].value]
  }, '-=1000');

  // --- End Animation Timeline ---


  // Enhanced Hover and Click Animations
  segmentPaths.forEach((path, i) => {
    const arcData = data[i]; // Get corresponding data object

    // Pre-calculate hover transformations
    const midAngle = arcData.startAngle + (arcData.endAngle - arcData.startAngle) / 2;
    const hoverDistance = 8; // How far the segment pops out
    const rad = (midAngle - 90) * Math.PI / 180;
    const translateX = hoverDistance * Math.cos(rad);
    const translateY = hoverDistance * Math.sin(rad);

    // Get other paths for dimming effect
    const otherPaths = segmentPaths.filter((_, idx) => idx !== i);

    path.addEventListener('mouseenter', () => {
      // Stop any ongoing animations on this path and others before starting new ones
      anime.remove([path, ...otherPaths]);

      // Animate hovered path
      anime({
        targets: path,
        transform: `translate(${translateX}px, ${translateY}px) scale(1.03)`, // Pop out and slightly scale
        filter: `drop-shadow(0 0 18px ${arcData.color}B3)`, // Brighter shadow
        duration: 250,
        easing: 'easeOutQuad'
      });
      // Animate other paths
      anime({
        targets: otherPaths,
        opacity: 0.5,
        scale: 0.97,
        filter: `drop-shadow(0 0 5px rgba(0,0,0,0.2))`, // Dimmer shadow
        duration: 250,
        easing: 'easeOutQuad'
      });
    });

    path.addEventListener('mouseleave', () => {
      // Stop any ongoing animations
      anime.remove([path, ...otherPaths]);

      // Animate hovered path back
      anime({
        targets: path,
        transform: 'translate(0px, 0px) scale(1)',
        filter: `drop-shadow(0 0 8px ${arcData.color}33)`, // Restore original shadow
        duration: 300,
        easing: 'easeOutQuad'
      });
      // Animate other paths back
      anime({
        targets: otherPaths,
        opacity: 1, // Assuming initial opacity is 1 after entrance animation
        scale: 1,
        filter: (el) => { // Restore individual original shadows
            const originalIndex = segmentPaths.indexOf(el);
            if (originalIndex !== -1) {
                return `drop-shadow(0 0 8px ${data[originalIndex].color}33)`;
            }
            return `drop-shadow(0 0 5px rgba(0,0,0,0.2))`; // Fallback
        },
        duration: 300,
        easing: 'easeOutQuad'
      });
    });

    path.addEventListener('click', () => {
       // Stop existing animations on the clicked path
      anime.remove(path);

      // Click animation: More pronounced pop with a bounce
      const clickDistance = 15;
      const clickTranslateX = clickDistance * Math.cos(rad);
      const clickTranslateY = clickDistance * Math.sin(rad);

      anime({
        targets: path,
        transform: [
            { value: `translate(${clickTranslateX}px, ${clickTranslateY}px) scale(1.06)`, duration: 200, easing: 'easeOutQuad' }, // Pop out
            { value: `translate(${translateX * 0.8}px, ${translateY * 0.8}px) scale(0.98)`, duration: 150, easing: 'easeInOutQuad' }, // Slightly overshoot back
            { value: `translate(${translateX}px, ${translateY}px) scale(1.03)`, duration: 300, easing: 'spring(1, 90, 15, 0)' } // Settle into hover state
        ],
        filter: `drop-shadow(0 0 18px ${arcData.color}B3)`, // Keep bright shadow (as it ends in hover state)
        duration: 650 // Total duration
      });

      // Ensure other paths remain dimmed if the click happens during hover
      anime({
        targets: otherPaths,
        opacity: 0.5,
        scale: 0.97,
        filter: `drop-shadow(0 0 5px rgba(0,0,0,0.2))`,
        duration: 200, // Quickly ensure they are dimmed
        easing: 'easeOutQuad'
      });

      // Optionally, trigger data display logic here
      // showAllocationInfo(arcData.label, arcData.value);
    });
  });

  // Clear and insert SVG
  const chartContainer = document.getElementById('allocation-chart');
  if (!chartContainer) {
      console.error('Chart container #allocation-chart not found!');
      return;
  }
  chartContainer.innerHTML = '';
  chartContainer.appendChild(svg);
}

// --- Animated Glow Background for Allocation Chart ---
function runAllocationGlowBgAnimation() {
    const canvas = document.getElementById('allocation-glow-bg');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    function resize() {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
    }
    resize();
    window.addEventListener('resize', resize);
    let t = 0;
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Center and radii
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const maxR = Math.min(canvas.width, canvas.height) * 0.45;
        // Animate a pulsing blue glow
        const pulse = 0.15 + 0.08 * Math.sin(t / 40);
        const gradient = ctx.createRadialGradient(cx, cy, maxR * (0.2 + pulse), cx, cy, maxR);
        gradient.addColorStop(0, 'rgba(59,130,246,0.18)');
        gradient.addColorStop(0.4, 'rgba(59,130,246,0.10)');
        gradient.addColorStop(1, 'rgba(59,130,246,0.01)');
        ctx.beginPath();
        ctx.arc(cx, cy, maxR, 0, 2 * Math.PI);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();
        t++;
        requestAnimationFrame(draw);
    }
    draw();
}

document.addEventListener('DOMContentLoaded', () => {
    runAllocationGlowBgAnimation();
});

// <<< DELETE THE DOMContentLoaded listener below >>>
/*
document.addEventListener('DOMContentLoaded', () => {
  renderAnimeDonutChart(donutData);

  // Run initial page load animations, then add 'loaded' class to body
  runInitialLoadAnimations().then(() => {
    document.body.classList.add('loaded');
    // Optionally, hide the loading screen if you use one
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      loadingScreen.classList.add('hidden');
    }
  });
});
*/ 