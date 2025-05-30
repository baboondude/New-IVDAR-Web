// ================================================================
//  DOM & Formatting Helpers
// ================================================================

// --- Global/Module Scope Variables ---
let assetsData = [];
let metaData = {};
let allocationChart = null;
let valuationChart = null;
let currentAllocationChartType = 'donut'; // Default to donut
let currentPopupIndex = null; // <<< ADDED: Track index shown in allocation popup
let isDataLoading = false; // Track loading state

// --- Add map to store chart instances ---
const chartInstances = {}; // Store chart instances by ID

// --- Briefly uncollapse the refresh bar as a subtle indicator ---
function brieflyUncollapseRefreshBar() {
    const refreshBar = document.querySelector('.refresh-container-sticky');
    if (!refreshBar) return;
    refreshBar.classList.remove('collapsed');
    // If user is hovering/focused, don't collapse again
    if (refreshBar.matches(':hover') || refreshBar.contains(document.activeElement)) return;
    setTimeout(() => {
        if (!refreshBar.matches(':hover') && !refreshBar.contains(document.activeElement)) {
            refreshBar.classList.add('collapsed');
        }
    }, 1200); // 1.2 seconds, adjust as desired
}

// Order the assets exactly the way the UI expects
const ASSET_ORDER = ["SP500", "NASDAQ", "International", "Bonds", "Money Market"];

// --- End Scope Variables ---

// Function to ensure the refresh button is in its initial state when the page loads
document.addEventListener('DOMContentLoaded', async function() {
    // Set refresh button to show constant loading state
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.innerHTML = '<span class="spinner-sm"></span> <span class="refresh-btn-label">IVDAR Sheet API</span>';
        refreshBtn.classList.add('is-loading');
        
        // --- Modified Auto-Refresh Logic ---
        const autoRefreshInterval = 60000; // 60 seconds

        const runAutoRefresh = async () => {
            console.log("Auto-refreshing data...");
            try {
                // Fetch new data only if not already loading
                if (!isDataLoading) { // Check flag before fetching
                    const success = await fetchBackendData(); // Don't pass isInitialLoad=true here

                    if (success) {
                        // Rebuild charts with the new data
                        const chartData = buildSeries();

                        // Update all UI components
                        await populateSummaryAndBadges(true); // Pass isRefresh=true
                        await populateTables(true);         // Pass isRefresh=true
                        await updateCharts(chartData);

                        // Update portfolio calculator if it's been used
                        const portfolioValueInput = document.getElementById('portfolioValue');
                        if (portfolioValueInput && portfolioValueInput.value) {
                            const portfolioValue = parseFormattedNumber(portfolioValueInput.value);
                            if (!isNaN(portfolioValue) && portfolioValue > 0) {
                                updateDollarReturnSection(portfolioValue);
                                updateDollarValuationSection(portfolioValue);
                            }
                        }

                        console.log("Auto-refresh completed successfully");
                        brieflyUncollapseRefreshBar(); // Briefly show the bar on success
                    }
                } else {
                    console.log("Skipping auto-refresh: previous fetch still in progress.");
                }
            } catch (error) {
                console.error("Error during auto-refresh:", error);
                // Potentially display a non-intrusive error indicator
            } finally {
                // Schedule the next refresh regardless of success/failure/skip
                setTimeout(runAutoRefresh, autoRefreshInterval);
                console.log(`Next auto-refresh scheduled in ${autoRefreshInterval / 1000} seconds.`);
            }
        };

        // Start the first auto-refresh after an initial delay (e.g., after the first manual fetch completes)
        // Or just start it after the interval period. Let's start after the interval.
        setTimeout(runAutoRefresh, autoRefreshInterval);
        // --- End Modified Auto-Refresh Logic ---
    }

    // --- Auto-collapse refresh bar logic ---
    const refreshBar = document.querySelector('.refresh-container-sticky');
    let collapseTimeout;
    let isCollapsed = false;
    let mouseNearBar = false;

    function collapseBar() {
        if (refreshBar && !isCollapsed) {
            refreshBar.classList.add('collapsed');
            isCollapsed = true;
        }
    }
    function expandBar() {
        if (refreshBar && isCollapsed) {
            refreshBar.classList.remove('collapsed');
            isCollapsed = false;
        }
    }
    function resetCollapseTimer() {
        clearTimeout(collapseTimeout);
        collapseTimeout = setTimeout(collapseBar, 3000); // 3 seconds
    }

    // Start timer after page load
    resetCollapseTimer();

    // Expand bar if mouse moves near the top right (within 80px from top and rightmost 300px)
    document.addEventListener('mousemove', function(e) {
        const viewportWidth = window.innerWidth;
        if (e.clientY < 80 && e.clientX > viewportWidth - 300) {
            if (!mouseNearBar) {
                expandBar();
                mouseNearBar = true;
            }
            resetCollapseTimer();
        } else {
            mouseNearBar = false;
        }
    });

    // Also expand on focus/hover of the bar or its children
    if (refreshBar) {
        refreshBar.addEventListener('mouseenter', function() {
            expandBar();
            resetCollapseTimer();
        });
        refreshBar.addEventListener('focusin', function() {
            expandBar();
            resetCollapseTimer();
        });
    }

    // Prevent collapse while mouse is over the bar
    if (refreshBar) {
        refreshBar.addEventListener('mouseleave', function() {
            resetCollapseTimer();
        });
    }

    // --- Allocation Chart Scroll Expansion/Contraction ---
    const allocationChartEl = document.getElementById('allocation-chart');
    if (allocationChartEl) {
        let lastState = null;
        let scrollTimeout = null;
        function handleChartScroll() {
            if (!allocationChartEl) return;
            const rect = allocationChartEl.getBoundingClientRect();
            const windowHeight = window.innerHeight || document.documentElement.clientHeight;
            // Chart is considered 'near' if its center is within 200px of viewport center
            const chartCenter = rect.top + rect.height / 2;
            const viewportCenter = windowHeight / 2;
            const distance = Math.abs(chartCenter - viewportCenter);
            const threshold = 200;
            if (distance < threshold) {
                if (lastState !== 'expanded') {
                    allocationChartEl.classList.add('expanded');
                    allocationChartEl.classList.remove('shrunk');
                    lastState = 'expanded';
                }
            } else {
                if (lastState !== 'shrunk') {
                    allocationChartEl.classList.add('shrunk');
                    allocationChartEl.classList.remove('expanded');
                    lastState = 'shrunk';
                }
            }
        }
        // Debounce for performance
        function debouncedScroll() {
            if (scrollTimeout) clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(handleChartScroll, 20);
        }
        window.addEventListener('scroll', debouncedScroll, { passive: true });
        window.addEventListener('resize', debouncedScroll);
        // Initial state
        setTimeout(handleChartScroll, 300);
    }
});

// Helper to normalise strings for comparison (trim, lowercase, collapse whitespace)
function normalise(str) {
    if (str === null || str === undefined) {
        return "";
    }
    return String(str)
           .replace(/\s+/g, " ")   // collapse runs of spaces / NBSPs / tabs / newlines to single space
           .trim()                 // drop leading & trailing
           .toLowerCase();
}

// Helper to extract single values hidden in the assets array (uses global assetsData)
function getExtra(label) {
    if (!Array.isArray(assetsData)) {
        console.error("getExtra called but assetsData is not an array");
        return null;
    }
    const wanted = normalise(label);
    const row = assetsData.find(r =>
        r && r.gaussian_estimate && normalise(r.gaussian_estimate) === wanted
    );
    // Ensure 'extra' exists and is not null/undefined before converting to Number
    return row && row.extra !== null && row.extra !== undefined ? Number(row.extra) : null;
}

function setText(sel, txt) {
    const node = document.querySelector(sel);
    if (node) node.textContent = txt;
}

// Format helpers
const pct = n => {
    const x = Number(n);
    if (isNaN(x)) return "--";
    return x > 1 ? `${x.toFixed(2)}%`     // already a %
                 : `${(x * 100).toFixed(2)}%`; // fraction → %
};
const num = n => {
    if (n === null || n === undefined || isNaN(Number(n))) return "--"; // Handle non-numeric input gracefully
    return Number(n).toLocaleString("en-US"); // Ensure n is a number
}
const dateFmt = iso => iso ? new Date(iso).toLocaleDateString() : "-";

// Helper function to format numbers with commas (for calculator input)
function formatInputWithCommas(numberString) {
    if (!numberString) return '';
    const parts = numberString.split('.');
    parts[0] = parts[0].replace(/\\B(?=(\\d{3})+(?!\\d))/g, ",");
    return parts.join('.');
}

// Helper to parse formatted number string (e.g., "100,000.50") into a float
function parseFormattedNumber(numberString) {
    if (!numberString) return NaN;
    
    try {
        // Handle different types of input
        if (typeof numberString === 'number') {
            return numberString; // Already a number, return as is
        }
        
        // Normalize string - remove currency symbols, commas, and other formatting
        const normalizedString = String(numberString)
            .replace(/[$€£¥]/g, '') // Remove common currency symbols
            .replace(/,/g, '')      // Remove thousand separators
            .replace(/\s/g, '')     // Remove spaces
            .trim();
        
        // Handle European-style decimals (replace , with .)
        // Only do this if there's exactly one comma and it appears to be a decimal separator
        if (normalizedString.indexOf(',') !== -1 && normalizedString.indexOf('.') === -1) {
            const parts = normalizedString.split(',');
            if (parts.length === 2 && parts[1].length <= 2) {
                // Likely a decimal separator
                return parseFloat(normalizedString.replace(',', '.'));
            }
        }
        
        // Standard parsing
        return parseFloat(normalizedString);
    } catch (error) {
        console.error("Error parsing number:", numberString, error);
        return NaN;
    }
}

// Currency formatter
const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2
});

// ================================================================


// Chart Options Helper
function getChartOptions(theme) { // Theme parameter is likely unused now, consider removing later
    // Helper to get CSS variable value with a fallback
    const getVar = (varName, fallback) => getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || fallback;

    // --- Fetch Theme Colors from CSS Variables ---
    const textColor = getVar('--text-color', '#E5E7EB'); // Example fallback: text-gray-200
    const mutedColor = getVar('--text-muted-color', '#9CA3AF'); // Example fallback: text-gray-400
    const gridColor = getVar('--border-color', '#4B5563'); // Example fallback: border-gray-600
    const accentColor = getVar('--accent-color', '#3B82F6'); // Example fallback: blue-500
    const fontFamily = getVar('--font-family', 'Inter, sans-serif');

    const chartColors = [
        getVar('--chart-color-1', '#3B82F6'), // Blue-500
        getVar('--chart-color-2', '#60A5FA'), // Blue-400
        getVar('--chart-color-3', '#FBBF24'), // Amber-400
        getVar('--chart-color-4', '#8B5CF6'), // Purple-500
        getVar('--chart-color-5', '#10B981')  // Emerald-500
    ];
    const chartColorsDark = [
        getVar('--chart-color-1-dark', '#2563EB'), // Blue-600
        getVar('--chart-color-2-dark', '#3B82F6'), // Blue-500
        getVar('--chart-color-3-dark', '#F59E0B'), // Amber-500
        getVar('--chart-color-4-dark', '#7C3AED'), // Purple-600
        getVar('--chart-color-5-dark', '#059669')  // Emerald-600
    ];

    const tooltipBgColor = getVar('--tooltip-bg-color', 'rgba(31, 41, 55, 0.85)'); // Example fallback: bg-gray-800 with opacity
    const tooltipBorderColor = getVar('--tooltip-border-color', '#6B7280'); // Example fallback: gray-500
    const tooltipTextColor = getVar('--tooltip-text-color', '#F3F4F6'); // Example fallback: gray-100
    const legendHoverColor = getVar('--legend-hover-color', '#FFFFFF'); // Example fallback: white

   return {
        // Use fetched theme colors
        colors: chartColors,
        colorsDark: chartColorsDark, // Pass dark shades too
        chart: {
            foreColor: textColor,
            toolbar: { show: false },
            animations: { 
               enabled: true, 
               speed: 800,
               animateGradually: {
                   enabled: true,
                   delay: 150
               },
               dynamicAnimation: {
                   enabled: true,
                   speed: 350
               }
            },
            fontFamily: fontFamily,
            background: 'transparent',
            dropShadow: {
               enabled: true,
               top: 3,
               left: 3,
               blur: 5,
               color: '#000',
               opacity: 0.2
            }
        },
        grid: {
            borderColor: gridColor,
            strokeDashArray: 3,
            position: 'back',
            xaxis: {
               lines: {
                   show: true,
                   opacity: 0.1
               }
            },
            yaxis: {
               lines: {
                   show: true,
                   opacity: 0.1
               }
            },
            padding: {
                top: 10,
                right: 10, 
                bottom: 10,
                left: 10
            }
        },
        xaxis: {
            labels: {
               style: {
                   colors: mutedColor,
                   fontSize: '12px',
                   fontWeight: 500
               }
            },
            axisBorder: { show: false },
            axisTicks: { show: true, color: gridColor, height: 4 },
            title: {
               style: {
                   color: mutedColor,
                   fontSize: '12px',
                   fontWeight: 500
               }
            },
            crosshairs: {
               show: true,
               position: 'back',
               stroke: {
                   color: accentColor,
                   width: 1,
                   dashArray: 3
               }
            }
        },
        yaxis: {
            labels: {
               style: {
                   colors: mutedColor,
                   fontSize: '12px',
                   fontWeight: 500
               },
               formatter: (value) => { return value.toFixed(1) + '%' }
            },
            title: {
               style: {
                   color: mutedColor,
                   fontSize: '12px',
                   fontWeight: 500
               }
            }
        },
        tooltip: {
            // theme: 'dark', // Let background/text colors define the theme implicitly
            backgroundColor: tooltipBgColor, // Use variable
            borderColor: tooltipBorderColor, // Use variable
            style: {
               color: tooltipTextColor, // Use variable
               fontSize: '12px',
               fontFamily: fontFamily
           },
           x: { show: true },
           marker: { 
               show: true,
               fillColors: ["#3B82F6", "#60A5FA", "#FBBF24", "#8B5CF6"]
           },
           custom: function({ series, seriesIndex, dataPointIndex, w }) {
               // --- ADDED: Check if the data point value exists and is a number ---
               const value = series[seriesIndex] && series[seriesIndex][dataPointIndex];
               const formattedValue = (typeof value === 'number' && !isNaN(value)) 
                   ? value.toFixed(2) + '%' 
                   : '--'; // Display '--' if value is not a valid number

               // Check if series name exists
               const seriesName = w.config.series[seriesIndex]?.name || ''; // Use optional chaining and provide default

               return '<div class="custom-tooltip">' +
                   '<span class="tooltip-marker" style="background-color:' + 
                   w.config.colors[seriesIndex % w.config.colors.length] + '"></span>' + // Added modulo for safety
                   '<span class="tooltip-series">' + seriesName + ': </span>' +
                   '<span class="tooltip-value">' + formattedValue + '</span>' +
                   '</div>';
           }
        },
        legend: {
             fontFamily: fontFamily,
             fontSize: '12px',
             labels: { colors: mutedColor }, // Keep using fetched mutedColor
             itemMargin: {
               horizontal: 10,
               vertical: 5
             },
             markers: {
                width: 12,
                height: 12,
                radius: 6,
                offsetY: 1
              },
              onItemClick: {
                toggleDataSeries: false
              }
        },
        title: { 
            style: {
                fontSize: '18px', 
                fontWeight: '600',
                fontFamily: fontFamily,
                color: textColor
            }
        },
        stroke: {
           width: 3,
           curve: 'smooth',
           lineCap: 'round'
        },
        plotOptions: {
           bar: {
               horizontal: false,
               columnWidth: '55%',
               endingShape: 'rounded',
               borderRadius: 5,
               dataLabels: {
                   position: 'top',
               },
           },
           pie: {
               donut: {
                   size: '65%',
                   background: 'transparent',
                   labels: {
                       show: true,
                       name: {
                           show: true,
                           fontSize: '14px',
                           fontWeight: 600,
                           offsetY: -8,
                           color: textColor
                       },
                       value: {
                           show: true,
                           fontSize: '24px',
                           fontWeight: 700,
                           offsetY: 4,
                           color: textColor
                       },
                       total: {
                            show: true,
                            color: textColor,
                            fontWeight: 700,
                            fontSize: '16px',
                            label: 'Total'
                       }
                   }
               }
           },
           radialBar: {
               hollow: {
                   margin: 15,
                   size: '70%'
               },
               track: {
                   background: 'rgba(255, 255, 255, 0.1)',
                   strokeWidth: '97%'
               },
               dataLabels: {
                   name: {
                       fontSize: '14px',
                       color: textColor,
                       offsetY: 10
                   },
                   value: {
                       fontSize: '24px',
                       fontWeight: 700,
                       color: textColor
                   }
               }
           }
       },
       fill: {
           type: 'gradient',
           gradient: {
               shade: 'dark',
               type: 'diagonal', // More dynamic than horizontal
               shadeIntensity: 0.7,
               gradientToColors: [
                   getComputedStyle(document.documentElement).getPropertyValue('--chart-color-1-dark').trim(),
                   getComputedStyle(document.documentElement).getPropertyValue('--chart-color-2-dark').trim(),
                   getComputedStyle(document.documentElement).getPropertyValue('--chart-color-3-dark').trim(),
                   getComputedStyle(document.documentElement).getPropertyValue('--chart-color-4-dark').trim(),
                   getComputedStyle(document.documentElement).getPropertyValue('--chart-color-5-dark').trim()
               ],
               inverseColors: false,
               opacityFrom: 0.95,
               opacityTo: 0.85,
               stops: [0, 100]
           }
       },
       dataLabels: {
           enabled: false,
            style: {
                fontSize: '11px',
                fontFamily: fontFamily,
                fontWeight: '600',
                colors: ['#fff']
            },
            dropShadow: {
               enabled: true, top: 1, left: 1, blur: 2, color: '#000', opacity: 0.5
            }
       },
       states: {
           hover: {
               filter: {
                   type: 'lighten',
                   value: 0.12
               }
           },
           active: {
               filter: {
                   type: 'darken',
                   value: 0.12
               }
           }
       }
    };
}

