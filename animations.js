/**
 * animations.js
 * Contains animation logic using anime.js or other libraries/techniques.
 */

// Helper function to format numbers with commas (needed for counter)
function formatNumberWithCommas(number) {
    // Handle null or undefined gracefully
    if (number === null || number === undefined) return '';
    // Ensure it's a string before replacing
    return String(number).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Function to animate a number counting up to a target value
function animateNumberCounter(element, targetValue, duration = 1200, isPercentage = true) {
    if (!element) return; // Guard against null elements

    // Parse the target value (removing % or $ sign if present)
    let target;
    let isDollar = false;
    let originalText = String(targetValue); // Keep original format for final set

    if (typeof targetValue === 'string') {
        isDollar = targetValue.includes('$');
        target = parseFloat(targetValue.replace(/[$,%]/g, '').replace(/,/g, ''));
    } else {
        target = targetValue;
    }

    // If the target isn't a valid number, set original text and exit
    if (targetValue === null || targetValue === undefined || isNaN(target)) {
        element.textContent = originalText; // Use original string if parsing fails or input is invalid
        return;
    }

    // Use anime.js for smooth animation
    let current = { value: 0 }; // Start from 0
    anime({
        targets: current,
        value: target,
        round: isDollar ? 100 : 100, // Round to 2 decimal places
        duration: duration,
        easing: 'easeOutCubic', // Smoother easing
        update: function() {
            let displayValue = current.value;
            if (isDollar) {
                element.textContent = '$' + formatNumberWithCommas((displayValue / 100).toFixed(2));
            } else if (isPercentage) {
                element.textContent = (displayValue / 100).toFixed(2) + '%';
            } else {
                element.textContent = (displayValue / 100).toFixed(2);
            }
        },
        complete: function() {
            // Ensure the final value matches the original text exactly
            element.textContent = originalText;
        }
    });
}

// Function to animate percentage/dollar values in tables
function animateTableValues() {
    console.log("Running animateTableValues...");
    // Find all table cells that likely contain numbers to animate
    const tableCells = document.querySelectorAll('#daily-table-body td, #valuation-detail-body td, #calculationResultsBody td, #desktop-dollar-returns-body td, #desktop-dollar-valuation-body td');
    let animationDelay = 0;

    tableCells.forEach((cell, index) => {
        const text = cell.textContent.trim();
        const isNumericCell = (text.includes('%') || text.includes('$') || /^[\d.,-]+$/.test(text)) && text !== '-' && text !== '' && text !== 'Total';

        if (isNumericCell) {
            // Save original class to preserve styling (positive/negative)
            const originalClass = cell.className;
            const targetValue = text;
            const isPercentage = text.includes('%');
            const isDollar = text.includes('$');

            // Reset visually (optional, can cause flicker)
            // if (isPercentage) cell.textContent = '0.00%';
            // else if (isDollar) cell.textContent = '$0.00';
            // else cell.textContent = '0.00';

            // Apply animation with a stagger
            // Use a slightly longer stagger delay
            setTimeout(() => {
                 // Ensure the class is preserved during animation
                 cell.className = originalClass;
                 animateNumberCounter(cell, targetValue, 1500, isPercentage);
            }, 100 + index * 15); // Stagger animation start
        }
    });
}

// Main function to trigger all page load animations
function runPageLoadAnimations() {
    console.log("Running page load animations...");
    // Animate summary values first
    const summaryItems = document.querySelectorAll('.summary-item p');
    summaryItems.forEach((item, index) => {
        const targetValue = item.textContent; // Get value populated by script.js
        // Check if it's a valid value before animating
         if (targetValue && targetValue !== '--%' && targetValue !== '--') {
             item.textContent = '0.00%'; // Start at zero
             // Stagger the summary animations
             setTimeout(() => {
                 animateNumberCounter(item, targetValue, 1000 + index * 100, true);
             }, 200 * index);
         }
    });

    // Delay table animations slightly after summary
    setTimeout(() => {
        animateTableValues();
    }, 500); // Delay after summary starts

    // Add other complex animations here if needed (e.g., chart intro animations)
} 