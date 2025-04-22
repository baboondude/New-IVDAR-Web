// Chart Options Helper
function getChartOptions(theme) {
    const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim();
    const mutedColor = getComputedStyle(document.documentElement).getPropertyValue('--text-muted-color').trim();
    const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim();
    const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim();
    const fontFamily = getComputedStyle(document.documentElement).getPropertyValue('--font-family').trim();

   return {
        // Modern color palette
        colors: ["#3B82F6", "#60A5FA", "#FBBF24", "#8B5CF6", "#10B981"], // Blue-500, Blue-400, Amber-400, Purple-500, Emerald-500
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
            theme: 'dark',
            style: {
               fontSize: '12px',
               fontFamily: fontFamily
           },
           x: { show: true },
           marker: { 
               show: true,
               fillColors: ["#3B82F6", "#60A5FA", "#FBBF24", "#8B5CF6"]
           },
           custom: function({ series, seriesIndex, dataPointIndex, w }) {
               return '<div class="custom-tooltip">' +
                   '<span class="tooltip-marker" style="background-color:' + 
                   w.config.colors[seriesIndex] + '"></span>' +
                   '<span class="tooltip-series">' + w.config.series[seriesIndex].name + ': </span>' +
                   '<span class="tooltip-value">' + series[seriesIndex][dataPointIndex].toFixed(2) + '%</span>' +
                   '</div>';
           }
        },
        legend: {
             fontFamily: fontFamily,
             fontSize: '12px',
             labels: { colors: mutedColor },
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
               type: 'vertical',
               shadeIntensity: 0.4,
               inverseColors: false,
               opacityFrom: 1,
               opacityTo: 0.85,
               stops: [0, 95]
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
// let selectedAllocationIndex = -1; // Track selected slice (Removed, logic now in updateAllocationDetails)
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

const allocationOptions = {
   ...getChartOptions('dark'),
   series: [10.23, 33.84, 27.70, 3.57, 24.67],
   chart: {
       ...getChartOptions('dark').chart,
       type: 'donut',
       height: 380,
       events: {
           dataPointSelection: function(event, chartContext, config) {
               const seriesIndex = config.dataPointIndex;
               updateAllocationCenter(seriesIndex, allocationChart);
           },
           legendClick: function(chartContext, seriesIndex, config) {
               updateAllocationCenter(seriesIndex, allocationChart);
               return false; // Prevent default legend behavior (hiding the series)
           }
       }
   },
    title: {
        text: 'Target Asset Allocation',
        align: 'left',
        style: {
            color: getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim(), 
            fontSize: '18px',
            fontWeight: '600'
        }
    },
   labels: ['SP500', 'NASDAQ', 'International', 'Bonds', 'Money Market'],
   colors: ["#3B82F6", "#60A5FA", "#FBBF24", "#8B5CF6", "#10B981"], // Blue-500, Blue-400, Amber-400, Purple-500, Emerald-500
   plotOptions: {
       pie: {
           donut: {
               size: '65%',
               background: 'transparent',
               labels: {
                   show: true,
                   total: initialTotalLabelOptions
               }
           },
           customScale: 0.9,
           expandOnClick: false,
           offsetY: 20
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
               type: 'none',
               value: 0
           }
       }
   },
   tooltip: {
       y: {
           formatter: function (val) {
               return val.toFixed(2) + "%";
           },
           title: {
               formatter: (seriesName) => seriesName + ":"
           }
       }
   },
   fill: {
       type: 'gradient',
       gradient: {
           shade: 'dark',
           type: 'horizontal',
           shadeIntensity: 0.5,
           gradientToColors: undefined,
           inverseColors: false,
           opacityFrom: 1,
           opacityTo: 0.9,
           stops: [0, 100]
       }
   },
   stroke: {
       width: 1,
       curve: 'smooth',
       colors: ['rgba(0,0,0,0.2)']
   },
   legend: {
       position: 'right',
       offsetY: 60,
       height: 230,
       fontSize: '13px',
       markers: {
           width: 12,
           height: 12,
           radius: 6
       },
       itemMargin: {
           horizontal: 10,
           vertical: 5
       }
   },
   responsive: [{
       breakpoint: 480,
       options: {
           chart: {
               width: '100%'
           },
           legend: {
               position: 'bottom',
               offsetY: 0,
               height: 'auto'
           }
       }
   }],
   dataLabels: {
       enabled: true,
       formatter: function(val, opts) {
           return opts.w.globals.series[opts.seriesIndex].toFixed(1) + '%';
       },
       style: {
           fontSize: '11px',
           fontWeight: '600'
       },
       dropShadow: {
           enabled: true,
           top: 1,
           left: 1,
           blur: 2,
           opacity: 0.5
       }
   }
};

// --- Estimated Returns Chart Data (Scenarios) ---
const baseReturns = {
   series: [{ name: 'Growth', data: [4.26, 10.15, 2.08, 0] }, { name: 'Dividends', data: [1.27, 0.63, 3.35, 4.35] }, { name: 'Total Return', data: [5.53, 10.78, 5.43, 4.35] }],
   description: "Expected market returns based on historical averages and current conditions."
};
const optimisticReturns = {
   series: [{ name: 'Growth', data: [6.5, 14.0, 4.0, 0.1] }, { name: 'Dividends', data: [1.3, 0.7, 3.4, 4.4] }, { name: 'Total Return', data: [7.8, 14.7, 7.4, 4.5] }],
   description: "Potential returns in a strong market environment with favorable economic factors."
};
const pessimisticReturns = {
   series: [{ name: 'Growth', data: [1.0, 3.5, 0.5, -0.1] }, { name: 'Dividends', data: [1.2, 0.6, 3.2, 4.0] }, { name: 'Total Return', data: [2.2, 4.1, 3.7, 3.9] }],
   description: "Potential returns in a weaker market with economic headwinds or corrections."
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
       offsetY: -20, // Adjusted offset for better positioning
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
   title: {
       text: 'Est. 1-Year Return (%)',
       align: 'left',
       style: {
           color: getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim(), 
           fontSize: '16px'
       }
   },
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
    // Function to get colors based on data - Using new theme colors
    getColors: (data) => data.map(value => 
        value > 0 ? 'var(--negative-color)' : value < 0 ? 'var(--positive-color)' : 'var(--text-muted-color)' // Use CSS vars
    )
};
// Note: Cannot directly use CSS variables for ApexCharts `colors` array during initialization.
// We'll apply them dynamically or use hex codes. Using hex for simplicity here.
initialValuationData.colors = initialValuationData.seriesData.map(value => 
     value > 0 ? '#E53E3E' : value < 0 ? '#38A169' : '#A0AEC0'
);

// --- Market Valuation Chart Options --- 
const valuationOptions = {
    ...getChartOptions('dark'),
    series: [{
        name: 'Valuation',
        data: initialValuationData.seriesData // Use initial data
    }],
    chart: {
        ...getChartOptions('dark').chart,
        type: 'bar',
        height: 380,
        animations: {
            enabled: true,
            speed: 500,
            animateGradually: {
                enabled: false, // Disable gradual animation for sorting
                delay: 0
            }
        }
    },
    plotOptions: {
        bar: {
            horizontal: true,
            distributed: true,
            barHeight: '70%', // Increased height for better visibility
            borderRadius: 4, // Adjusted radius
            dataLabels: {
                position: 'center',
            },
        }
    },
    colors: initialValuationData.colors, // Use initial colors
    dataLabels: {
        enabled: true,
        formatter: function(val) {
            return val > 0 ? '+' + val.toFixed(1) + '%' : val.toFixed(1) + '%';
        },
        offsetX: -2, // Adjust offset slightly for horizontal bars
        style: {
            fontSize: '11px', // Adjusted size
            fontWeight: '600',
            colors: ['#fff']
        },
        background: {
            enabled: false
        },
        dropShadow: {
            enabled: true,
            top: 1, // Adjusted shadow for better visibility
            left: 1,
            blur: 1,
            opacity: 0.6
        }
    },
    stroke: {
        width: 0
    },
    xaxis: {
        categories: initialValuationData.categories, // Use initial categories
        labels: {
            formatter: function(val) {
                return val + '%';
            }
        },
        axisBorder: {
            show: false
        },
        axisTicks: {
            show: false
        }
    },
    yaxis: {
        labels: {
            style: {
                fontWeight: 500
            }
        }
    },
    title: {
        text: 'Asset Valuation Status',
        align: 'left',
        style: {
            fontSize: '16px',
            fontWeight: 600
        }
    },
    subtitle: {
        text: 'Positive % = overpriced, Negative % = underpriced',
        align: 'left',
        style: {
            fontSize: '12px',
            color: getComputedStyle(document.documentElement).getPropertyValue('--text-muted-color').trim()
        }
    },
    tooltip: {
        theme: 'dark',
        y: {
            title: {
                formatter: function() {
                    return 'Valuation:';
                }
            },
            formatter: function(val) {
                if (val > 0) {
                    return 'Overpriced by ' + val.toFixed(2) + '%';
                } else if (val < 0) {
                    return 'Underpriced by ' + Math.abs(val).toFixed(2) + '%';
                } else {
                    return 'Fair value';
                }
            }
        }
    },
    annotations: {
        xaxis: [{
            x: 0,
            strokeDashArray: 0,
            borderColor: getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim(),
            label: {
                borderColor: 'transparent',
                style: {
                    color: getComputedStyle(document.documentElement).getPropertyValue('--text-muted-color').trim(),
                    background: 'transparent',
                    fontSize: '10px'
                },
                text: 'Fair Value',
                position: 'top'
            }
        }]
    },
    grid: {
        xaxis: {
            lines: {
                show: true
            }
        },
        yaxis: {
            lines: {
                show: false
            }
        },
        padding: {
            top: 0,
            right: 0,
            bottom: 0,
            left: 10
        }
    },
    fill: {
        type: 'gradient',
        gradient: {
            shade: 'dark',
            type: 'horizontal',
            shadeIntensity: 0.4,
            inverseColors: false,
            opacityFrom: 1,
            opacityTo: 0.8,
            stops: [0, 100]
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
            allowMultipleDataPointsSelection: false,
            filter: {
                type: 'darken',
                value: 0.35
            }
        }
    }
};

// --- Enhanced Interactive Allocation Chart ---
// Data for allocation chart
const allocations = {
    series: [10.23, 33.84, 27.70, 3.57, 24.67],
    labels: ['SP500', 'NASDAQ', 'International', 'Bonds', 'Money Market'],
    colors: ["#4A90E2", "#7ABFFF", "#F6E05E", "#ED8936", "#A779E9"], // Primary Blue, Light Blue, Yellow, Orange, Purple
    descriptions: [
        "Large-cap U.S. equities (S&P 500 index).", // Shortened
        "Tech-focused U.S. equities (NASDAQ index).", // Shortened
        "International stocks (developed & emerging).", // Shortened
        "Fixed income securities for stability.", // Shortened
        "Cash & equivalents, high liquidity." // Shortened
    ],
    risks: ["Medium", "High", "Medium-High", "Low", "Very Low"],
    horizons: ["Long-term", "Long-term", "Long-term", "Medium-term", "Short-term"]
};

// Common options for both chart types
const commonChartOptions = {
    ...getChartOptions('dark'),
    series: allocations.series,
    labels: allocations.labels,
    colors: allocations.colors,
    title: {
        text: 'Target Asset Allocation',
        align: 'left',
        style: {
            color: getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim(), 
            fontSize: '18px'
        }
    },
    tooltip: {
        ...getChartOptions('dark').tooltip,
        custom: function ({ seriesIndex, w }) {
            const value = w.globals.series[seriesIndex];
            const label = w.globals.labels[seriesIndex];
            return `
                <div class="apexcharts-tooltip-custom">
                    <div style="font-weight:600; margin-bottom:5px;">${label}</div>
                    <div style="font-size:20px; font-weight:700; margin-bottom:5px;">${value.toFixed(2)}%</div>
                    <div style="font-size:12px;">${allocations.descriptions[seriesIndex]}</div>
                    <div style="font-size:12px; margin-top:5px;">
                        <span style="color:${allocations.colors[seriesIndex]}">●</span> Risk: ${allocations.risks[seriesIndex]} | Horizon: ${allocations.horizons[seriesIndex]}
                    </div>
                </div>
            `;
        }
    },
    responsive: [{
        breakpoint: 480,
        options: {
            chart: {
                width: '100%'
            },
            legend: {
                position: 'bottom',
                offsetY: 0,
                height: 'auto'
            }
        }
    }]
};

// Donut chart options
const donutOptions = {
    ...commonChartOptions,
    chart: {
        ...commonChartOptions.chart,
        type: 'donut',
        events: {
            dataPointSelection: function(event, chartContext, config) {
                updateAllocationDetails(config.dataPointIndex);
            },
            dataPointMouseEnter: function(event, chartContext, config) {
                const seriesIndex = config.dataPointIndex;
                document.querySelector('#allocation-chart').style.cursor = 'pointer';
            },
            dataPointMouseLeave: function(event, chartContext, config) {
                document.querySelector('#allocation-chart').style.cursor = 'default';
            }
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
                        label: 'Total Allocation',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim()
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
        fontSize: '12px', // Adjusted size
        itemMargin: {
            horizontal: 8, // Adjust spacing
            vertical: 4
        },
        onItemClick: {
            toggleDataSeries: false
        },
        markers: {
            width: 12,
            height: 12,
            radius: 6
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
                type: 'darken',
                value: 0.15
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
            return opts.w.globals.series[opts.seriesIndex].toFixed(1) + '%';
        },
        style: {
            fontSize: '10px',
            fontWeight: '600',
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
};

// Bar chart options
const barOptions = {
    ...commonChartOptions,
    chart: {
        ...commonChartOptions.chart,
        type: 'bar',
        height: 350,
        events: {
            dataPointSelection: function(event, chartContext, config) {
                updateAllocationDetails(config.dataPointIndex);
            },
            dataPointMouseEnter: function(event, chartContext, config) {
                document.querySelector('#allocation-chart').style.cursor = 'pointer';
            },
            dataPointMouseLeave: function(event, chartContext, config) {
                document.querySelector('#allocation-chart').style.cursor = 'default';
            }
        }
    },
    series: [{
        name: 'Allocation',
        data: allocations.series
    }],
    plotOptions: {
        bar: {
            distributed: true,
            borderRadius: 6,
            columnWidth: '60%',
            dataLabels: {
                position: 'top'
            }
        }
    },
    dataLabels: {
        enabled: true,
        formatter: function(val) {
            return val.toFixed(1) + '%';
        },
        offsetY: -20,
        style: {
            fontSize: '10px',
            colors: ["#fff"],
            fontWeight: 600
        }
    },
    legend: {
        show: false
    },
    xaxis: {
        type: 'category',
        categories: allocations.labels,
        labels: {
            show: true,
            rotate: -45,
            rotateAlways: false,
            hideOverlappingLabels: true,
            style: {
                fontSize: '12px'
            }
        }
    },
    yaxis: {
        title: {
            text: 'Allocation (%)'
        },
        labels: {
            formatter: function(val) {
                return val.toFixed(1) + '%';
            }
        },
        max: function(max) {
            return Math.max(Math.ceil(max), 40); // Ensure we have enough space
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

// Function to update allocation details panel
function updateAllocationDetails(index) {
    if (index === undefined || index < 0) {
        // Reset to default
        document.querySelector('.allocation-info h3').textContent = 'Selected Asset';
        document.querySelector('.allocation-value').textContent = 'Click a segment to view details';
        return;
    }

    const label = allocations.labels[index];
    const value = allocations.series[index];
    const description = allocations.descriptions[index];
    const risk = allocations.risks[index];
    const horizon = allocations.horizons[index];
    
    // Update the details section
    const infoElement = document.querySelector('.allocation-info');
    const valueElement = document.querySelector('.allocation-value');
    
    if (!infoElement || !valueElement) return; // Add check
    
    infoElement.querySelector('h3').textContent = label;
    
    // Create a rich info display
    const detailHTML = `
        <div>${value.toFixed(2)}%</div>
        <div class="allocation-detail-text">${description}</div>
        <div class="allocation-metadata">
            <span class="tag risk-${risk.toLowerCase().replace(/[\s_]+/g, '-')}">${risk} Risk</span>
            <span class="tag horizon-tag">${horizon}</span>
        </div>
    `;
    valueElement.innerHTML = detailHTML;
    
    // Update stats (optional)
    const stockTotal = allocations.series.slice(0, 3).reduce((a, b) => a + b, 0);
    document.getElementById('stock-total').textContent = stockTotal.toFixed(2) + '%';
}

// Initialize charts after DOM content loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize charts
    let allocationChart;
    let currentAllocationChartType = 'donut';
    let returnsChart; // Declare returnsChart here
    let valuationChart; // Declare valuation chart variable
    
    // Chart Containers - Check if they exist
    const allocationChartContainer = document.querySelector("#allocation-chart");
    const returnsChartContainer = document.querySelector("#returns-chart");
    const valuationChartContainer = document.querySelector("#overprice-chart");

    // Initial Allocation Chart Render
    if (allocationChartContainer) {
        allocationChart = new ApexCharts(allocationChartContainer, donutOptions);
        allocationChart.render();
    } else {
        console.error("Allocation chart container not found");
    }
    
    // Button event handlers
    document.getElementById('view-as-donut').addEventListener('click', function() {
        if (currentAllocationChartType !== 'donut' && allocationChartContainer && allocationChart) {
            document.getElementById('view-as-donut').classList.add('active');
            document.getElementById('view-as-bar').classList.remove('active');
            
            // Destroy existing chart and create new one
            allocationChart.destroy();
            allocationChart = new ApexCharts(allocationChartContainer, donutOptions);
            allocationChart.render();
            currentAllocationChartType = 'donut';
            
            // Reset details
            updateAllocationDetails(-1);
        }
    });
    
    document.getElementById('view-as-bar').addEventListener('click', function() {
        if (currentAllocationChartType !== 'bar' && allocationChartContainer && allocationChart) {
            console.log("Switching to bar chart view");
            
            // Update button states
            document.getElementById('view-as-donut').classList.remove('active');
            document.getElementById('view-as-bar').classList.add('active');
            
            try {
                // Create a bar-specific config that includes distributed colors
                const barSpecificConfig = {
                    ...barOptions,
                    colors: allocations.colors, // Ensure colors are applied
                    chart: {
                        ...barOptions.chart,
                        animations: {
                            enabled: true,
                            animateGradually: {
                                enabled: true,
                                delay: 150
                            },
                            dynamicAnimation: {
                                enabled: true,
                                speed: 350
                            }
                        }
                    }
                };
                
                console.log("Bar chart config:", JSON.stringify(barSpecificConfig.series));
                
                // Destroy existing chart and create new one
                allocationChart.destroy();
                
                allocationChartContainer.style.height = '350px'; // Ensure height is set for bar chart
                allocationChartContainer.style.visibility = 'visible';
                
                allocationChart = new ApexCharts(allocationChartContainer, barSpecificConfig);
                allocationChart.render();
                currentAllocationChartType = 'bar';
                
                // Reset details
                updateAllocationDetails(-1);
            } catch (error) {
                console.error("Error switching to bar chart:", error);
            }
        }
    });
    
    // Initialize returns chart
    if (returnsChartContainer) {
        returnsChart = new ApexCharts(returnsChartContainer, returnsOptions);
        returnsChart.render();
    } else {
        console.error("Returns chart container not found");
    }

    // Add event listeners for returns scenario buttons
    const scenarioButtons = {
        'returns-base': baseReturns,
        'returns-optimistic': optimisticReturns,
        'returns-pessimistic': pessimisticReturns
    };
    const scenarioDescElement = document.getElementById('scenario-description');
    const returnsButtonsContainer = document.querySelector('.scenario-controls');

    // Only add listeners if the chart and buttons exist
    if (returnsChart && returnsButtonsContainer && scenarioDescElement) {
        Object.keys(scenarioButtons).forEach(buttonId => {
            document.getElementById(buttonId).addEventListener('click', function() {
                // Update button active state
                returnsButtonsContainer.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');

                // Update chart and description
                const scenarioData = scenarioButtons[buttonId];
                returnsChart.updateSeries(scenarioData.series);
                scenarioDescElement.textContent = scenarioData.description;
            });
        });
    }
    
    // Initialize valuation chart
    if (valuationChartContainer) {
        valuationChart = new ApexCharts(valuationChartContainer, valuationOptions); // Initialize with base options
        valuationChart.render();
    } else {
        console.error("Valuation chart container not found");
    }
    
    // Add event listeners for valuation sort buttons
    const valuationSortControls = document.querySelector('.valuation-sort-controls');
    if (valuationChart && valuationSortControls) {
        valuationSortControls.addEventListener('click', function(event) {
            if (event.target.tagName === 'BUTTON') {
                // Update active button state
                valuationSortControls.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
                event.target.classList.add('active');

                // Combine categories and data for sorting
                let items = initialValuationData.categories.map((category, index) => ({
                    category: category,
                    value: initialValuationData.seriesData[index]
                }));

                // Sort based on button ID
                const sortType = event.target.id;
                if (sortType === 'valuation-sort-overpriced') {
                    items.sort((a, b) => b.value - a.value); // Descending (most overpriced first)
                } else if (sortType === 'valuation-sort-underpriced') {
                    items.sort((a, b) => a.value - b.value); // Ascending (most underpriced first)
                } else { // Default sort (use original order)
                    // Reset items based on the original categories order
                     items = initialValuationData.categories.map((category, index) => ({
                        category: category,
                        value: initialValuationData.seriesData[index]
                    }));
                }

                // Extract sorted data
                const sortedCategories = items.map(item => item.category);
                const sortedData = items.map(item => item.value);
                const sortedColors = initialValuationData.getColors(sortedData);

                // Update chart
                valuationChart.updateOptions({
                    xaxis: {
                        categories: sortedCategories
                    },
                    series: [{
                        data: sortedData
                    }],
                    colors: sortedColors
                });
            }
        });
    }
    
    // Add card hover effect
    document.querySelectorAll('.card, .summary-item').forEach(item => {
        item.addEventListener('mouseenter', function() {
            // Hover effects are now handled by CSS :hover pseudo-class
        });
        
        item.addEventListener('mouseleave', function() {
            // this.style.transform = '';
            // this.style.boxShadow = '';
        });
    });
    
    // Table row hover (Alternative using CSS :hover, preferred)
    // The CSS already handles this with: tbody tr:hover { background-color: var(--highlight-color); }
    // The JS listeners below can be removed if CSS is sufficient.
     document.querySelectorAll('tbody tr').forEach(row => {
         row.addEventListener('mouseenter', function() {
             // This JS is redundant if CSS :hover is defined and working
         });
         row.addEventListener('mouseleave', function() {
             // This JS is redundant
         });
     });

    // Portfolio Calculator
    const calculateBtn = document.getElementById('calculateBtn');
    const portfolioValueInput = document.getElementById('portfolioValue');
    const calculationResults = document.getElementById('calculationResults');
    const calculationResultsBody = document.getElementById('calculationResultsBody');
    const totalAmountSpan = document.getElementById('totalAmount');
    
    if (calculateBtn && portfolioValueInput && calculationResults && calculationResultsBody) {
        // Current prices from the performance table
        const currentPrices = {
            'SP500': 5363.36,
            'NASDAQ': 16724.46,
            'International': 67.47,
            'Bonds': 72.02,
            'Money Market': 1.00
        };
        
        // Function to calculate and display allocation
        const calculatePortfolioAllocation = () => {
            const portfolioValue = parseFloat(portfolioValueInput.value);
            if (isNaN(portfolioValue) || portfolioValue <= 0) {
                // Hide results if input is invalid
                calculationResults.style.display = 'none';
                // Hide other portfolio-related sections
                document.getElementById('dollarReturnsSection').style.display = 'none';
                document.getElementById('desktop-dollar-valuation-section').style.display = 'none';
                return;
            }
            
            // Clear previous results
            calculationResultsBody.innerHTML = '';
            
            // Format for currency display
            const formatter = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
            
            // Get the allocation data (assuming this is from the chart)
            const allocationData = allocations.series;
            const assetLabels = allocations.labels;
            
            // Create rows for each asset
            allocationData.forEach((percentage, index) => {
                const amount = (percentage / 100) * portfolioValue;
                const row = document.createElement('tr');
                
                // Get current price for this asset
                let assetName = assetLabels[index];
                let currentPrice = currentPrices[assetName] || 0;
                let priceDisplay = assetName === 'SP500' || assetName === 'NASDAQ' ? 
                    currentPrice.toLocaleString() : formatter.format(currentPrice);
                
                row.innerHTML = `
                    <td style="padding: 10px 8px; border-bottom: 1px solid var(--border-color);">${assetLabels[index]}</td>
                    <td style="padding: 10px 8px; border-bottom: 1px solid var(--border-color); text-align: right;">${percentage.toFixed(2)}%</td>
                    <td style="padding: 10px 8px; border-bottom: 1px solid var(--border-color); text-align: right; font-weight: 600;">${formatter.format(amount)}</td>
                    <td style="padding: 10px 8px; border-bottom: 1px solid var(--border-color); text-align: right;">${priceDisplay}</td>
                `;
                
                calculationResultsBody.appendChild(row);
            });
            
            // Add total row with strong styling
            const totalRow = document.createElement('tr');
            totalRow.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
            totalRow.innerHTML = `
                <td style="padding: 10px 8px; font-weight: 700;">Total Portfolio</td>
                <td style="padding: 10px 8px; text-align: right; font-weight: 700;">100.00%</td>
                <td style="padding: 10px 8px; text-align: right; font-weight: 700;">${formatter.format(portfolioValue)}</td>
                <td style="padding: 10px 8px; text-align: right;"></td>
            `;
            calculationResultsBody.appendChild(totalRow);
            
            // Update total amount display
            totalAmountSpan.textContent = `Total: ${formatter.format(portfolioValue)}`;
            
            // Show the results with animation
            calculationResults.style.display = 'block';
            
            // Update portfolio value display elsewhere on the page
            const portfolioValueDisplay = document.getElementById('desktopPortfolioValueDisplay');
            if (portfolioValueDisplay) {
                portfolioValueDisplay.textContent = formatter.format(portfolioValue);
            }
            
            // Update dollar returns section
            updateDollarReturnSection(portfolioValue);
            
            // Update dollar valuation section
            updateDollarValuationSection(portfolioValue);
        };
        
        // Function to update dollar returns section
        const updateDollarReturnSection = (portfolioValue) => {
            const returnsSection = document.getElementById('dollarReturnsSection');
            const returnsBody = document.getElementById('desktop-dollar-returns-body');
            
            if (!returnsSection || !returnsBody) return;
            
            // Clear previous results
            returnsBody.innerHTML = '';
            
            // Get current scenario data
            let currentScenario = baseReturns;
            if (document.getElementById('returns-optimistic').classList.contains('active')) {
                currentScenario = optimisticReturns;
            } else if (document.getElementById('returns-pessimistic').classList.contains('active')) {
                currentScenario = pessimisticReturns;
            }
            
            // Get the total return series (index 2)
            const totalReturnData = currentScenario.series[2].data;
            
            // Format for currency display
            const formatter = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
            
            // Create rows for applicable assets
            allocations.series.forEach((percentage, index) => {
                // Skip assets that don't have return data
                if (index >= totalReturnData.length) return;
                
                const amount = (percentage / 100) * portfolioValue;
                const returnPercent = totalReturnData[index];
                const dollarsReturned = amount * (returnPercent / 100);
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td style="padding: 10px 8px; border-bottom: 1px solid var(--border-color);">${allocations.labels[index]}</td>
                    <td style="padding: 10px 8px; border-bottom: 1px solid var(--border-color); text-align: right;">${formatter.format(amount)}</td>
                    <td style="padding: 10px 8px; border-bottom: 1px solid var(--border-color); text-align: right;">${returnPercent.toFixed(2)}%</td>
                    <td style="padding: 10px 8px; border-bottom: 1px solid var(--border-color); text-align: right; font-weight: 600; color: ${dollarsReturned >= 0 ? 'var(--positive-color)' : 'var(--negative-color)'}">
                        ${formatter.format(dollarsReturned)}
                    </td>
                `;
                
                returnsBody.appendChild(row);
            });
            
            // Calculate total return
            let totalReturn = 0;
            let totalInvestment = 0;
            
            allocations.series.forEach((percentage, index) => {
                if (index >= totalReturnData.length) return;
                
                const amount = (percentage / 100) * portfolioValue;
                totalInvestment += amount;
                totalReturn += amount * (totalReturnData[index] / 100);
            });
            
            // Add total row
            const totalRow = document.createElement('tr');
            totalRow.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
            
            const totalReturnPercentage = (totalReturn / totalInvestment) * 100;
            
            totalRow.innerHTML = `
                <td style="padding: 10px 8px; font-weight: 700;">Total</td>
                <td style="padding: 10px 8px; text-align: right; font-weight: 700;">${formatter.format(totalInvestment)}</td>
                <td style="padding: 10px 8px; text-align: right; font-weight: 700;">${totalReturnPercentage.toFixed(2)}%</td>
                <td style="padding: 10px 8px; text-align: right; font-weight: 700; color: ${totalReturn >= 0 ? 'var(--positive-color)' : 'var(--negative-color)'}">
                    ${formatter.format(totalReturn)}
                </td>
            `;
            returnsBody.appendChild(totalRow);
            
            // Show the section
            returnsSection.style.display = 'block';
        };
        
        // Function to update dollar valuation section
        const updateDollarValuationSection = (portfolioValue) => {
            const valuationSection = document.getElementById('desktop-dollar-valuation-section');
            const valuationBody = document.getElementById('desktop-dollar-valuation-body');
            
            if (!valuationSection || !valuationBody) return;
            
            // Don't show for small portfolio values to avoid clutter
            if (portfolioValue < 5000) {
                valuationSection.style.display = 'none';
                return;
            }
            
            // Clear previous results
            valuationBody.innerHTML = '';
            
            // Predicted prices from the valuation details table
            const predictedPrices = {
                'SP500': 4570.69,
                'NASDAQ': 15639.76,
                'Intl (IXUS)': 66.96,
                'Bonds (BND)': 1891.06
            };
            
            // Current prices from the performance table
            const currentPrices = {
                'SP500': 5363.36,
                'NASDAQ': 16724.46,
                'International': 67.47,
                'Bonds': 72.02,
                'Money Market': 1.00
            };
            
            // Format for currency display
            const formatter = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
            
            // Map categories to allocation labels
            const categoryToAllocationIndex = {
                'SP500': 0,
                'NASDAQ': 1, 
                'Intl (IXUS)': 2,
                'Bonds (BND)': 3
            };
            
            // Create rows for each asset
            let assets = Object.keys(categoryToAllocationIndex);
            let totalCurrentValue = 0;
            let totalPredictedValue = 0;
            
            assets.forEach(assetName => {
                const allocationIndex = categoryToAllocationIndex[assetName];
                
                // Skip if we can't map to an allocation
                if (allocationIndex === undefined) return;
                
                const percentage = allocations.series[allocationIndex];
                const currentAmount = (percentage / 100) * portfolioValue;
                
                // Skip if we don't have predicted price data for this asset
                if (!predictedPrices[assetName]) return;
                
                // Get prices and calculate ratio
                const currentPrice = currentPrices[assetName.replace('Intl (IXUS)', 'International').replace('Bonds (BND)', 'Bonds')];
                const predictedPrice = predictedPrices[assetName];
                
                if (!currentPrice) return;
                
                // Calculate predicted value based on the ratio between predicted and current price
                const ratio = predictedPrice / currentPrice;
                const predictedValue = currentAmount * ratio;
                const valueDifference = predictedValue - currentAmount;
                
                // Track totals
                totalCurrentValue += currentAmount;
                totalPredictedValue += predictedValue;
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td style="padding: 10px 8px; border-bottom: 1px solid var(--border-color);">${assetName}</td>
                    <td style="padding: 10px 8px; border-bottom: 1px solid var(--border-color); text-align: right;">${percentage.toFixed(2)}%</td>
                    <td style="padding: 10px 8px; border-bottom: 1px solid var(--border-color); text-align: right;">${formatter.format(currentAmount)}</td>
                    <td style="padding: 10px 8px; border-bottom: 1px solid var(--border-color); text-align: right;">${formatter.format(predictedValue)}</td>
                    <td style="padding: 10px 8px; border-bottom: 1px solid var(--border-color); text-align: right; font-weight: 600; color: ${valueDifference >= 0 ? 'var(--positive-color)' : 'var(--negative-color)'}">
                        ${formatter.format(valueDifference)}
                    </td>
                `;
                
                valuationBody.appendChild(row);
            });
            
            const totalDifference = totalPredictedValue - totalCurrentValue;
            
            // Add total row
            const totalRow = document.createElement('tr');
            totalRow.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
            
            totalRow.innerHTML = `
                <td style="padding: 10px 8px; font-weight: 700;">Total</td>
                <td style="padding: 10px 8px; text-align: right; font-weight: 700;"></td>
                <td style="padding: 10px 8px; text-align: right; font-weight: 700;">${formatter.format(totalCurrentValue)}</td>
                <td style="padding: 10px 8px; text-align: right; font-weight: 700;">${formatter.format(totalPredictedValue)}</td>
                <td style="padding: 10px 8px; text-align: right; font-weight: 700; color: ${totalDifference >= 0 ? 'var(--positive-color)' : 'var(--negative-color)'}">
                    ${formatter.format(totalDifference)}
                </td>
            `;
            
            valuationBody.appendChild(totalRow);
            
            // Show the section
            valuationSection.style.display = 'block';
        };
        
        // Set up event listeners for real-time updates
        portfolioValueInput.addEventListener('input', calculatePortfolioAllocation);
        
        // Also update on focus if there's already a value
        portfolioValueInput.addEventListener('focus', function() {
            if (this.value) {
                calculatePortfolioAllocation();
            }
        });
        
        // Keep calculate button for fallback and accessibility
        calculateBtn.addEventListener('click', calculatePortfolioAllocation);
        
        // Allow pressing Enter to calculate
        portfolioValueInput.addEventListener('keyup', function(event) {
            if (event.key === 'Enter') {
                calculateBtn.click();
            }
        });
        
        // Add a debounce timer for performance while typing
        let debounceTimer;
        portfolioValueInput.addEventListener('input', function() {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(calculatePortfolioAllocation, 200);
        });
        
        // Add listeners to update dollar returns when scenarios change
        document.querySelectorAll('#returns-base, #returns-optimistic, #returns-pessimistic').forEach(button => {
            button.addEventListener('click', function() {
                const portfolioValue = parseFloat(portfolioValueInput.value);
                if (!isNaN(portfolioValue) && portfolioValue > 0) {
                    updateDollarReturnSection(portfolioValue);
                }
            });
        });
        
        // Add listeners to update valuation section when sort options change
        document.querySelectorAll('#valuation-sort-default, #valuation-sort-overpriced, #valuation-sort-underpriced').forEach(button => {
            button.addEventListener('click', function() {
                // Just delay slightly to allow the chart to update first
                setTimeout(() => {
                    const portfolioValue = parseFloat(portfolioValueInput.value);
                    if (!isNaN(portfolioValue) && portfolioValue > 0) {
                        updateDollarValuationSection(portfolioValue);
                    }
                }, 300);
            });
        });
    }
});

// Mobile menu JavaScript
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenu = document.getElementById('mobile-menu');
    const navMenu = document.getElementById('nav-menu');
    
    if (mobileMenu && navMenu) {
        mobileMenu.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            mobileMenu.classList.toggle('active');
        });
        
        // Close mobile menu when a link is clicked
        const navLinks = navMenu.querySelectorAll('a');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                navMenu.classList.remove('active');
                mobileMenu.classList.remove('active');
            });
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', function(event) {
            const isClickInsideMenu = navMenu.contains(event.target);
            const isClickOnToggle = mobileMenu.contains(event.target);
            
            if (!isClickInsideMenu && !isClickOnToggle && navMenu.classList.contains('active')) {
                navMenu.classList.remove('active');
                mobileMenu.classList.remove('active');
            }
        });
    }
}); 