// --- Allocation Chart (Donut) ---
const initialTotalLabelOptions = {
   show: false, // Hide the center label completely
   label: 'Total Stock',
   color: getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim(),
   formatter: function (w) {
       const stockTotal = w.globals.series
           .slice(0, 3) // SP500, NASDAQ, International
           .reduce((a, b) => a + b, 0);
       return stockTotal.toFixed(2) + '%'
   }
};

// --- Base Donut Options ---
const baseDonutOptions = {
   ...getChartOptions('dark'),
    // series and labels will be set dynamically
    chart: {
       ...getChartOptions('dark').chart, // Inherits base options
        type: 'donut',
        height: 360,
        events: {
            // --- Event listeners will be added dynamically after chart creation ---
        },
        dropShadow: { // <<< Override the default shadow for donut
           enabled: true,
           top: 4,      // Slightly more offset
           left: 4,     // Slightly more offset
           blur: 8,     // Increased blur
           color: '#000',
           opacity: 0.3 // Increased opacity
        }
    },
    tooltip: { // Restore the custom tooltip function
        ...getChartOptions('dark').tooltip, // Inherit base tooltip styles
        enabled: true,
        custom: function ({ seriesIndex, w }) {
            // Ensure data exists before trying to access it
            if (!w || !w.globals || !w.globals.series || !w.globals.labels || seriesIndex === undefined) {
                return ''; // Return empty if data is not ready
            }
            const value = w.globals.series[seriesIndex];
            const label = w.globals.labels[seriesIndex];
            // Safely access details data
            const description = allocationDetailsData?.descriptions?.[label] || '';
            const risk = allocationDetailsData?.risks?.[label] || 'N/A';
            const horizon = allocationDetailsData?.horizons?.[label] || 'N/A';
            const color = (w.config.colors && w.config.colors[seriesIndex]) ? w.config.colors[seriesIndex] : '#ccc'; // Fallback color

            // Check if value is a valid number before formatting
            const formattedValue = typeof value === 'number' ? value.toFixed(2) : 'N/A';

            return `
                <div class="apexcharts-tooltip-custom" style="padding: 10px 15px; background: var(--card-bg-color); border: 1px solid var(--border-color); border-radius: var(--border-radius-sm); color: var(--text-color);"> 
                    <div style="font-weight:600; margin-bottom:5px; display: flex; align-items: center;">
                        <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color:${color}; margin-right: 8px;"></span>
                        ${label}
                    </div>
                    <div style="font-size:18px; font-weight:700; margin-bottom:8px; padding-left: 18px;">${formattedValue}%</div>
                    <div style="font-size:11px; color: var(--text-muted-color); margin-bottom:8px; padding-left: 18px;">${description}</div>
                    <div style="font-size:11px; margin-top:5px; padding-left: 18px;">
                        <span class="tag risk-${risk.toLowerCase().replace(/[\s_]+/g, '-')}" style="margin-right: 5px;">${risk} Risk</span>
                        <span class="tag horizon-tag">${horizon}</span>
                    </div>
                </div>
            `;
        }
    },
    plotOptions: {
        pie: {
            donut: {
                size: '65%',
                background: 'transparent',
               labels: {
                    show: false, // Hide center labels completely
                    total: {
                        show: false,
                    }
               }
            },
            customScale: 0.9,
            offsetY: 10,
            expandOnClick: false
        }
    },
    legend: {
        position: 'bottom',
        fontSize: '16px', // Increased from 12px
        fontWeight: 700,  // Bolder
        labels: {
            colors: ['#fff'], // High contrast white
        },
        onItemClick: {
            toggleDataSeries: false
        },
        onItemHover: {
            highlightDataSeries: false
        },
        markers: {
            width: 16, // Larger marker
            height: 16, // Larger marker
            radius: 8   // More circular
        }
    },
     stroke: {
        show: true,
        width: 2,
        colors: ['rgba(0,0,0,0.1)']
    },
   states: {
       hover: {
           filter: {
                type: 'none' // Disable default Apex hover filter
           }
       },
       active: {
           filter: {
                type: 'darken',
                value: 0.15
           }
       }
    },
    fill: {
        type: 'gradient',
        gradient: {
            shade: 'dark',
            type: 'horizontal',
            shadeIntensity: 0.5,
            opacityFrom: 1,
            opacityTo: 0.9,
            stops: [0, 100]
        }
    },
    dataLabels: {
        enabled: true,
       formatter: function(val, opts) {
            // Ensure series and seriesIndex are valid before accessing
            if (opts && opts.w && opts.w.globals && opts.w.globals.series && opts.seriesIndex !== undefined && opts.w.globals.series[opts.seriesIndex] !== undefined) {
           return opts.w.globals.series[opts.seriesIndex].toFixed(1) + '%';
            } 
            return ''; // Return empty string if data is missing
        },
        style: {
            fontSize: '18px',
            fontWeight: '500',
            fontFamily: getComputedStyle(document.documentElement).getPropertyValue('--font-family').trim()
       },
       dropShadow: {
           enabled: true,
           top: 1,
           left: 1,
           blur: 2,
            color: '#000',
            opacity: 0.45
        }
    }
    // ... other donut specific options
};

// --- Base Bar Options (for Allocation) ---
const baseBarOptions = {
    ...getChartOptions('dark'),
    series: [10.23, 33.84, 27.70, 3.57, 24.67],
    chart: {
        ...getChartOptions('dark').chart,
        type: 'bar',
        height: 350, // Keep height consistent
        events: {
             // --- Event listeners will be added dynamically after chart creation ---
        }
    },
    plotOptions: {
        bar: {
            distributed: true,
            borderRadius: 6,
            columnWidth: '60%', // Thicker bars
            dataLabels: {
                position: 'top'
            }
        }
    },
    dataLabels: {
        enabled: true,
        formatter: function(val) { return val.toFixed(1) + '%'; },
        offsetY: -20,
        style: { fontSize: '10px', colors: ["#fff"], fontWeight: 600 }
    },
    legend: { show: false },
    xaxis: {
        type: 'category',
        // categories: allocations.labels, // Will be set dynamically
        labels: {
            show: true, rotate: -45, rotateAlways: false, hideOverlappingLabels: true, style: { fontSize: '12px' }
        }
    },
    yaxis: {
        title: { text: 'Allocation (%)' },
        labels: { formatter: function(val) { return val.toFixed(1) + '%'; } },
        min: 0, // Prevent negative values on y-axis
        max: function(max) { return Math.max(Math.ceil(max), 40); }
    },
    states: {
        hover: {
            filter: {
                type: 'lighten',
                value: 0.12
            }
        },
        active: {
            filter: {
                type: 'darken',
                value: 0.15
            }
        }
    },
    fill: {
        type: 'gradient',
        gradient: {
            shade: 'dark',
            type: 'vertical',
            shadeIntensity: 0.2,
            opacityFrom: 1,
            opacityTo: 0.9,
            stops: [0, 100]
        }
    },
    tooltip: {
        y: {
            formatter: function(val) {
                return val.toFixed(2) + '%';
            }
       }
   }
};

// --- Estimated Returns Chart Data (Scenarios) ---
let baseReturns = {
   description: "Expected market returns based on historical averages and current conditions.",
   // Series data will be populated after fetch
   series: [{ name: 'Growth', data: [] }, { name: 'Dividends', data: [] }, { name: 'Total Return', data: [] }],
};
let optimisticReturns = {
   description: "Potential returns in a strong market environment with favorable economic factors.",
   // Static example data - SHOULD BE DYNAMICALLY CALCULATED OR FETCHED ideally
   series: [{ name: 'Growth', data: [6.5, 14.0, 4.0, 0.1] }, { name: 'Dividends', data: [1.3, 0.7, 3.4, 4.4] }, { name: 'Total Return', data: [7.8, 14.7, 7.4, 4.5] }]
};
let pessimisticReturns = {
    description: "Potential returns in a weaker market with economic headwinds or corrections.",
    // Static example data - SHOULD BE DYNAMICALLY CALCULATED OR FETCHED ideally
    series: [{ name: 'Growth', data: [1.0, 3.5, 0.5, -0.1] }, { name: 'Dividends', data: [1.2, 0.6, 3.2, 4.0] }, { name: 'Total Return', data: [2.2, 4.1, 3.7, 3.9] }]
};

// --- Estimated Returns Chart Options ---
// Note: BND is excluded due to #DIV/0! in original data
const returnsOptions = {
   ...getChartOptions('dark'), // Start with base options
   series: baseReturns.series, // Initialize with base case data
   chart: {
       ...getChartOptions('dark').chart, // Inherit base chart options
       type: 'bar',
       height: 380, // Increased height
       stacked: false,
       toolbar: {
           show: false
       }
   },
   plotOptions: {
       bar: {
           horizontal: false,
           columnWidth: '55%', // Reduced width to create more space between bars
           borderRadius: 4, // Adjusted radius
           endingShape: 'rounded',
           dataLabels: {
               position: 'top',
           }
       },
   },
   dataLabels: {
       enabled: true, // Enable data labels for bars
       offsetY: -24, // Adjusted offset for better positioning (was -20)
       style: {
           fontSize: '10px', // Slightly increased font size
           colors: ["#FFF"],
           fontWeight: 500 // Adjust weight
       },
       formatter: function (val) {
           // Handle potential null/undefined values gracefully
           return typeof val === 'number' ? val.toFixed(1) + "%" : '';
       },
       background: {
           enabled: false
       }
   },
   stroke: {
       show: true,
       width: 1,
       colors: ['transparent']
   },
   /* REMOVED: Redundant title within the chart card 
   title: {
       text: 'Est. 1-Year Return (%)',
       align: 'left',
       style: {
           color: getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim(), 
           fontSize: '16px'
       }
   },
   */
   xaxis: {
       ...getChartOptions('dark').xaxis, // Inherit base x-axis options
       categories: ['SP500', 'NASDAQ', 'Intl (IXUS)', 'MM'],
   },
   yaxis: {
       ...getChartOptions('dark').yaxis, // Inherit base y-axis options
       title: {
           text: '% Return'
       },
       labels: {
           ...getChartOptions('dark').yaxis.labels,
           formatter: function (val) {
               return val.toFixed(1) + "%";
           }
       }
   },
   fill: {
       type: 'gradient',
       gradient: {
           shade: 'dark',
           type: 'vertical',
           shadeIntensity: 0.2,
           gradientToColors: undefined,
           inverseColors: false,
           opacityFrom: 1,
           opacityTo: 0.85,
           stops: [0, 100]
       }
   },
   tooltip: {
       ...getChartOptions('dark').tooltip, // Inherit base tooltip options
       shared: true,
       intersect: false,
       y: {
           formatter: function (val) {
               return val.toFixed(2) + "%"
           }
       }
   },
   legend: {
       position: 'top',
       horizontalAlign: 'left',
       offsetX: 40
   }
}; 

// --- Market Valuation Data --- 
const initialValuationData = {
    categories: ['SP500', 'NASDAQ', 'Intl (IXUS)', 'Bonds (BND)'],
    seriesData: [17.34, 6.94, 0.77, -15.24],
    getColors: (data) => data.map(value => 
        value > 0 ? 'var(--negative-color)' : value < 0 ? 'var(--positive-color)' : 'var(--text-muted-color)'
    )
};
initialValuationData.colors = initialValuationData.seriesData.map(value => 
     value > 0 ? '#E53E3E' : value < 0 ? '#38A169' : '#A0AEC0'
);

// --- Data for allocation descriptions etc. --- 
const allocationDetailsData = {
    // Use ASSET_ORDER for consistency
    descriptions: {
        "SP500": "Large-cap U.S. equities (S&P 500 index).",
        "NASDAQ": "Tech-focused U.S. equities (NASDAQ index).",
        "International": "International stocks (developed & emerging).",
        "Bonds": "Fixed income securities for stability.",
        "Money Market": "Cash & equivalents, high liquidity."
    },
    risks: {
        "SP500": "Medium",
        "NASDAQ": "High",
        "International": "Medium-High",
        "Bonds": "Low",
        "Money Market": "Very Low"
    },
    horizons: {
        "SP500": "Long-term",
        "NASDAQ": "Long-term",
        "International": "Long-term",
        "Bonds": "Medium-term",
        "Money Market": "Short-term"
    }
};

// --- Animation Helper Functions for Allocation Chart ---

// Function to animate slice/legend hover state
function handleAllocationHover(index, shouldHighlight) {
    if (index === undefined || index < 0) return;

    const duration = 150;
    const easing = 'easeOutQuad';
    const scale = shouldHighlight ? 1.06 : 1;
    const fontWeight = shouldHighlight ? '600' : '500';
    const color = shouldHighlight ? getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim() : getComputedStyle(document.documentElement).getPropertyValue('--text-muted-color').trim();

    // Target the specific slice path (ApexCharts uses 'j' attribute for index)
    const sliceSelector = `#allocation-chart path.apexcharts-pie-slice[j='${index}']`;
    const sliceElement = document.querySelector(sliceSelector);
    if (sliceElement) {
        anime.remove(sliceElement); // Remove existing animations
        anime({
            targets: sliceElement,
            scale: scale,
            duration: duration,
            easing: easing,
            transformOrigin: '50% 50%' // Ensure scaling is from the center
        });
    }

    // Target the specific legend item (ApexCharts uses 'rel' attribute, 1-based)
    const legendSelector = `#allocation-chart .apexcharts-legend-series[rel='${index + 1}'] .apexcharts-legend-text`;
    const legendElement = document.querySelector(legendSelector);
    if (legendElement) {
        anime.remove(legendElement); // Remove existing animations
        anime({
            targets: legendElement,
            fontWeight: fontWeight,
            color: color, // Animate color for better feedback
            duration: duration,
            easing: easing
        });
    }
}

// Function to animate slice click
function animateAllocationClick(index) {
    if (index === undefined || index < 0) return;

    const sliceSelector = `#allocation-chart path.apexcharts-pie-slice[j='${index}']`;
    const sliceElement = document.querySelector(sliceSelector);
    if (sliceElement) {
        anime.remove(sliceElement);
        anime({
            targets: sliceElement,
            scale: [1, 1.1, 1], // Scale up then back down
            duration: 300,
            easing: 'easeInOutQuad',
            transformOrigin: '50% 50%'
        });
    }
}

// Function to update allocation details panel
function updateAllocationDetails(index) {
    const popupElement = document.querySelector('.allocation-container > .allocation-info');
    if (!popupElement || !allocationChart) {
        console.error("Allocation info popup or chart not found.");
        return;
    }

    // --- ADD: Manual Opacity Control --- 
    try {
        if (currentAllocationChartType === 'donut' && allocationChart.series && allocationChart.series[0]) {
            allocationChart.series[0].points.forEach((point, pointIndex) => {
                const newOpacity = (pointIndex === index) ? 1 : 0.4; // Selected = 1, others = 0.4
                point.update({ opacity: newOpacity }, false); // Update point opacity without redrawing yet
            });
            allocationChart.redraw(); // Redraw once after all points are updated
            console.log("Updated slice opacities.");
        } else if (currentAllocationChartType !== 'donut') {
            // If it's the bar chart, reset any potential lingering opacity settings (optional)
            // This part might need specific ApexCharts logic if opacity was ever manually set for bars
        }
    } catch (error) {
        console.error("Error updating point opacities:", error);
    }
    // --- END Manual Opacity Control --- 

    const isResetting = (index === undefined || index < 0);

    const titleElement = popupElement.querySelector('h3');
    const valueElement = popupElement.querySelector('.allocation-value');

    // Clear existing animations
    if (titleElement) anime.remove(titleElement);
    if (valueElement) anime.remove(valueElement);

    if (isResetting) {
        // This part might not be reached if index is always provided now
        popupElement.classList.remove('is-visible');
        // Reset opacities when resetting (handled by hideAllocationDetails now)
        return;
    }

    // --- Content Update Logic ---
    if (!titleElement || !valueElement) {
        console.error("Popup elements not found in updateAllocationDetails");
        return;
    }

    let label = 'N/A';
    let value = 0;

    // --- Access data based on the CURRENT chart type --- 
    try { 
        if (currentAllocationChartType === 'donut') {
            if (allocationChart.series && allocationChart.series[0] && allocationChart.series[0].data && allocationChart.series[0].data[index]) {
                const point = allocationChart.series[0].data[index];
                label = point.name;
                value = point.y; 
                console.log(`Highcharts Data - Label: ${label}, Value: ${value}`);
            } else {
                console.error("Could not access Highcharts data for index:", index);
                 // Reset opacities if we failed to get data for the popup
                 hideAllocationDetails(); 
                return;
            }
        } else { 
             if (allocationChart.w && allocationChart.w.globals) {
                 const series = allocationChart.w.globals.series; 
                 const labels = allocationChart.w.globals.labels; 
                 if (series && labels && index < series.length && index < labels.length) {
                     label = labels[index];
                     value = series[index];
                     console.log(`ApexCharts Data - Label: ${label}, Value: ${value}`);
                 } else {
                     console.error("Invalid index or missing ApexCharts data (w.globals).");
                     return;
                 }
             } else {
                  console.error("ApexCharts instance (allocationChart.w.globals) not found or invalid.");
                  return;
             }
         }
    } catch (error) {
        console.error("Error accessing chart data in updateAllocationDetails:", error);
        // Reset opacities if there was an error
        hideAllocationDetails();
        return; 
    }
    // --- End data access logic --- 

    const description = allocationDetailsData.descriptions[label] || '';
    const risk = allocationDetailsData.risks[label] || 'N/A';
    const horizon = allocationDetailsData.horizons[label] || 'N/A';

    titleElement.textContent = label;
    valueElement.innerHTML = `
            <div>${value.toFixed(2)}%</div>
            <div class="allocation-detail-text">${description}</div>
            <div class="allocation-metadata">
                <span class="tag risk-${risk.toLowerCase().replace(/[\s_]+/g, '-')}">${risk} Risk</span>
                <span class="tag horizon-tag">${horizon}</span>
            </div>
        `;

    // Find the asset data for the selected label
    const assetData = assetsData.find(a => a && a.asset && a.asset.split('(')[0].trim() === label);
    let statsHtml = '';
    if (assetData) {
        // Determine min/max for each stat among the 4 main funds
        const mainFunds = ["SP500", "NASDAQ", "International", "Bonds"];
        const statKeys = [
            { key: 'today', isPct: false },
            { key: 'intrinsic_value', isPct: false },
            { key: 'overprice', isPct: true },
            { key: 'target_allocation', isPct: true },
            { key: 'est_growth', isPct: true },
            { key: 'est_dividends', isPct: true },
            { key: 'est_total_return', isPct: true },
            { key: 'months_to_even', isPct: false }
        ];
        const fundStats = mainFunds.map(fund => {
            const asset = assetsData.find(a => a && a.asset && a.asset.split('(')[0].trim() === fund);
            return asset || {};
        });
        const minMax = {};
        statKeys.forEach(({key}) => {
            const values = fundStats.map(a => Number(a[key]));
            const validValues = values.filter(v => !isNaN(v));
            minMax[key] = {
                min: Math.min(...validValues),
                max: Math.max(...validValues)
            };
        });
        statsHtml = `
            <div class="allocation-custom-stats" style="margin-top:22px;">
                <table class="popup-stats-table" style="width:100%;font-size:1em;margin:0 auto;background:rgba(18,21,28,0.85);border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(59,130,246,0.08);">
                    <tbody>
                        <tr style='background:rgba(59,130,246,0.06);'>
                            <td style='padding:10px 8px;'><i class="fas fa-dollar-sign" style="color:var(--accent-color);margin-right:6px;"></i><span class='muted'>Current Price</span></td>
                            <td style='text-align:right;padding:10px 8px;${Number(assetData.today) === minMax.today.min ? "background:rgba(239,68,68,0.12);" : Number(assetData.today) === minMax.today.max ? "background:rgba(16,185,129,0.12);" : ""}' class='${Number(assetData.today) === minMax.today.min ? "negative" : Number(assetData.today) === minMax.today.max ? "positive" : ""}'>${num(assetData.today)}</td>
                        </tr>
                        <tr>
                            <td style='padding:10px 8px;'><i class="fas fa-balance-scale" style="color:var(--chart-color-4);margin-right:6px;"></i><span class='muted'>Intrinsic Value</span></td>
                            <td style='text-align:right;padding:10px 8px;${Number(assetData.intrinsic_value) === minMax.intrinsic_value.min ? "background:rgba(239,68,68,0.12);" : Number(assetData.intrinsic_value) === minMax.intrinsic_value.max ? "background:rgba(16,185,129,0.12);" : ""}' class='${Number(assetData.intrinsic_value) === minMax.intrinsic_value.min ? "negative" : Number(assetData.intrinsic_value) === minMax.intrinsic_value.max ? "positive" : ""}'>${num(assetData.intrinsic_value)}</td>
                        </tr>
                        <tr style='background:rgba(59,130,246,0.06);'>
                            <td style='padding:10px 8px;'><i class="fas fa-percentage" style="color:var(--negative-color);margin-right:6px;"></i><span class='muted'>Overprice</span></td>
                            <td style='text-align:right;padding:10px 8px;${Number(assetData.overprice) === minMax.overprice.max ? "background:rgba(239,68,68,0.12);" : Number(assetData.overprice) === minMax.overprice.min ? "background:rgba(16,185,129,0.12);" : ""}' class='${Number(assetData.overprice) === minMax.overprice.max ? "negative" : Number(assetData.overprice) === minMax.overprice.min ? "positive" : ""}'>${pct(assetData.overprice)}</td>
                        </tr>
                        <tr>
                            <td style='padding:10px 8px;'><i class="fas fa-chart-pie" style="color:var(--accent-color);margin-right:6px;"></i><span class='muted'>Target Allocation</span></td>
                            <td style='text-align:right;padding:10px 8px;${Number(assetData.target_allocation) === minMax.target_allocation.min ? "background:rgba(239,68,68,0.12);" : Number(assetData.target_allocation) === minMax.target_allocation.max ? "background:rgba(16,185,129,0.12);" : ""}' class='${Number(assetData.target_allocation) === minMax.target_allocation.min ? "negative" : Number(assetData.target_allocation) === minMax.target_allocation.max ? "positive" : ""}'>${pct(assetData.target_allocation)}</td>
                        </tr>
                        <tr style='background:rgba(59,130,246,0.06);'>
                            <td style='padding:10px 8px;'><i class="fas fa-arrow-up" style="color:var(--positive-color);margin-right:6px;"></i><span class='muted'>Est. Growth</span></td>
                            <td style='text-align:right;padding:10px 8px;${Number(assetData.est_growth) === minMax.est_growth.min ? "background:rgba(239,68,68,0.12);" : Number(assetData.est_growth) === minMax.est_growth.max ? "background:rgba(16,185,129,0.12);" : ""}' class='${Number(assetData.est_growth) === minMax.est_growth.min ? "negative" : Number(assetData.est_growth) === minMax.est_growth.max ? "positive" : ""}'>${pct(assetData.est_growth)}</td>
                        </tr>
                        <tr>
                            <td style='padding:10px 8px;'><i class="fas fa-coins" style="color:var(--chart-color-5);margin-right:6px;"></i><span class='muted'>Est. Dividends</span></td>
                            <td style='text-align:right;padding:10px 8px;${Number(assetData.est_dividends) === minMax.est_dividends.min ? "background:rgba(239,68,68,0.12);" : Number(assetData.est_dividends) === minMax.est_dividends.max ? "background:rgba(16,185,129,0.12);" : ""}' class='${Number(assetData.est_dividends) === minMax.est_dividends.min ? "negative" : Number(assetData.est_dividends) === minMax.est_dividends.max ? "positive" : ""}'>${pct(assetData.est_dividends)}</td>
                        </tr>
                        <tr style='background:rgba(59,130,246,0.06);'>
                            <td style='padding:10px 8px;'><i class="fas fa-chart-line" style="color:var(--accent-color);margin-right:6px;"></i><span class='muted'>Est. Total Return</span></td>
                            <td style='text-align:right;padding:10px 8px;${Number(assetData.est_total_return) === minMax.est_total_return.min ? "background:rgba(239,68,68,0.12);" : Number(assetData.est_total_return) === minMax.est_total_return.max ? "background:rgba(16,185,129,0.12);" : ""}' class='${Number(assetData.est_total_return) === minMax.est_total_return.min ? "negative" : Number(assetData.est_total_return) === minMax.est_total_return.max ? "positive" : ""}'>${pct(assetData.est_total_return)}</td>
                        </tr>
                        <tr>
                            <td style='padding:10px 8px;'><i class="fas fa-hourglass-half" style="color:var(--text-muted-color);margin-right:6px;"></i><span class='muted'>Months to Even</span></td>
                            <td style='text-align:right;padding:10px 8px;${Number(assetData.months_to_even) === minMax.months_to_even.max ? "background:rgba(239,68,68,0.12);" : Number(assetData.months_to_even) === minMax.months_to_even.min ? "background:rgba(16,185,129,0.12);" : ""}' class='${Number(assetData.months_to_even) === minMax.months_to_even.max ? "negative" : Number(assetData.months_to_even) === minMax.months_to_even.min ? "positive" : ""}'>${num(assetData.months_to_even)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    }
    valueElement.innerHTML += statsHtml;

    popupElement.classList.add('is-visible');

    // Animate fade-in
    anime({
        targets: [titleElement, valueElement],
        opacity: [0, 1],
        translateY: [10, 0],
        delay: 50, 
        duration: 300,
        easing: 'easeOutCubic'
    });
    
    setTimeout(() => {
        popupElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); 
        
        const cardElement = popupElement.closest('.card');
        if (cardElement) {
            cardElement.classList.add('allocation-card-popup-active');
            
            setTimeout(() => {
                cardElement.classList.remove('allocation-card-popup-active');
            }, 1000);
        }
    }, 100); 

    // Animate the selected slice to expand further and more rapidly
    if (currentAllocationChartType === 'donut' && allocationChart && allocationChart.series && allocationChart.series[0]) {
        try {
            const points = allocationChart.series[0].points;
            points.forEach((point, idx) => {
                if (idx === index) {
                    // Expand this slice further and rapidly
                    point.slice(true, false, { duration: 120 }); // slice out with fast animation
                    // Optionally, increase the offset for this slice
                    if (allocationChart.series[0].options) {
                        allocationChart.series[0].update({
                            slicedOffset: 40 // default is 10, make it much larger
                        }, false);
                    }
                } else {
                    // Reinsert any other slices
                    point.slice(false, false, { duration: 80 });
                }
            });
            allocationChart.redraw();
        } catch (err) {
            console.error('Error animating pie slice expansion:', err);
        }
    }

    // Animate fade-in and scale for smoother popup display
    popupElement.style.opacity = 0;
    popupElement.style.transform = 'scale(0.92) translateY(20px)';
    anime({
        targets: popupElement,
        opacity: [0, 1],
        scale: [0.92, 1],
        translateY: [20, 0],
        duration: 420,
        easing: 'cubicBezier(0.22, 1, 0.36, 1)',
        complete: () => {
            popupElement.style.opacity = '';
            popupElement.style.transform = '';
        }
    });
}

// Function to animate a number counter, ensuring every whole percentage is hit visually
function animateNumberCounter(element, targetDecimalValue, duration = 1200, isPercentage = true) {
    if (!element) {
        console.error("Target element for animation not found.");
        return;
    }

    // Determine if it's a non-percentage number that needs comma formatting
    const needsCommaFormatting = !isPercentage;

    const numericTargetDecimal = Number(targetDecimalValue);
    if (isNaN(numericTargetDecimal)) {
        console.error("Invalid target value for animation:", targetDecimalValue);
        // Use the formatter even for the initial invalid state if appropriate
        element.textContent = isPercentage ? '0%' : formatNumberWithCommas(0);
        return;
    }

    // The final precise percentage value (e.g., 49.96) or the final number
    const finalValue = isPercentage ? numericTargetDecimal * 100 : numericTargetDecimal;
    // The integer value to animate up to (e.g., 49 for percentage, or the full number for non-percentage)
    // For non-percentage, we might want to animate the full value including decimals for smoother visual
    // Let's animate towards the finalValue directly if not percentage
    const animationTarget = isPercentage ? Math.floor(finalValue) : finalValue;
    const initialDisplay = isPercentage ? '0%' : formatNumberWithCommas(0);

    // Initial state
    element.textContent = initialDisplay;

    let current = { val: 0 }; // Animation starts from 0

    // Decide if animation is needed (target is different from 0)
    if (animationTarget !== 0) {
        anime({
            targets: current,
            val: animationTarget, // Animate TO the target (integer for %, full for number)
            // Use rounding for smoother display, especially for non-percentages
            round: isPercentage ? 1 : 100, // Integer for %, 2 decimals for numbers
            easing: 'linear', // Consistent stepping
            duration: duration, // Use full duration
            // Adjust duration proportionally if animating only integer part of percentage?
            // duration: isPercentage ? duration * (animationTarget / finalValue) : duration, // Original proportional logic
            update: function() {
                // Display the current value during animation
                const displayValue = current.val;
                // Format based on type
                element.textContent = isPercentage
                    ? `${displayValue.toFixed(0)}%` // Integer part during % animation
                    : formatNumberWithCommas(displayValue, 0, 2); // Formatted number during animation
            },
            complete: function() {
                // Set the final, precise value, formatted correctly
                const finalDisplayValue = isPercentage
                    ? finalValue.toFixed(2) // Final % value (e.g., 49.96)
                    : formatNumberWithCommas(finalValue, 0, 2); // Final formatted number

                element.textContent = isPercentage ? `${finalDisplayValue}%` : finalDisplayValue;
            }
        });
    } else {
        // If the target is 0, just set the final value (formatted)
        const finalDisplayValue = isPercentage
            ? finalValue.toFixed(2)
            : formatNumberWithCommas(finalValue, 0, 2);
         element.textContent = isPercentage ? `${finalDisplayValue}%` : finalDisplayValue;
    }
}

// Helper function to format numbers with commas
function formatNumberWithCommas(number, minimumFractionDigits = 0, maximumFractionDigits = 2) {
    // Handles null/undefined/non-numeric inputs gracefully
    const num = Number(number);
    if (number == null || isNaN(num)) {
        // Decide what to return for invalid input. '' or '0' or '--' ? Returning original might be confusing.
        // Let's return '--' as a clear indicator of non-numeric data.
        return '--';
    }
    // Use toLocaleString for robust formatting (commas, decimals)
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

// Function to fetch data from the backend API
async function fetchBackendData(isInitialLoad = false) { // Add flag
    const API_ENDPOINT = 'https://edcb-2601-405-4a01-fb00-e41d-2deb-e7e3-862.ngrok-free.app/assets';

    try {
        isDataLoading = true;
        // Don't show overlay spinner on auto-refresh, only button state
        if (isInitialLoad) {
            showLoadingIndicator();
        } else {
            showRefreshButtonLoading(); // Just update button state
        }
        removeFetchError();

        console.log(`Fetching data from: ${API_ENDPOINT}`);
        const response = await fetch(API_ENDPOINT, {
            headers: { 'ngrok-skip-browser-warning': 'true' },
            mode: 'cors'
        });

        if (!response.ok) {
            let errorDetail = `HTTP error! status: ${response.status}`;
            try {
                const errorData = await response.json();
                errorDetail += `, Detail: ${errorData.detail || JSON.stringify(errorData)}`;
            } catch (e) {
                errorDetail += `, Response Text: ${await response.text().substring(0, 100)}...`;
            }
            throw new Error(errorDetail);
        }

        const fetchedData = await response.json();
        console.log("Data fetched successfully:", fetchedData);

        if (fetchedData && typeof fetchedData.meta === 'object' && Array.isArray(fetchedData.assets)) {
            metaData = fetchedData.meta ?? {};
            assetsData = fetchedData.assets ?? [];
            updateLastFetchedTime();
            hideLoadingIndicator(); // Hides full overlay or just button state
            isDataLoading = false;
            return true;
        } else {
            throw new Error("Invalid data structure received from API.");
        }

    } catch (error) {
        console.error('Fetch error:', error);
        displayFetchError(error);
        hideLoadingIndicator();
        isDataLoading = false;
        return false;
    }
}

// --- Adjusted show/hide loading indicator functions --- 
function showLoadingIndicator() {
    document.body.classList.add('is-loading');
    showRefreshButtonLoading();
}

function hideLoadingIndicator() {
    document.body.classList.remove('is-loading');
    hideRefreshButtonLoading();
}

// Specific functions for refresh button state
function showRefreshButtonLoading() {
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.classList.add('is-loading');
        refreshBtn.disabled = true;
        // Update text only if it's not already in loading state
        if (!refreshBtn.innerHTML.includes('spinner-sm')) {
             refreshBtn.dataset.originalText = refreshBtn.innerHTML;
             refreshBtn.innerHTML = '<span class="spinner-sm"></span> <span class="refresh-btn-label">Loading...</span>';
        }
    }
}

function hideRefreshButtonLoading() {
     const refreshBtn = document.getElementById('refreshBtn');
     if (refreshBtn) {
         refreshBtn.disabled = false;
         refreshBtn.classList.remove('is-loading');
         // Restore appropriate text (Auto-refreshing or original)
         if (refreshBtn.dataset.originalText && refreshBtn.dataset.originalText.includes('Auto-refreshing')) {
             refreshBtn.innerHTML = '<span class="spinner-sm"></span> <span class="refresh-btn-label">IVDAR Sheet API</span>';
             refreshBtn.classList.add('is-loading'); // Keep spinner for auto-refresh
         } else if (refreshBtn.dataset.originalText) {
             refreshBtn.innerHTML = refreshBtn.dataset.originalText;
             delete refreshBtn.dataset.originalText; // Clean up
         } else {
              // Default back to auto-refresh if no original text stored
              refreshBtn.innerHTML = '<span class="spinner-sm"></span> <span class="refresh-btn-label">IVDAR Sheet API</span>';
              refreshBtn.classList.add('is-loading');
         }
     }
}
// --- End Loading Indicator Adjustments ---

// Function to update the last fetched timestamp
function updateLastFetchedTime() {
    const timestampElement = document.getElementById('lastFetchedTime');
    if (timestampElement) {
        const now = new Date();
        const timeString = now.toLocaleTimeString();
        timestampElement.textContent = `Last updated: ${timeString}`;
        timestampElement.style.display = 'block';
    }
}

// Helper function to display fetch errors on the page
function displayFetchError(error) {
    // Find a prominent place to show the error, e.g., above the summary section
    const mainContainer = document.querySelector('main');
    if (!mainContainer) return;

    let existingError = document.getElementById('fetch-error-message');
    if (existingError) {
        existingError.remove(); // Remove old error message if present
    }

    const errorDiv = document.createElement('div');
    errorDiv.id = 'fetch-error-message';
    errorDiv.style.backgroundColor = 'var(--negative-color)';
    errorDiv.style.color = 'white';
    errorDiv.style.padding = '15px';
    errorDiv.style.marginBottom = '20px';
    errorDiv.style.borderRadius = 'var(--border-radius-sm)';
    errorDiv.style.textAlign = 'center';
    errorDiv.style.fontWeight = 'bold';
    errorDiv.innerHTML = `
        <p style="margin: 0;">Failed to load data from the API.</p>
        <p style="margin: 5px 0 0 0; font-size: 0.85em; font-weight: normal;">${error.message || 'Check console for details.'}</p>
        <p style="margin: 5px 0 0 0; font-size: 0.8em; font-weight: normal;"><i>Ensure the backend server is running and accessible.</i></p>
    `;

    mainContainer.insertBefore(errorDiv, mainContainer.firstChild);
}

// Function to remove fetch error message
function removeFetchError() {
    const existingError = document.getElementById('fetch-error-message');
    if (existingError) {
        existingError.remove();
    }
}

/**
 * Turn backend rows into the arrays ApexCharts wants.
 * Uses global assetsData.
 * @returns {Object} - Object containing arrays for chart series data.
 */
function buildSeries() {
    // Quick lookup by nice name from global assetsData
    const get = (key, field) => {
        const row = assetsData.find(r => r && r.asset && typeof r.asset === 'string' && r.asset.includes(key));

        // More robust check: ensure row exists and the field is present
        if (!row || row[field] === undefined || row[field] === null) {
            console.warn(`Data missing for key: ${key}, field: ${field}. Defaulting to 0.`);
            return 0; // Default to 0 if data is missing
        }

        const raw = row[field];

        // Handle various invalid and empty states
        if (raw === "" || raw === null || raw === undefined) return 0;
        
        // Handle Excel/Google Sheets errors that might have leaked through
        if (typeof raw === "string" && 
            (/^#(N\/A|DIV\/0!|VALUE!|REF!|NAME\?|NUM!|NULL!)$/i.test(raw.trim()) || 
             raw.trim() === "--" || 
             raw.trim() === "-")) {
            console.warn(`Invalid value "${raw}" for ${key}.${field}. Defaulting to 0.`);
            return 0;
        }

        // Accept "17.34", "17.34%", 0.1734, etc.
        const clean = typeof raw === "string" ? raw.replace(/%/g, "").trim() : raw;
        const parsedValue = parseFloat(clean);

        // Return 0 if parsing failed (NaN) or value is not finite
        if (isNaN(parsedValue) || !isFinite(parsedValue)) {
            console.warn(`Failed to parse "${raw}" (cleaned: "${clean}") for ${key}.${field}. Defaulting to 0.`);
            return 0;
        }
        
        // Special handling for percentage-like fields that might be in decimal or percentage form
        if (field === "target_allocation" || 
            field === "est_growth" || 
            field === "est_dividends" || 
            field === "est_total_return") {
            
            // If value is likely a percentage (e.g., 10.5 instead of 0.105)
            if (parsedValue > 1.5 && parsedValue <= 100) {
                console.info(`Converting percentage value ${parsedValue} to fraction for ${key}.${field}`);
                return parsedValue / 100.0;
            }
        }
        
        return parsedValue;
    };

    // Build series based on ASSET_ORDER
    const allocSeries = ASSET_ORDER.map(k => get(k, "target_allocation")); // Keep as fraction
    const overprice   = ASSET_ORDER.map(k => get(k, "overprice") * 100);
    // We still need total return for the dollar calculation table, but not the breakdown
    const totalReturn = ASSET_ORDER.map(k => get(k, "est_total_return") * 100);

    // Filter out Bonds data AFTER getting all data for consistency
    const bondsIndex = ASSET_ORDER.indexOf("Bonds");
    const filterBonds = (_, index) => index !== bondsIndex;
    const returnAssetOrder = ASSET_ORDER.filter(filterBonds); // Get corresponding labels for dollar table

    // Convert allocation series to percentage for chart display
    const allocPercentSeries = allocSeries.map(val => val * 100);

    // Prepare total return data indexed by asset key (excluding bonds) for dollar calculation
    const baseTotalReturnData = {};
    returnAssetOrder.forEach((key, index) => {
        const originalIndex = ASSET_ORDER.indexOf(key); // Find original index to get correct totalReturn value
        baseTotalReturnData[key] = totalReturn[originalIndex]; // Store percentage value
    });

    console.table({ allocPercentSeries, baseTotalReturnData, overprice });

    // --- Return data in the structure expected by chart functions ---
    return {
        allocation: {
            series: allocPercentSeries,
            labels: ASSET_ORDER
        },
        allocationBar: { // Use the same data for the bar chart representation
            series: [{ name: 'Allocation', data: allocPercentSeries }], // Bar chart expects series as [{ name: '...', data: [...] }]
            labels: ASSET_ORDER
        },
        overpriceSeries: [{ name: "Valuation", data: overprice }], // Keep this for the valuation chart
        returnAssetOrder: returnAssetOrder, // Still needed for dollar table loop
        baseTotalReturnData: baseTotalReturnData // Pass the necessary return data
    };
}

async function populateSummaryAndBadges(isRefresh = false) {
    const today = new Date();
    const momentumValue = metaData?.momentum;
    const momentumIsValid = momentumValue !== null && momentumValue !== undefined && !isNaN(Number(momentumValue));
    const momentumSpan = document.getElementById('badge-momentum');

    const targetStockTotal = assetsData.reduce((acc, row) => {
        if (row?.asset && ["SP500", "NASDAQ", "International"].some(k => row.asset.includes(k))) {
            return acc + (Number(row.target_allocation) || 0);
        }
        return acc;
    }, 0);

    const bondsData = assetsData.find(r => r?.asset?.includes("Bonds"));
    let impliedAllocation = metaData?.implied_allocation ?? (Number(bondsData?.target_allocation) || 0);
    const gaussMean = metaData?.gauss_mean ?? 0.0041;
    const gaussSd = metaData?.gauss_sd ?? 0.2485;

    // Update static date badge directly
    setText("#badge-date", dateFmt(metaData?.today || today.toISOString()));

    // --- Animate updates for refresh, or just animate initially --- 
    const animationOptions = { duration: 600 }; // Options for refresh animation

    const updates = [
        // Momentum Badge
        () => momentumSpan && (momentumIsValid
            ? animateNumberCounter(momentumSpan, momentumValue, 1000, true)
            : momentumSpan.textContent = '--'),
        // Summary Items
        () => animateNumberCounter(document.querySelector('#summary-target-total'), targetStockTotal, 1000, true),
        () => animateNumberCounter(document.querySelector('#summary-implied'), impliedAllocation, 1000, true),
        () => animateNumberCounter(document.querySelector('#summary-gauss-mean'), gaussMean, 1000, true),
        () => animateNumberCounter(document.querySelector('#summary-gauss-sd'), gaussSd, 1000, true),
        // Allocation Stats (Apply ticker animation)
        () => {
            const element = document.querySelector("#stat-stock-total");
            const value = assetsData.filter(r => r?.asset && ["SP500","NASDAQ","International"].some(k => r.asset.includes(k))).reduce((a,b)=> a + (Number(b.target_allocation) || 0), 0);
            if (element) animateNumberCounter(element, value, 1000, true);
        },
        () => {
            const element = document.querySelector("#stat-bonds");
            const value = Number(assetsData.find(r => r?.asset?.includes("Bonds"))?.target_allocation) || 0;
            if (element) animateNumberCounter(element, value, 1000, true);
        },
        () => {
            const element = document.querySelector("#stat-cash");
            const value = Number(assetsData.find(r => r?.asset?.includes("Money Market"))?.target_allocation) || 0;
            if (element) animateNumberCounter(element, value, 1000, true);
        },
    ];

    if (isRefresh) {
        // Apply fade-out/in animation wrapper for refresh, adding stagger
        const staggerDelay = 75; // ms delay between each item animation start
        await Promise.all([
            // Add delay option to each animateElementUpdate call
            animateElementUpdate(momentumSpan, updates[0], { ...animationOptions, delay: 0 * staggerDelay }),
            animateElementUpdate('#summary-target-total', updates[1], { ...animationOptions, delay: 1 * staggerDelay }),
            animateElementUpdate('#summary-implied', updates[2], { ...animationOptions, delay: 2 * staggerDelay }),
            animateElementUpdate('#summary-gauss-mean', updates[3], { ...animationOptions, delay: 3 * staggerDelay }),
            animateElementUpdate('#summary-gauss-sd', updates[4], { ...animationOptions, delay: 4 * staggerDelay }),
            // Apply ticker via animateElementUpdate
            animateElementUpdate('#stat-stock-total', updates[5], { duration: 1000, delay: 5 * staggerDelay }),
            animateElementUpdate('#stat-bonds', updates[6], { duration: 1000, delay: 6 * staggerDelay }),
            animateElementUpdate('#stat-cash', updates[7], { duration: 1000, delay: 7 * staggerDelay }),
        ]);
    } else {
        // Initial load: Run number animations directly with a staggered delay
        const initialDelay = 75; // ms delay between each item animation start
        updates.forEach((updateFn, index) => {
            // Only apply timeout to functions that actually call animateNumberCounter
            // (Index 0 = momentum, 1-4 = summary, 5-7 = alloc stats)
            if (index <= 7) { // Assuming indices 0-7 are the ones with tickers
                 setTimeout(() => {
                    try {
                         updateFn();
                    } catch (e) {
                         console.error("Error executing delayed update:", e);
                    }
                 }, index * initialDelay);
            } else {
                 // If other update functions are added later without tickers, run them immediately
                 try {
                     updateFn();
                 } catch (e) {
                     console.error("Error executing immediate update:", e);
                 }
            }
        });
    }

    updateLastFetchedTime();
}

async function populateTables(isRefresh = false) {
    const dailyBody = document.getElementById("daily-table-body");
    const valBody = document.getElementById("valuation-detail-body");

    // Function to generate table HTML content
    const populateDailyTable = () => {
        if (!dailyBody) return;
        dailyBody.innerHTML = ""; // Clear previous rows
        ASSET_ORDER.forEach(assetKey => {
            const r = assetsData.find(a => a?.asset?.includes(assetKey));
            if (!r) return;
            const row = document.createElement("tr");
            const chg = Number(r.change) || 0;
            const assetName = r.asset.split("(")[0].trim();
            row.innerHTML = `
                <td>${assetName}</td>
                <td>${num(r.previous)}</td>
                <td>${num(r.today)}</td>
                <td class="${chg > 0 ? "positive" : chg < 0 ? "negative" : ""}">${pct(chg)}</td>`;
            dailyBody.appendChild(row);
        });
    };

    const populateValuationTable = () => {
        if (!valBody) return;
        valBody.innerHTML = ""; // Clear previous rows
        ASSET_ORDER.forEach(assetKey => {
            const r = assetsData.find(a => a?.asset?.includes(assetKey));
            if (!r) return;
            const months_num = Number(r.months_to_even);
            const months = isNaN(months_num) || r.months_to_even === "-" || months_num === 0 ? "-" : months_num.toFixed(2);
            const overprice_num = Number(r.overprice) || 0;
            const threshold_num = Number(r.overprice_threshold) || 0;
            const assetName = r.asset.split("(")[0].trim();
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${assetName}</td>
                <td>${num(r.intrinsic_value)}</td>
                <td class="${overprice_num > 0 ? "negative" : (overprice_num < 0 ? "positive" : "")}">${pct(overprice_num)}</td>
                <td>${pct(threshold_num)}</td>
                <td>${dateFmt(r.assoc_date)}</td>
                <td>${months}</td>
               `;
            valBody.appendChild(row);
        });
    };

    if (isRefresh) {
        // Animate table body updates on refresh
        await Promise.all([
            dailyBody ? animateElementUpdate(dailyBody, populateDailyTable, { duration: 500 }) : Promise.resolve(),
            valBody ? animateElementUpdate(valBody, populateValuationTable, { duration: 500 }) : Promise.resolve()
        ]);
    } else {
        // Initial load: Populate directly
        populateDailyTable();
        populateValuationTable();
        // animateTableValues is now called directly in the initialization sequence
    }
}

// ================================================================
//  Chart Initialization & Updates
// ================================================================

// Initialize all charts on page load
function initializeCharts(chartData) {
    console.log("Initializing charts...");
    // --- Allocation Chart (Donut/Bar) ---
    const allocationElement = document.getElementById('allocation-chart');
    if (allocationElement) {
        const options = getAllocationChartOptions(chartData, currentAllocationChartType); // Pass current type
        if (allocationChart) {
            try {
                allocationChart.destroy(); // Destroy previous instance if exists (Highcharts method)
            } catch (e) { /* Ignore if no destroy method or already destroyed */ }
            allocationChart = null;
        }

        if (currentAllocationChartType === 'donut') {
             // --- Initialize Highcharts 3D Donut ---
             // Initially hide the chart container for animation
             allocationElement.style.opacity = '0';
             allocationElement.style.transform = 'translateY(20px)';
             
             // Render the chart with all data at once (no slice-by-slice animation)
             allocationChart = Highcharts.chart(allocationElement, options);
             console.log("Highcharts 3D Allocation chart rendered.");
             
             // Use anime.js to animate the container after a short delay
             setTimeout(() => {
                 console.log("Initiating anime.js container animation...");
                 anime({
                     targets: allocationElement,
                     opacity: [0, 1],
                     translateY: [20, 0],
                     duration: 900,
                     easing: 'easeOutExpo',
                     complete: () => {
                         console.log("Anime.js container animation complete.");
                         // Clean up inline styles
                         allocationElement.style.opacity = '';
                         allocationElement.style.transform = '';
                     }
                 });
             }, 100); // Short delay to ensure chart is rendered
        } else {
             // --- Initialize ApexCharts Bar Chart --- (Keep existing bar logic)
             allocationChart = new ApexCharts(allocationElement, options);
             allocationChart.render().then(() => {
                 console.log("ApexCharts Allocation Bar chart rendered.");
                 allocationElement.style.opacity = 1;
             }).catch(err => console.error("Error rendering allocation bar chart:", err));
        }

        chartInstances['allocation-chart'] = allocationChart; // Store instance
    } else {
        console.error("Allocation chart element not found.");
    }

    // --- Valuation Chart (Existing Logic - Assuming ApexCharts) ---
    const valuationElement = document.getElementById('overprice-chart');
    if (valuationElement) {
        const valuationOptions = getValuationChartOptions(chartData);
        if (valuationChart) {
             try {
                 valuationChart.destroy(); // Destroy previous instance if exists
             } catch(e) { /* Ignore */ }
             valuationChart = null;
        }
        valuationChart = new ApexCharts(valuationElement, valuationOptions);
        valuationChart.render().then(() => {
            console.log("Valuation chart rendered.");
            setupValuationExplanationDiv(valuationElement); // Setup explanation div
            valuationElement.style.opacity = 1;
        }).catch(err => console.error("Error rendering valuation chart:", err));
        chartInstances['overprice-chart'] = valuationChart; // Store instance
    } else {
        console.error("Valuation chart element not found.");
    }
}

// --- NEW Helper Function to Get Allocation Chart Options based on type ---
function getAllocationChartOptions(chartData, type = 'donut') {
    const commonOptions = getChartOptions(); // Base options
    // --- Prepare data in Highcharts format if needed --- 
    let seriesData, labelsData;
    if (type === 'donut') {
        // Highcharts expects data typically as an array of objects [{name: 'label', y: value}, ...]
        // or arrays [['label', value], ...]
        // Assuming chartData.allocation contains { labels: [...], series: [...] } from Apex structure
        seriesData = [{ // Highcharts Pie/Donut series is usually an object
            name: 'Allocation', // Series name (optional)
            colorByPoint: true, // Use different colors for each point
            data: chartData.allocation.labels.map((label, index) => ({ 
                name: label,
                y: chartData.allocation.series[index]
            }))
        }];
        labelsData = chartData.allocation.labels; // Keep labels if needed elsewhere, but Highcharts uses data names
    } else {
        // Keep existing bar chart data structure for ApexCharts
        seriesData = chartData.allocationBar.series;
        labelsData = chartData.allocationBar.labels;
    }

     // Base configuration common to both donut and bar
     // Note: Some common options might need adjustment based on library (Highcharts vs Apex)
    let options = {
        // series: seriesData, // Series will be handled within type-specific options
        chart: {
            backgroundColor: commonOptions.chart.background || 'transparent', // Use common background
            // ... other common chart options compatible with BOTH or handled specifically below ...
        },
        // title: { text: 'Target Allocation' }, // Highcharts title
        // subtitle: { text: '' }, // Highcharts subtitle
        // legend: { ... }, // Highcharts legend options might differ
        // tooltip: { ... }, // Highcharts tooltip options differ
        // ... other common Highcharts/Apex options ...

        // --- Add specific options based on type ---
        ...(type === 'donut' 
             ? getAllocationDonutSpecificOptions(commonOptions, seriesData) // Pass prepared Highcharts data
             : getAllocationBarSpecificOptions(commonOptions, chartData) // Keep passing original chartData for Apex Bar
          )
    };

    // Dynamic animations handled differently in Highcharts vs Apex
    // if (options.chart && options.chart.animations) {
    //    options.chart.animations.dynamicAnimation.enabled = true; // May not apply to Highcharts like this
    // }

    return options;
}

// --- UPDATED: Specific options for Highcharts 3D Donut ---
function getAllocationDonutSpecificOptions(commonOptions, seriesData) {
    console.log("Generating Highcharts 3D Donut options with theme gradients...");

    // Define base colors and their darker shades for gradients using theme colors
    const baseColors = commonOptions.colors; // Now fetched from CSS vars
    const darkerColors = commonOptions.colorsDark; // Now fetched from CSS vars

    // Apply gradient colors to each data point
    const seriesDataWithGradients = seriesData.map(series => ({
        ...series,
        data: series.data.map((point, index) => ({
            ...point,
            color: {
                linearGradient: { x1: 0, x2: 0, y1: 0, y2: 1 }, // Vertical gradient
                stops: [
                    [0, baseColors[index % baseColors.length]], // Start color (original)
                    [1, darkerColors[index % darkerColors.length]] // End color (darker)
                ]
            }
        }))
    }));

    return {
        ...commonOptions, // Spread common options
        credits: { // ADD this section
            enabled: false
        },
        chart: {
            // ... existing chart options ...
            type: 'pie',
            backgroundColor: commonOptions.chart.background || 'transparent',
            options3d: {
                enabled: true,
                alpha: 35, // Angle - Reduced from 45
                beta: 0
            },
            // Add chart background click event
            events: {
                click: function(event) {
                    // Check if the click target is the chart background
                    // Highcharts often uses specific class names for elements.
                    // Inspecting the chart in dev tools might reveal the background element's class.
                    // A common approach is checking if the event's target is the chart container itself.
                    if (event.target === this.container) { 
                        console.log("Chart background clicked.");
                        hideAllocationDetails(); // Close popup and reset opacities
                    }
                }
            }
        },
        title: {
             text: null // Already have a title in HTML, keep chart clean
        },
        subtitle: {
             text: null
        },
        accessibility: {
            point: {
                valueSuffix: '%'
            }
        },
        tooltip: {
            // Use commonOptions or define Highcharts specific tooltip
            enabled: commonOptions.tooltip?.enabled ?? true,
            // Use theme colors fetched in getChartOptions
            backgroundColor: commonOptions.tooltip.backgroundColor,
            borderColor: commonOptions.tooltip.borderColor,
            borderWidth: 1,
            borderRadius: commonOptions.tooltip?.borderRadius || 3,
            style: {
                color: commonOptions.tooltip.style.color, // Already set in getChartOptions
                fontSize: commonOptions.tooltip?.style?.fontSize || '12px' // Keep font size logic
            },
            headerFormat: '<span style="font-size: 10px">{point.key}</span><br/>',
            pointFormat: '<span style="color:{point.color}">\u25CF</span> {series.name}: <b>{point.percentage:.1f}%</b> ({point.y:.1f})<br/>',
            // --- NEW: Fixed Tooltip Position --- 
            followPointer: false, // Don't follow the mouse
            shadow: false,
            positioner: function (labelWidth, labelHeight, point) {
                // point.plotX and point.plotY are relative to the plot area
                // this.chart.plotLeft and this.chart.plotTop give the plot area's offset within the container
                // We want fixed top-left within the *chart container* 
                
                const chart = this.chart;
                const PADDING = 15; // Padding from the top-left corner
                
                let x = PADDING;
                let y = PADDING;

                // Ensure tooltip doesn't go outside the chart container horizontally
                if (x + labelWidth > chart.chartWidth) {
                    x = chart.chartWidth - labelWidth - PADDING;
                }
                 // Ensure tooltip doesn't go outside the chart container vertically
                if (y + labelHeight > chart.chartHeight) {
                    y = chart.chartHeight - labelHeight - PADDING;
                }

                return {
                    x: x,
                    y: y
                };
            }
            // --- END NEW --- 
        },
        plotOptions: {
            pie: {
                innerSize: '65%',
                depth: 45,
                allowPointSelect: true, // Keep selection enabled for visual feedback (like halo)
                cursor: 'pointer',
                animation: {
                    duration: 500
                },
                // --- REMOVE OPACITY OVERRIDES FROM STATES --- 
                states: {
                    // Remove inactive state opacity control
                    // inactive: {
                    //     opacity: 0.4, 
                    //     animation: { duration: 50 }
                    // },
                    select: {
                        // Explicitly set selected state to full opacity
                        opacity: 1, 
                        // Restore a short animation duration for deselection visual
                        animation: {
                            duration: 150 
                        }
                    },
                    hover: {
                        // Remove explicit opacity
                        // opacity: 1,
                        animation: { 
                           duration: 50
                       }
                    }
                },
                // --- End removal --- 
                point: {
                    events: {
                        click: function() {
                            const clickedIndex = this.index;
                            const point = this; // Capture point context
                            console.log(`Slice clicked: Index ${clickedIndex}, Name: ${point.name}`);

                            if (clickedIndex === currentPopupIndex) {
                                console.log("Clicked the active slice, hiding details and closing slice.");
                                // Explicitly trigger the closing animation
                                point.update({ sliced: false }, true, true); // Update point, redraw, animate
                                // Then hide popup and reset opacities
                                hideAllocationDetails(); 
                                // No need to call point.select(false) separately, update handles state.
                            } else {
                                console.log("Selecting new slice, showing details.");
                                // Update opacities and popup content
                                updateAllocationDetails(clickedIndex);
                                // Update tracked index
                                currentPopupIndex = clickedIndex; 
                                // Highcharts handles selection visuals via allowPointSelect=true and internally calls point.select(true)
                                // If we wanted explicit control, we could call point.select(true) here.
                            }
                        }
                    }
                },
                // --- End click event handler ---
                dataLabels: {
                    enabled: true,
                    format: '<b>{point.name}</b>: {point.percentage:.1f} %',
                    connectorColor: commonOptions.legend?.labels?.colors || commonOptions.grid?.borderColor || '#888888',
                    style: {
                        color: commonOptions.chart.foreColor,
                        textOutline: '1px contrast',
                        fontWeight: '500', // Slightly bolder
                        fontSize: '18px' // Increased font size
                    }
                },
                showInLegend: true
            }
        },
        series: seriesDataWithGradients, // Use the prepared series data with gradients
        legend: {
            enabled: commonOptions.legend?.show ?? true,
            layout: 'horizontal', // Adjust layout as needed
            align: 'center',      // Adjust alignment
            verticalAlign: 'bottom', // Adjust position
            itemStyle: {
                 color: commonOptions.legend?.labels?.colors || '#E0E0E3',
                 fontWeight: commonOptions.legend?.fontWeight || 'bold',
                 fontSize: commonOptions.legend?.fontSize || '13px'
            },
            itemHoverStyle: {
                 color: commonOptions.legend?.itemHover?.highlightDataSeries ? '#FFF' : '#AAA' // Example
            }
            // Highcharts specific legend options may be needed
        },
        // Remove Apex-specific options
        // dataLabels: { enabled: false }, 
        // stroke: { ... },
        // colors: commonOptions.colors || [..."#3B82F6", ...], // Colors handled in plotOptions.pie
        credits: { // Also add here in the bar options just in case
            enabled: false
        },
    };
}

// --- NEW: Specific options for Bar ---
function getAllocationBarSpecificOptions(commonOptions, chartData) {
    return {
        series: chartData.allocationBar.series, // <-- Add this line to fix bar chart rendering
        plotOptions: {
            bar: {
                horizontal: false, // Vertical bars
                columnWidth: '60%', // Adjust bar width
                distributed: true, // Each bar gets a color from the palette
                borderRadius: 5, // Slightly rounded bars
                dataLabels: {
                     position: 'top', // Show data labels on top of bars
                },
                // --- Bar specific animations ---
                 animations: {
                     speed: 650, // Slightly faster bar animation
                 }
            }
        },
         dataLabels: {
            enabled: true,
            formatter: function (val) {
                return pct(val / 100);
            },
            offsetY: -20, // Position above the bar
            style: {
                fontSize: '12px',
                colors: [commonOptions.chart.foreColor]
            }
        },
         xaxis: {
            categories: chartData.allocationBar.labels, // Labels on X-axis
             labels: {
                style: {
                    fontSize: '12px',
                    colors: commonOptions.grid.borderColor // Use muted color for axis labels
                }
            },
            axisBorder: { show: false },
            axisTicks: { show: false }
        },
        yaxis: {
            labels: {
                formatter: function (val) {
                    return val.toFixed(0) + "%"; // Show percentage on Y-axis
                },
                style: {
                     fontSize: '12px',
                     colors: commonOptions.grid.borderColor
                }
            },
             title: {
                 text: "Allocation (%)",
                 style: {
                     fontSize: '11px',
                     fontWeight: 500,
                     color: commonOptions.textMutedColor || '#94A3B8'
                 }
             }
        },
         tooltip: { // Keep consistent tooltip from common options, already configured
            ...commonOptions.tooltip,
             y: { // Ensure bar tooltip shows % correctly
                formatter: function (val) { return pct(val / 100); }
             }
         },
         legend: {
             show: false // Hide legend for bar chart (labels are on X-axis)
         },
         // --- Apply colors ---
         colors: commonOptions.colors || ["#3B82F6", "#60A5FA", "#FBBF24", "#8B5CF6", "#10B981"],
          // --- Customize Bar Stroke ---
         stroke: {
             show: true,
             width: 2,
             colors: ['transparent'] // No border around bars themselves
         },
        credits: { // Also add here in the bar options just in case
            enabled: false
        },
    };
}


// --- Valuation Chart Options (Existing Logic, ensure it uses common options) ---
function getValuationChartOptions(chartData) {
    const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim();
    const mutedColor = getComputedStyle(document.documentElement).getPropertyValue('--text-muted-color').trim();
    const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim();
    const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim();
    const fontFamily = getComputedStyle(document.documentElement).getPropertyValue('--font-family').trim();

   // --- Process and filter valuation data --- 
   const valuationData = chartData?.overpriceSeries?.[0]?.data ?? []; // Default to empty array
   const filteredValuation = valuationData
        .map((value, index) => ({ 
             value: typeof value === 'number' ? value : NaN, 
             category: ASSET_ORDER[index] || `Unknown ${index}` // Use order, fallback
        }))
        // --- Include Bonds, Exclude only MM and NaN/0 --- 
        .filter(item => !isNaN(item.value) && item.value !== 0 && item.category !== 'Money Market') 
        .sort((a, b) => a.value - b.value); // Sort by value (ascending)

    // Define colors based on value (positive overprice = red, negative = green)
    const valuationColors = filteredValuation.map(item => item.value > 0 ? 'var(--negative-color)' : 'var(--positive-color)');

   return {
        // Use processed colors
        colors: valuationColors.length > 0 ? valuationColors : [accentColor], // Fallback if empty
        series: [{
             name: 'Overprice %',
             data: filteredValuation.map(item => item.value) // Use filtered & sorted values
        }],
        chart: {
            type: 'bar',
            height: 380,
            foreColor: textColor,
            toolbar: { show: false },
            animations: { 
               enabled: true, 
               speed: 800,
               animateGradually: {
                   enabled: true,
                   delay: 150
               },
               dynamicAnimation: {
                   enabled: true,
                   speed: 350
               }
            },
            fontFamily: fontFamily,
            background: 'transparent',
            dropShadow: {
               enabled: true,
               top: 3,
               left: 3,
               blur: 5,
               color: '#000',
               opacity: 0.2
            }
        },
        plotOptions: {
            bar: {
                horizontal: true, // Make it horizontal bar
                distributed: true, // Use colors array for each bar
                borderRadius: 5,
                 barHeight: '70%', // Adjust bar height/thickness
                dataLabels: {
                     position: 'center' // Position labels inside bars
                }
            }
        },
        dataLabels: {
             enabled: true,
             formatter: function (val) {
                 // Check if val is a valid number
                 return (typeof val === 'number') ? val.toFixed(1) + '%' : '';
             },
             style: {
                 fontSize: '11px',
                 colors: ['#fff'], // White text for contrast inside bars
                 fontWeight: 600
             },
             textAnchor: 'middle', // Center text horizontally
             offsetX: 0 // Adjust offset if needed
        },
        grid: {
            borderColor: gridColor,
            strokeDashArray: 3,
            position: 'back',
             xaxis: { lines: { show: false } }, // Hide vertical grid lines
            yaxis: { lines: { show: true, opacity: 0.1 } }, // Show horizontal grid lines
            padding: {
                top: 0, right: 20, bottom: 0, left: 10 // Adjust padding
            }
        },
        xaxis: {
            categories: filteredValuation.map(item => item.category), // Use filtered & sorted categories
            labels: {
               style: {
                   colors: mutedColor,
                   fontSize: '12px',
                   fontWeight: 500
               },
                formatter: (value) => { // Show % on x-axis labels
                     return (typeof value === 'number') ? value.toFixed(0) + '%' : value;
                 }
            },
            axisBorder: { show: false },
            axisTicks: { show: true, color: gridColor, height: 4 },
            title: {
                text: 'Overprice / Underprice (%)',
               style: {
                   color: mutedColor,
                   fontSize: '11px',
                   fontWeight: 500
               }
            }
        },
        yaxis: {
            labels: {
               style: {
                   colors: mutedColor,
                   fontSize: '12px',
                   fontWeight: 500
               }
               // No formatter needed if categories are on y-axis for horizontal
            },
            title: {
                text: 'Asset',
               style: {
                   color: mutedColor,
                   fontSize: '11px',
                   fontWeight: 500
               }
            },
             axisBorder: { show: false }, // Hide Y axis line
             axisTicks: { show: false }, // Hide Y axis ticks
        },
        tooltip: {
            theme: 'dark',
            style: {
               fontSize: '12px',
               fontFamily: fontFamily
           },
           x: { // Show percentage value in tooltip title
                formatter: function(val) {
                    return (typeof val === 'number') ? val.toFixed(2) + '%' : val;
                }
            },
            y: { // Show category name in tooltip body
                formatter: undefined, // Use category name directly
                title: {
                     formatter: (seriesName) => '', // Don't show series name
                }
            },
            marker: { show: false }, // Hide color marker in tooltip
        },
        legend: {
              show: false // Hide legend, colors are on bars
        },
        title: { 
             // Removed title, already present on card
        },
        // Removed stroke, fill, states - rely on plotOptions distributed colors
    };
}

// Helper to style the valuation chart legend after render
function styleValuationLegend() {
    try {
        const legendMarkers = document.querySelectorAll('#overprice-chart .apexcharts-legend-marker');
        const legendItems = document.querySelectorAll('#overprice-chart .apexcharts-legend-text');
        const explanationEl = document.getElementById('valuation-explanation');

        if (legendMarkers.length >= 2 && legendItems.length >= 2) {
            // Style the first marker/item (Overpriced)
            legendMarkers[0].style.backgroundColor = '#ef4444'; // Red
            legendMarkers[0].style.borderRadius = '50%';
            legendItems[0].textContent = 'Overpriced: Assets trading above their intrinsic value';

            // Style the second marker/item (Underpriced)
             legendMarkers[1].style.backgroundColor = '#22c55e'; // Green
             legendMarkers[1].style.borderRadius = '50%';
             legendItems[1].textContent = 'Underpriced: Assets trading below their intrinsic value';

             // Remove any extra legend items if present
             for (let i = 2; i < legendMarkers.length; i++) {
                 legendMarkers[i].closest('.apexcharts-legend-item')?.remove();
             }

             // Hide the explanation div if legend styling was successful
             if (explanationEl) explanationEl.style.display = 'none';
        } else {
            // Fallback: Show the explanation div if legend items weren't found/styled
            console.warn("Could not find expected legend items to style for valuation chart. Using explanation div.");
            if (explanationEl) explanationEl.style.display = 'flex';
        }
    } catch (error) {
        console.error("Error styling valuation legend:", error);
        const explanationEl = document.getElementById('valuation-explanation');
        if (explanationEl) explanationEl.style.display = 'flex'; // Show fallback on error
    }
}

// Helper to setup the valuation explanation div
function setupValuationExplanationDiv(chartContainer) {
    try { // Added try block
        let explanationEl = document.getElementById('valuation-explanation');
        if (!explanationEl && chartContainer) {
            explanationEl = document.createElement('div');
            explanationEl.id = 'valuation-explanation';
            explanationEl.className = 'chart-explanation';
            // Ensure parentNode exists before inserting
            chartContainer.parentNode?.insertBefore(explanationEl, chartContainer.nextSibling);
        }
        if (explanationEl) {
            explanationEl.innerHTML = `
                <div class="legend-item">
                    <span class="color-dot overpriced"></span>
                    <span>Overpriced: Assets trading above their intrinsic value</span>
                </div>
                <div class="legend-item">
                    <span class="color-dot underpriced"></span>
                    <span>Underpriced: Assets trading below their intrinsic value</span>
                </div>
            `;
            explanationEl.style.display = 'none'; // Start hidden
        }
    } catch (error) { // Added catch block
        console.error("Error setting up valuation explanation div:", error);
    }
}

async function updateCharts(chartData) {
    console.log("Updating charts data...");
    let updatePromises = [];

    // --- Update Allocation Chart ---
    if (allocationChart && chartData.allocation) {
        console.log("Updating Allocation Chart...");
        // Get options based on the CURRENTLY selected type
        const newOptions = getAllocationChartOptions(chartData, currentAllocationChartType);
        const updatePromise = allocationChart.updateOptions(newOptions, true, true) // Redraw, Animate
             .then(() => console.log(`Allocation chart (${currentAllocationChartType}) updated.`))
             .catch(err => console.error("Error updating allocation chart:", err));
        updatePromises.push(updatePromise);
    }

    // --- Update Valuation Chart ---
    if (valuationChart && chartData.overpriceSeries) {
        await animateElementUpdate(valuationChart.el?.closest('.card') || '#overprice-chart', async () => {
             // ... (filtering and sorting logic) ...
             // ... (assetLookup logic) ...

            // Update options with new data and potentially recalculated axes/categories
            await valuationChart.updateOptions({
                 // ... (options to update) ...
            }, true, true); // Redraw, Animate

             // Re-style legend after update, with a small delay
             setTimeout(() => {
                  styleValuationLegend();
             }, 100); // 100ms delay

        }, { duration: 400 });
    } else {
        console.warn("Valuation chart or data not ready for update.");
    }
    // ... (rest of updateCharts) ...
}

// --- Modified: Setup Event Listeners ---
function setupEventListeners() {
    console.log("Setting up event listeners...");

    // --- Allocation Chart View Toggle ---
    const donutBtn = document.getElementById('view-as-donut');
    const barBtn = document.getElementById('view-as-bar');

    if (donutBtn && barBtn && allocationChart) {
        donutBtn.addEventListener('click', () => {
            if (currentAllocationChartType !== 'donut') {
                switchAllocationChartType('donut');
                donutBtn.classList.add('active');
                barBtn.classList.remove('active');
            }
        });

        barBtn.addEventListener('click', () => {
            if (currentAllocationChartType !== 'bar') {
                switchAllocationChartType('bar');
                barBtn.classList.add('active');
                donutBtn.classList.remove('active');
            }
        });

         // Ensure initial active state is correct
         if (currentAllocationChartType === 'donut') {
              donutBtn.classList.add('active');
              barBtn.classList.remove('active');
         } else {
              barBtn.classList.add('active');
              donutBtn.classList.remove('active');
         }
    } else {
         console.warn("Allocation chart view toggle buttons not found or chart not initialized.");
    }


    // --- Refresh Button ---
    const refreshBtn = document.getElementById('refreshBtn');
    // NOTE: Ensure portfolioValueInput is still declared if needed by refresh button or calculator
    const portfolioValueInput = document.getElementById('portfolioValue');
    if (refreshBtn) {
        // Initial state setup (Auto-refreshing)
        refreshBtn.innerHTML = '<span class="spinner-sm"></span> <span class="refresh-btn-label">IVDAR Sheet API</span>';
        refreshBtn.classList.add('is-loading');
        refreshBtn.dataset.originalText = refreshBtn.innerHTML; // Store auto-refresh text

        // Manual refresh click handler
        refreshBtn.addEventListener('click', async () => { // <<< ALREADY ASYNC
            if (!isDataLoading) {
                console.log("Manual refresh triggered...");
                showRefreshButtonLoading(); // Show immediate loading state
                refreshBtn.innerHTML = '<span class="spinner-sm"></span> <span class="refresh-btn-label">Refreshing...</span>'; // Specific text

                try {
                    const success = await fetchBackendData(); // Fetch without overlay

                    if (success) {
                        console.log("Manual refresh: Data fetched, updating UI...");
                        // Use refresh animations
                        const chartData = buildSeries();
                        await populateSummaryAndBadges(true); // Pass isRefresh=true
                        await populateTables(true);         // Pass isRefresh=true
                        await updateCharts(chartData);      // Uses internal animations

                        // Update portfolio calculator if needed
                        if (portfolioValueInput && portfolioValueInput.value) {
                            const portfolioValue = parseFormattedNumber(portfolioValueInput.value);
                            if (!isNaN(portfolioValue) && portfolioValue > 0) {
                                // Consider adding animation to these updates too
                                updateDollarReturnSection(portfolioValue);
                                updateDollarValuationSection(portfolioValue);
                            }
                        }

                        // Show success toast
                        const toastMessage = document.createElement('div');
                        toastMessage.className = 'toast-message success';
                        toastMessage.textContent = 'Data refreshed successfully!';
                        document.body.appendChild(toastMessage);
                        setTimeout(() => {
                            toastMessage.classList.add('hide');
                            setTimeout(() => toastMessage.remove(), 300);
                        }, 3000);
                        brieflyUncollapseRefreshBar();
                    }
                } catch (error) {
                    console.error('Error during manual refresh:', error);
                    // Error message is handled by fetchBackendData
                } finally {
                    // Restore button state after a short delay, back to auto-refreshing
                    setTimeout(() => {
                       hideRefreshButtonLoading();
                       // Ensure it goes back to auto-refreshing state visually
                        if (refreshBtn.dataset.originalText && refreshBtn.dataset.originalText.includes('Auto-refreshing')){
                           refreshBtn.innerHTML = refreshBtn.dataset.originalText;
                           refreshBtn.classList.add('is-loading');
                        }
                    }, 500);
                }
            }
        });
    }

    // --- Allocation Info Box Close Button ---
    const closeBtn = document.querySelector('.allocation-info-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', hideAllocationDetails);
    } else {
        console.warn("Allocation info close button not found.");
    }

    // --- Initial Table Animations (if needed outside initial load) ---
    // animateTableValues(); // Might call this on data refresh too if needed

    const refreshButton = document.getElementById('refreshBtn');
    const calculateButton = document.getElementById('calculateBtn');
    const portfolioInput = document.getElementById('portfolioValue');
    const presetButtons = document.querySelectorAll('.preset-value-btn');
    const allocationDonutBtn = document.getElementById('view-as-donut');
    const allocationBarBtn = document.getElementById('view-as-bar');
    const allocationInfoCloseBtn = document.querySelector('.allocation-info-close');
    const mobileMenuToggle = document.getElementById('mobile-menu');
    const navMenu = document.getElementById('nav-menu');
    const apiIcon = document.querySelector('.momentum-badge .api-icon'); // Select the API icon

    if (refreshButton) {
        refreshButton.addEventListener('click', () => {
            console.log("Refresh button clicked manually.");
            brieflyUncollapseRefreshBar(); // Ensure bar is visible when clicked
            fetchBackendData(true); // Pass true to indicate a manual refresh
        });
    }

    // ... existing event listeners ...

    // --- NEW: Add mouseenter listener for API icon ---
    if (apiIcon) {
        apiIcon.addEventListener('mouseenter', () => {
            console.log("Hover detected on API icon, expanding refresh bar."); // Optional: for debugging
            expandBar(); // Call the existing function to expand the bar
        });
        // Note: No mouseleave listener added, the bar will collapse based on its existing timer logic after expansion.
    }

    // Listener for Mobile Menu Toggle
    if (mobileMenuToggle && navMenu) {
        mobileMenuToggle.addEventListener('click', () => {
            mobileMenuToggle.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
    }
}

// --- NEW Function to Switch Allocation Chart Type ---
function switchAllocationChartType(newType) {
    const allocationElement = document.getElementById('allocation-chart');
    if (!chartInstances['allocation-chart'] || !allocationElement || currentAllocationChartType === newType) {
        console.warn("Switch condition not met or elements missing.");
        return; // No change needed or chart/element not ready
    }

    console.log(`Switching allocation chart to: ${newType}`);
    currentAllocationChartType = newType; // Update the global state

    const chartData = buildSeries();
    if (!chartData) {
        console.error("Could not build chart data for switching type.");
        return;
    }

    // --- Destroy existing chart instance --- 
    let existingChart = chartInstances['allocation-chart'];
    if (existingChart) {
        try {
            existingChart.destroy();
            console.log("Previous allocation chart instance destroyed.");
        } catch (e) {
            console.error("Error destroying previous chart instance:", e);
        }
        existingChart = null;
        chartInstances['allocation-chart'] = null;
    }
    
    // Get the specific options object for the new type
    const newOptions = getAllocationChartOptions(chartData, newType);

    // --- Create and render the new chart instance --- 
    try {
        if (newType === 'donut') {
            // Create Highcharts 3D Donut
            allocationChart = Highcharts.chart(allocationElement, newOptions);
            console.log(`Highcharts Allocation chart successfully rendered as ${newType}.`);
            // Add Highcharts specific event listeners if needed
        } else {
            // Create ApexCharts Bar Chart
            allocationChart = new ApexCharts(allocationElement, newOptions);
            allocationChart.render().then(() => {
                console.log(`ApexCharts Allocation chart successfully rendered as ${newType}.`);
                 allocationElement.style.opacity = 1; // Ensure visible after render
                 // Re-add Apex-specific listeners if needed for bar chart
            }).catch(renderErr => {
                console.error(`Error RENDERING new ApexCharts allocation chart (${newType}):`, renderErr);
                allocationChart = null; 
            });
        }
        chartInstances['allocation-chart'] = allocationChart; // Store the new instance
    } catch (createErr) {
        console.error(`Error CREATING new chart instance (${newType}):`, createErr);
        allocationChart = null; // Ensure reference is null if creation fails
    }

    // Remove ApexCharts specific hover/click handlers if they exist and aren't adapted
    // This is a placeholder - you might need to adapt or remove handleAllocationHover, 
    // animateAllocationClick, addLegendHoverListeners calls elsewhere if they target ApexCharts elements
    // allocationElement.removeEventListener(...) // Example removal
}


// ================================================================
//  Initialization & Main Execution
// ================================================================

// --- Setup Auto-Refresh Interval (declare globally or ensure accessible) ---
// let autoRefreshIntervalId = null; // Example declaration if needed

// --- END FILE (Main execution) ---
document.addEventListener('DOMContentLoaded', async function() { // <<< Added async
    console.log('DOM loaded, starting app initialization...'); // Existing log

    try {
        console.log('Attempting to fetch data...');
        const success = await fetchBackendData(true); // Pass true for initial load
        console.log('Fetch attempt finished. Success:', success);

        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
             console.log('Attempting to hide loading screen...');
             loadingScreen.classList.add('hidden');
             setTimeout(() => {
                 loadingScreen.style.display = 'none';
             }, 600); // Match transition duration
             console.log('Loading screen hidden command sent.');
        } else {
             console.log('Loading screen element not found.');
        }

        if (success) {
            console.log('Data fetched successfully, initializing UI...');

            // --- Populate Content First --- //
            console.log('Building series...');
            const chartData = buildSeries();
            console.log('Populating summary/badges...');
            await populateSummaryAndBadges(false); // isRefresh = false
            console.log('Populating tables...');
            await populateTables(false); // isRefresh = false

            // --- Run Staggered Container Animations --- //
            console.log('Running initial load animations...');
            await runInitialLoadAnimations(); // Run staggered fade-in for containers
            console.log('Initial container animations complete.');

            // --- Animate Numbers AFTER Containers Visible --- //
            console.log('Animating table values...');
            animateTableValues(); // Run this after containers are laid out
            console.log('Ticker animation started.');

            // --- Initialize Charts --- //
            console.log('Initializing charts...');
            initializeCharts(chartData);
            console.log('Charts initialized.');

            // --- Setup Interactions --- //
            console.log('Setting up event listeners...');
            setupEventListeners(); // Setup general listeners
            console.log('Setting up portfolio calculator...');
            setupPortfolioCalculator(); // <<-- Call calculator setup here
            console.log('Event listeners and calculator set up.');

            // --- Final Touches --- //
            console.log('Updating last fetched time...');
            updateLastFetchedTime();
            console.log('Adding body loaded class...');
            document.body.classList.add('loaded'); // Add final class if needed

            console.log('Initialization complete.');

        } else {
            console.error('Failed to fetch data during initialization');
            // Error message is displayed by fetchBackendData
            // Ensure main content area is visible even if data fails
            const mainElement = document.querySelector('main');
            if(mainElement) mainElement.style.opacity = 1;
        }
    } catch (error) {
        console.error('Critical error during app initialization sequence:', error); // More specific log
        // Hide loading screen in case of error during sequence
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen && !loadingScreen.classList.contains('hidden')) {
             loadingScreen.classList.add('hidden');
            setTimeout(() => { loadingScreen.style.display = 'none'; }, 600);
        }
        // Ensure content area is visible
         const mainElement = document.querySelector('main');
         if(mainElement) mainElement.style.opacity = 1;
    }

    // --- Setup Auto-Refresh Interval (AFTER initial load attempt) --- //
    // Moved the auto-refresh setup inside DOMContentLoaded to ensure it runs once
    const refreshBtn = document.getElementById('refreshBtn'); 
    if (refreshBtn) {
        setInterval(async () => {
            console.log("Auto-refreshing data...");
            try {
                // Only auto-refresh if not currently loading manually
                if (!isDataLoading) { 
                    const success = await fetchBackendData(); // Fetch without initial load flag
                    
                    if (success) {
                        // Rebuild charts with the new data
                        const chartData = buildSeries();
                        
                        // Update all UI components using refresh animations
                        await populateSummaryAndBadges(true); // isRefresh = true
                        await populateTables(true); // isRefresh = true
                        await updateCharts(chartData);
                        
                        // Update portfolio calculator if it's been used
                        const portfolioValueInput = document.getElementById('portfolioValue');
                        if (portfolioValueInput && portfolioValueInput.value) {
                            const portfolioValue = parseFormattedNumber(portfolioValueInput.value);
                            if (!isNaN(portfolioValue) && portfolioValue > 0) {
                                updateDollarReturnSection(portfolioValue);
                                updateDollarValuationSection(portfolioValue);
                            }
                        }
                        
                        console.log("Auto-refresh completed successfully");
                        brieflyUncollapseRefreshBar();
                    }
                } else {
                    console.log("Skipping auto-refresh while manual load is in progress.");
                }
            } catch (error) {
                console.error("Error during auto-refresh:", error);
            }
        }, 60000); // Refresh every 60 seconds
    }
});

// --- Clean up unused/old code --- //
// Remove any remaining old animation timeline code or window.load listeners
// that might conflict with the new DOMContentLoaded approach.

// --- NEW: Definition for hideAllocationDetails ---
function hideAllocationDetails() {
    const popupElement = document.querySelector('.allocation-container > .allocation-info');
    if (popupElement) {
        popupElement.classList.remove('is-visible');
    }

    currentPopupIndex = null; 
    try {
        if (currentAllocationChartType === 'donut' && allocationChart && allocationChart.series && allocationChart.series[0]) {
            console.log("Resetting slice opacities and reinserting any sliced segments...");
            allocationChart.series[0].points.forEach(point => {
                point.update({ opacity: 1, sliced: false }, false); // Also reinsert any sliced segments
            });
            allocationChart.redraw();
        }
    } catch (error) {
        console.error("Error resetting point opacities or reinserting slices:", error);
    }
}

// --- NEW: Definition for addLegendHoverListeners ---
function addLegendHoverListeners(chartSelector, hoverHandler) {
    // Use event delegation on the chart element for potentially dynamic legend items
    const chartElement = document.querySelector(chartSelector);
    if (!chartElement) return;

    chartElement.addEventListener('mouseover', (event) => {
        const legendItem = event.target.closest('.apexcharts-legend-series');
        if (legendItem) {
            // ApexCharts uses 'rel' attribute (1-based index) or data-index
            const index = parseInt(legendItem.getAttribute('rel') || legendItem.getAttribute('data-index'), 10) - 1;
            if (!isNaN(index) && index >= 0) {
                hoverHandler(index, true);
            }
        }
    });

    chartElement.addEventListener('mouseout', (event) => {
         const legendItem = event.target.closest('.apexcharts-legend-series');
         if (legendItem) {
             const index = parseInt(legendItem.getAttribute('rel') || legendItem.getAttribute('data-index'), 10) - 1;
             if (!isNaN(index) && index >= 0) {
                 hoverHandler(index, false);
             }
         }
    });
}

// ================================================================
//  Portfolio Calculator & Dollar Value Sections
// ================================================================

// --- Setup Portfolio Calculator --- 
function setupPortfolioCalculator() {
    const calculateBtn = document.getElementById('calculateBtn');
    const portfolioValueInput = document.getElementById('portfolioValue');
    const calculationResultsBody = document.getElementById('calculationResultsBody');
    const totalAmountSpan = document.getElementById('totalAmount');
    const presetButtons = document.querySelectorAll('.preset-value-btn');
    const calculationResultsDiv = document.getElementById('calculationResults');
    const dollarReturnsSection = document.getElementById('dollarReturnsSection');
    const dollarValuationSection = document.getElementById('desktop-dollar-valuation-section');

    if (!calculateBtn || !portfolioValueInput || !calculationResultsBody || !totalAmountSpan || !calculationResultsDiv || !dollarReturnsSection || !dollarValuationSection) {
        console.error("Calculator elements or dependent dollar sections not found.");
        return;
    }

    // Function to calculate and display results
    const calculateAndDisplay = () => {
        const portfolioValue = parseFormattedNumber(portfolioValueInput.value); // Use parser

        // --- ADDED: Reformat the input field after parsing --- 
        if (!isNaN(portfolioValue)) {
             // Avoid reformatting if the input is currently focused and value hasn't changed significantly
             // This helps prevent cursor jumps while typing
             const newlyFormatted = formatInputWithCommas(String(portfolioValue)); // Format the parsed number
             if (document.activeElement !== portfolioValueInput || portfolioValueInput.value !== newlyFormatted) {
                 portfolioValueInput.value = newlyFormatted;
             }
        } else if (portfolioValueInput.value.trim() === '' || isNaN(portfolioValue)) {
             // Clear formatting if input is empty or invalid (after parsing)
             // Don't clear if user might just be typing (e.g. "1,")
        }

        if (isNaN(portfolioValue) || portfolioValue <= 0) {
            // Hide sections if input is invalid (Fade out smoothly)
            anime({ targets: calculationResultsDiv, opacity: 0, duration: 300, easing: 'easeOutQuad', complete: () => calculationResultsDiv.style.display = 'none' });
            anime({ targets: dollarReturnsSection, opacity: 0, duration: 300, easing: 'easeOutQuad', complete: () => dollarReturnsSection.style.display = 'none' });
            anime({ targets: dollarValuationSection, opacity: 0, duration: 300, easing: 'easeOutQuad', complete: () => dollarValuationSection.style.display = 'none' });

            // Clear results table and total amount
            calculationResultsBody.innerHTML = '';
            totalAmountSpan.textContent = ''; // Clear total amount immediately
            // Clear dollar section content as well
            const returnsTbody = document.getElementById('desktop-dollar-returns-body');
            const valuationTbody = document.getElementById('desktop-dollar-valuation-body');
            if (returnsTbody) returnsTbody.innerHTML = '';
            if (valuationTbody) valuationTbody.innerHTML = '';
            return;
        }

        // --- Input is valid, proceed with calculations and display ---

        // Show sections (Fade in)
        calculationResultsDiv.style.display = 'block';
        anime({ targets: calculationResultsDiv, opacity: [0, 1], duration: 400, easing: 'easeOutQuad' });
        dollarReturnsSection.style.display = 'block';
        anime({ targets: dollarReturnsSection, opacity: [0, 1], duration: 400, easing: 'easeOutQuad', delay: 100 });
        dollarValuationSection.style.display = 'block';
        anime({ targets: dollarValuationSection, opacity: [0, 1], duration: 400, easing: 'easeOutQuad', delay: 200 });


        // --- Allocation Breakdown Calculation ---
        calculationResultsBody.innerHTML = ''; // Clear previous results immediately
        // Animate the total amount display
        animateNumberCounter(totalAmountSpan, portfolioValue, 800, false); // Assuming animateNumberCounter handles non-percentage

        let totalAllocatedAmount = 0; // Keep track for verification if needed
        const currentPrices = {};
        assetsData.forEach(asset => {
            if (asset?.asset) {
                const assetName = asset.asset.split("(")[0].trim();
                currentPrices[assetName] = Number(asset.today) || 0;
            }
        });

        let animationDelay = 0; // Stagger row animations
        ASSET_ORDER.forEach(assetKey => {
            const asset = assetsData.find(a => a?.asset?.includes(assetKey));
            if (!asset) return; // Skip if asset missing

            const percentage = (Number(asset.target_allocation) || 0); // Keep as fraction for calculation
            const amount = percentage * portfolioValue;
            totalAllocatedAmount += amount;

            const row = calculationResultsBody.insertRow();
            row.style.opacity = 0; // Start hidden for animation
            const assetName = asset.asset.split("(")[0].trim();
            let currentPrice = currentPrices[assetName] || 0;
            let priceDisplay = currencyFormatter.format(currentPrice);
            if (assetName === 'Money Market') { priceDisplay = '-'; }

            // Create cells and set initial text (e.g., 0 or '-')
            const cellAsset = row.insertCell();
            const cellPercent = row.insertCell();
            const cellAmount = row.insertCell();
            const cellPrice = row.insertCell();

            cellAsset.textContent = assetName;
            cellPercent.textContent = '0.00%';
            cellAmount.textContent = currencyFormatter.format(0);
            cellPrice.textContent = assetName === 'Money Market' ? '-' : currencyFormatter.format(0); // Show $0 initially unless MM

            // Apply styles (consider moving to CSS classes)
            cellAsset.style.cssText = "padding: 10px 8px; border-bottom: 1px solid var(--border-color);";
            cellPercent.style.cssText = "padding: 10px 8px; border-bottom: 1px solid var(--border-color); text-align: right;";
            cellAmount.style.cssText = "padding: 10px 8px; border-bottom: 1px solid var(--border-color); text-align: right; font-weight: 600;";
            cellPrice.style.cssText = "padding: 10px 8px; border-bottom: 1px solid var(--border-color); text-align: right;";

            // Animate row fade-in and number counters
            anime({
                targets: row,
                opacity: 1,
                duration: 400,
                delay: animationDelay,
                easing: 'easeOutQuad',
                complete: () => { // Start number animations after row is visible
                    animateNumberCounter(cellPercent, percentage, 600, true); // Pass fraction for percentage
                    animateNumberCounter(cellAmount, amount, 600, false); // Pass dollar amount
                    if (assetName !== 'Money Market') {
                        animateNumberCounter(cellPrice, currentPrice, 600, false); // Animate price
                    }
                }
            });
            animationDelay += 50; // Increment delay for next row
        });

        // Add Total Row (with animation)
        const totalRow = calculationResultsBody.insertRow();
        totalRow.style.opacity = 0;
        totalRow.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
        // Create cells
        const cellTotalLabel = totalRow.insertCell();
        const cellTotalPercent = totalRow.insertCell();
        const cellTotalAmount = totalRow.insertCell();
        const cellTotalPlaceholder = totalRow.insertCell();
        // Set content
        cellTotalLabel.textContent = 'Total Portfolio';
        cellTotalPercent.textContent = '100.00%';
        cellTotalAmount.textContent = currencyFormatter.format(0); // Start at 0
        cellTotalPlaceholder.textContent = '';
        // Apply styles
        cellTotalLabel.style.cssText = "padding: 10px 8px; font-weight: 700;";
        cellTotalPercent.style.cssText = "padding: 10px 8px; text-align: right; font-weight: 700;";
        cellTotalAmount.style.cssText = "padding: 10px 8px; text-align: right; font-weight: 700;";
        cellTotalPlaceholder.style.cssText = "padding: 10px 8px; text-align: right;";

        // Animate total row fade-in and total amount counter
        anime({
            targets: totalRow,
            opacity: 1,
            duration: 400,
            delay: animationDelay, // After last asset row
            easing: 'easeOutQuad',
            complete: () => {
                animateNumberCounter(cellTotalAmount, portfolioValue, 800, false); // Animate the final total
            }
        });

        // --- Update Dollar Sections ---
        updateDollarReturnSection(portfolioValue); // These will be updated next
        updateDollarValuationSection(portfolioValue);
    };

// --- Event Listeners ---
    let debounceTimer;
    portfolioValueInput.addEventListener('input', function() {
        // --- REMOVED: Aggressive formatting and cursor logic --- 
        /* 
        const cursorPosition = this.selectionStart;
        const originalValue = this.value;
        const originalLength = originalValue.length;
        const unformattedValue = originalValue.replace(/[^\\d.]/g, ''); 
        const formattedValue = formatInputWithCommas(unformattedValue);
            this.value = formattedValue;
        const newLength = formattedValue.length;
        this.setSelectionRange(cursorPosition + (newLength - originalLength), cursorPosition + (newLength - originalLength));
        */

        // Debounce the calculation (which now also handles reformatting)
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(calculateAndDisplay, 400); // Slightly longer debounce
    });

    // --- ADDED: Reformat on blur for final cleanup ---
    portfolioValueInput.addEventListener('blur', function() {
        const portfolioValue = parseFormattedNumber(this.value);
        if (!isNaN(portfolioValue)) {
            this.value = formatInputWithCommas(String(portfolioValue));
        } else {
            // Optionally clear if invalid on blur, or leave as is
            // this.value = ''; // Uncomment to clear invalid input on blur
        }
    });

    calculateBtn.addEventListener('click', calculateAndDisplay);
    portfolioValueInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') calculateAndDisplay();
    });

    presetButtons.forEach(button => {
        button.addEventListener('click', function() {
            const value = this.getAttribute('data-value');
        portfolioValueInput.value = formatInputWithCommas(value); // Format the preset value
        calculateAndDisplay(); // Trigger calculation immediately
        });
    });

// --- Initial State ---
    calculationResultsDiv.style.display = 'none';
    dollarReturnsSection.style.display = 'none';
    dollarValuationSection.style.display = 'none';
}

// Function to update the Dollar Returns section
function updateDollarReturnSection(portfolioValue) {
    const section = document.getElementById('dollarReturnsSection');
    const tbody = document.getElementById('desktop-dollar-returns-body');
    const valueDisplay = document.getElementById('desktopPortfolioValueDisplay');

    if (!section || !tbody || !valueDisplay) {
        console.error("Dollar returns section elements not found.");
        return;
    }

    if (isNaN(portfolioValue) || portfolioValue <= 0) {
        // Fade out section if invalid value
        if (section.style.display !== 'none') { // Only animate if currently visible
            anime({ targets: section, opacity: 0, duration: 300, easing: 'easeOutQuad', complete: () => section.style.display = 'none' });
        }
        tbody.innerHTML = ''; // Clear content immediately
        valueDisplay.textContent = currencyFormatter.format(0); // Reset display
        return;
    }

    // If called before data is ready, exit gracefully
    if (!assetsData || !assetsData.length) {
        console.warn("updateDollarReturnSection called before assetsData is populated.");
        if (section.style.display !== 'none') {
            anime({ targets: section, opacity: 0, duration: 300, easing: 'easeOutQuad', complete: () => section.style.display = 'none' });
        }
        tbody.innerHTML = '';
        valueDisplay.textContent = currencyFormatter.format(0);
        return;
    }

    // Show section (Fade in if it was hidden)
    if (section.style.display === 'none') {
        section.style.display = 'block';
        section.style.opacity = 0; // Ensure starting opacity is 0 before animating
        anime({ targets: section, opacity: 1, duration: 400, easing: 'easeOutQuad' });
    }

    // Animate portfolio value display
    animateNumberCounter(valueDisplay, portfolioValue, 800, false);

    tbody.innerHTML = ''; // Clear previous results immediately

    let totalDollarReturn = 0;
    let totalAllocation = 0;
    let weightedTotalReturn = 0; // For calculating weighted average return
    let animationDelay = 0;

    // Log information for debugging
    console.log("Portfolio return calculation for value:", portfolioValue);

    // Safely get numeric values from return data 
    const getReturnValue = (assetKey, field, defaultValue = 0) => {
        const asset = assetsData.find(a => a?.asset?.includes(assetKey));
        if (!asset) {
            console.warn(`Asset data not found for key: ${assetKey}`);
            return defaultValue;
        }
        
        const value = asset[field];
        if (value === null || value === undefined || value === "") {
            console.warn(`${assetKey}.${field} is empty or null, using default: ${defaultValue}`);
            return defaultValue;
        }
        
        const numValue = Number(value);
        if (isNaN(numValue) || !isFinite(numValue)) {
            console.warn(`${assetKey}.${field} value (${value}) is not a valid number, using default: ${defaultValue}`);
            return defaultValue;
        }
        
        return numValue;
    };

    // Use the built-in ASSET_ORDER for consistent ordering
    // Skip Bonds as in the original returnOrder logic
    const returnOrder = ASSET_ORDER.filter(asset => asset !== "Bonds");

    returnOrder.forEach((assetKey) => {
        const asset = assetsData.find(a => a?.asset?.includes(assetKey));
        if (!asset) {
            console.warn(`Asset data not found for key: ${assetKey} in updateDollarReturnSection`);
            return; // Skip if asset data is missing
        }

        // Get allocation and return values safely
        const allocationPercent = getReturnValue(assetKey, "target_allocation", 0); // fraction
        const estReturnPercent = getReturnValue(assetKey, "est_total_return", 0); // fraction
        
        console.log(`${assetKey} return values:`, {
            allocation: allocationPercent,
            estimatedReturn: estReturnPercent
        });

        // Calculate weighted return for total
        weightedTotalReturn += allocationPercent * estReturnPercent;
        totalAllocation += allocationPercent;

        const allocatedAmount = allocationPercent * portfolioValue;
        const dollarReturn = allocatedAmount * estReturnPercent;
        totalDollarReturn += dollarReturn;

        // Log the calculations
        console.log(`${assetKey} return calculations:`, {
            allocatedAmount,
            dollarReturn
        });

        const row = tbody.insertRow();
        row.style.opacity = 0; // Start hidden
        const assetName = asset.asset.split("(")[0].trim();

        // Create cells and set initial content
        const cellAsset = row.insertCell();
        const cellAlloc = row.insertCell();
        const cellReturnPct = row.insertCell();
        const cellReturnAmt = row.insertCell();

        cellAsset.textContent = assetName;
        cellAlloc.textContent = '0.00%';
        cellReturnPct.textContent = '0.00%';
        cellReturnAmt.textContent = currencyFormatter.format(0);

        // Apply styles
        cellAsset.style.cssText = "padding: 10px 8px; border-bottom: 1px solid var(--border-color);";
        cellAlloc.style.cssText = "padding: 10px 8px; border-bottom: 1px solid var(--border-color); text-align: right;";
        cellReturnPct.style.cssText = "padding: 10px 8px; border-bottom: 1px solid var(--border-color); text-align: right;";
        cellReturnAmt.style.cssText = "padding: 10px 8px; border-bottom: 1px solid var(--border-color); text-align: right; font-weight: 600;";
        cellReturnAmt.className = dollarReturn >= 0 ? 'positive' : 'negative';

        // Animate fade-in and number counters
        anime({
            targets: row,
            opacity: 1,
            duration: 400,
            delay: animationDelay,
            easing: 'easeOutQuad',
            complete: () => {
                animateNumberCounter(cellAlloc, allocationPercent, 600, true); // Pass fraction
                animateNumberCounter(cellReturnPct, estReturnPercent, 600, true); // Pass fraction
                animateNumberCounter(cellReturnAmt, dollarReturn, 600, false);
            }
        });
        animationDelay += 50;
    });

    // Calculate weighted average return percentage (as fraction)
    // Prevent division by zero
    const weightedAverageReturn = totalAllocation > 0 ? weightedTotalReturn / totalAllocation : 0;

    // Log totals for debugging
    console.log("Return totals:", {
        totalAllocation,
        weightedTotalReturn,
        weightedAverageReturn,
        totalDollarReturn
    });

    // Add Total Row (with animation)
    const totalRow = tbody.insertRow();
    totalRow.style.opacity = 0;
    totalRow.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
    // Create cells
    const cellTotalLabel = totalRow.insertCell();
    const cellTotalPlaceholder1 = totalRow.insertCell();
    const cellTotalReturnPct = totalRow.insertCell(); // Changed from placeholder
    const cellTotalAmount = totalRow.insertCell();
    // Set initial content
    cellTotalLabel.textContent = 'Est. Total Return';
    cellTotalPlaceholder1.textContent = '';
    cellTotalReturnPct.textContent = '0.00%'; // Show return percentage
    cellTotalAmount.textContent = currencyFormatter.format(0);
    // Apply styles
    cellTotalLabel.style.cssText = "padding: 10px 8px; font-weight: 700;";
    cellTotalPlaceholder1.style.cssText = "padding: 10px 8px; text-align: right;";
    cellTotalReturnPct.style.cssText = "padding: 10px 8px; text-align: right; font-weight: 700;";
    cellTotalAmount.style.cssText = "padding: 10px 8px; text-align: right; font-weight: 700;";
    cellTotalAmount.className = totalDollarReturn >= 0 ? 'positive' : 'negative';
    cellTotalReturnPct.className = weightedAverageReturn >= 0 ? 'positive' : 'negative';

    // Animate fade-in and total counter
    anime({
        targets: totalRow,
        opacity: 1,
        duration: 400,
        delay: animationDelay,
        easing: 'easeOutQuad',
        complete: () => {
            animateNumberCounter(cellTotalReturnPct, weightedAverageReturn, 800, true); // Pass fraction
            animateNumberCounter(cellTotalAmount, totalDollarReturn, 800, false);
        }
    });
}

// Function to update the Dollar Valuation section
function updateDollarValuationSection(portfolioValue) {
    const section = document.getElementById('desktop-dollar-valuation-section');
    const tbody = document.getElementById('desktop-dollar-valuation-body');

    if (!section || !tbody) {
        console.error("Dollar valuation section elements not found.");
        return;
    }

     if (isNaN(portfolioValue) || portfolioValue <= 0) {
        // Fade out section if invalid value
        if (section.style.display !== 'none') {
            anime({ targets: section, opacity: 0, duration: 300, easing: 'easeOutQuad', complete: () => section.style.display = 'none' });
        }
        tbody.innerHTML = ''; // Clear content immediately
        return;
    }
    
    // Show section (Fade in if it was hidden)
    if (section.style.display === 'none') {
        section.style.display = 'block';
        anime({ targets: section, opacity: [0, 1], duration: 400, easing: 'easeOutQuad' });
    }

    tbody.innerHTML = ''; // Clear previous results immediately

    let totalDifference = 0;
    let totalCurrentValue = 0;
    let totalPredictedValue = 0;
    let animationDelay = 0;

    // Log information for debugging
    console.log("Portfolio calculation for value:", portfolioValue);

    ASSET_ORDER.forEach(assetKey => {
        const asset = assetsData.find(a => a?.asset?.includes(assetKey));
        if (!asset) {
            console.warn(`Asset data not found for key: ${assetKey} in updateDollarValuationSection`);
            return;
        }

        // Safely get numeric values, with extended logging for debugging 
        const getNumericValue = (obj, field, defaultValue = 0) => {
            const value = obj[field];
            if (value === null || value === undefined || value === "") {
                console.warn(`${assetKey}.${field} is empty or null, using default: ${defaultValue}`);
                return defaultValue;
            }
            
            const numValue = Number(value);
            if (isNaN(numValue) || !isFinite(numValue)) {
                console.warn(`${assetKey}.${field} value (${value}) is not a valid number, using default: ${defaultValue}`);
                return defaultValue;
            }
            
            return numValue;
        };

        // Get all required values safely
        const allocationPercent = getNumericValue(asset, "target_allocation", 0); // fraction
        const currentPrice = getNumericValue(asset, "today", 0);
        const predictedPrice = getNumericValue(asset, "intrinsic_value", 0);
        
        console.log(`${assetKey} values:`, {
            allocation: allocationPercent,
            currentPrice: currentPrice,
            predictedPrice: predictedPrice
        });

        const allocatedAmount = allocationPercent * portfolioValue;
        
        // Calculate units based on allocated amount and current price
        // Handle division by zero safely
        let units = 0;
        if (currentPrice > 0) {
            units = allocatedAmount / currentPrice;
        } else {
            console.warn(`${assetKey} has zero or invalid current price (${asset.today}), cannot calculate units`);
        }

        // Current value is the allocated amount by definition
        const currentValue = allocatedAmount;
        
        // Predicted value depends on having valid units and a predicted price
        let predictedValue = 0;
        if (units > 0 && predictedPrice > 0) {
            predictedValue = units * predictedPrice;
        } else if (assetKey === 'Money Market') {
            // Money Market is a special case - predicted value equals current
            predictedValue = currentValue;
        }
        
        // Calculate difference
        const difference = predictedValue - currentValue;
        
        // Add to totals
        totalCurrentValue += currentValue;
        totalPredictedValue += predictedValue;
        totalDifference += difference;

        // Log the calculations
        console.log(`${assetKey} calculations:`, {
            allocatedAmount,
            units,
            currentValue,
            predictedValue,
            difference
        });

        const row = tbody.insertRow();
        row.style.opacity = 0; // Start hidden
        const assetName = asset.asset.split("(")[0].trim();

        // Create cells
        const cellAsset = row.insertCell();
        const cellAlloc = row.insertCell();
        const cellCurrent = row.insertCell();
        const cellPredicted = row.insertCell();
        const cellDiff = row.insertCell();

        // Set initial content
        cellAsset.textContent = assetName;
        cellAlloc.textContent = '0.00%';
        cellCurrent.textContent = currencyFormatter.format(0);
        cellPredicted.textContent = currencyFormatter.format(0);
        cellDiff.textContent = currencyFormatter.format(0);

        // Apply styles
        cellAsset.style.cssText = "padding: 10px 8px; border-bottom: 1px solid var(--border-color);";
        cellAlloc.style.cssText = "padding: 10px 8px; border-bottom: 1px solid var(--border-color); text-align: right;";
        cellCurrent.style.cssText = "padding: 10px 8px; border-bottom: 1px solid var(--border-color); text-align: right;";
        cellPredicted.style.cssText = "padding: 10px 8px; border-bottom: 1px solid var(--border-color); text-align: right;";
        cellDiff.style.cssText = "padding: 10px 8px; border-bottom: 1px solid var(--border-color); text-align: right; font-weight: 600;";
        cellDiff.className = difference >= 0 ? 'positive' : 'negative';

        // Special handling for Money Market (no predicted value)
        if (assetName === 'Money Market') {
            // For Money Market, show the current value as the predicted value
            // This ensures we don't show a dash which could confuse the totals
            cellPredicted.textContent = currencyFormatter.format(currentValue);
            cellDiff.textContent = currencyFormatter.format(0);
            cellDiff.className = ''; // No color class for MM
        }

        // Animate row fade-in and number counters
        anime({
            targets: row,
            opacity: 1,
            duration: 400,
            delay: animationDelay,
            easing: 'easeOutQuad',
            complete: () => {
                animateNumberCounter(cellAlloc, allocationPercent, 600, true); // Pass fraction
                animateNumberCounter(cellCurrent, currentValue, 600, false);
                // Only animate predicted/difference if not Money Market or if we're showing current value
                if (assetName !== 'Money Market' || currentValue > 0) {
                    animateNumberCounter(cellPredicted, predictedValue, 600, false);
                    animateNumberCounter(cellDiff, difference, 600, false);
                }
            }
        });
        animationDelay += 50;
    });

    // Log totals for debugging
    console.log("Valuation totals:", {
        totalCurrentValue,
        totalPredictedValue,
        totalDifference
    });

     // Add Total Row (with animation)
     const totalRow = tbody.insertRow();
     totalRow.style.opacity = 0;
     totalRow.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
     // Create cells
     const cellTotalLabel = totalRow.insertCell();
     const cellTotalPlaceholder1 = totalRow.insertCell();
     const cellTotalCurrentValue = totalRow.insertCell(); 
     const cellTotalPredictedValue = totalRow.insertCell();
     const cellTotalAmount = totalRow.insertCell();
     // Set initial content
     cellTotalLabel.textContent = 'Total Potential Change';
     cellTotalPlaceholder1.textContent = '';
     cellTotalCurrentValue.textContent = currencyFormatter.format(0);
     cellTotalPredictedValue.textContent = currencyFormatter.format(0);
     cellTotalAmount.textContent = currencyFormatter.format(0);
     // Apply styles
     cellTotalLabel.style.cssText = "padding: 10px 8px; font-weight: 700;";
     cellTotalPlaceholder1.style.cssText = "padding: 10px 8px; text-align: right;";
     cellTotalCurrentValue.style.cssText = "padding: 10px 8px; text-align: right; font-weight: 700;";
     cellTotalPredictedValue.style.cssText = "padding: 10px 8px; text-align: right; font-weight: 700;";
     cellTotalAmount.style.cssText = "padding: 10px 8px; text-align: right; font-weight: 700;";
     cellTotalAmount.className = totalDifference >= 0 ? 'positive' : 'negative';

     // Animate fade-in and total counter
     anime({
         targets: totalRow,
         opacity: 1,
         duration: 400,
         delay: animationDelay,
         easing: 'easeOutQuad',
         complete: () => {
             animateNumberCounter(cellTotalCurrentValue, totalCurrentValue, 800, false);
             animateNumberCounter(cellTotalPredictedValue, totalPredictedValue, 800, false);
             animateNumberCounter(cellTotalAmount, totalDifference, 800, false);
         }
     });
}

