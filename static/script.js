// API Configuration
const isDevelopment = false;  // Set this to false before deploying
const API_BASE_URL = isDevelopment ? 'http://127.0.0.1:5000' : 'https://www.collegegrades.org';

// Modify your fetch URLs to use the API_BASE_URL
// Change this line in the autocomplete function:

// And this line in the fetchGrades function:
function debounce(func, wait) {
    let timeout;

    return function executedFunction(...args) {
        var later = () => {
            clearTimeout(timeout);
            func(...args);
        };

        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Example UC Synonyms dictionary
var unisynonyms = {
    "Cal Poly Pomona": ['California State Polytechnic University, Pomona', 'California State Polytechnic University Pomona', 'CPP'],
    "Cal State LA": ["California State University, Los Angeles", "California State University Los Angeles", "Cal State L.A.", "Cal State Los Angeles"],
    "Chico State": ["California State University, Chico", "California State University Chico", "CSUC", "CSU Chico", "Cal State Chico", "Chico University", "Chico State University"],
    "CSU Channel Islands": ["California State University, Channel Islands", "California State University Channel Islands", "CSUCI"],
    "Cal State East Bay": ["Pioneers", "California State University, East Bay", "California State University East Bay", "CSUEB", "CSU East Bay"],
    "CSU Nothridge": ["Matadors", "CSUN", "California State University Northridge", "California State University, Northridge", "Cal State Northridge"],
    "Sacramento State": ["Sac State", "California State University, Sacramento", "California State University Sacramento"],
    "CSU San Bernardino": ["California State University, San Bernardino", "California State University San Bernardino", "CSUSB", "Cal State San Bernardino"],
    "CSU San Marcos": ["California State University, San Marcos", "California State University San Marcos", "CSUSM", "Cal State San Marcos"],
    "Stanislaus State": ["Stan State", "California State University Stanislaus", "California State University, Stanislaus", "Stanislaus State University", "Stan State University", "University of Stanislaus State", "CSU Stanislaus", "Cal State Stanislaus"],
    "Cal Poly Humboldt": ["California State Polytechnic University, Humboldt", "California State Polytechnic University Humboldt", "Humboldt", "CPH"],
    "San Francisco State": ["SFSU", "San Francisco State University", "SF State"],
    "San Jose State": ["SJSU", "Spartans", "San Jose State University"],
    "UCLA": ["University of California, Los Angeles", "Bruins", "Westwood", "UC Los Angeles", "University of California Los Angeles"],
    "UC Berkeley": ["University of California, Berkeley", "Berkeley", "UCB", "University of California Berkeley"],
    "UC Davis": ["University of California, Davis", "Aggies", "UCD", "University of California Davis"],
    "UC Irvine": ["University of California, Irvine", "University of California Irvine", "Anteaters", "Zot", "UCI"],
    "UC Merced": ["UCM", "University of California, Merced", "University of California Merced", "Bobcats"],
    "UC Santa Barbara": ["UCSB", "University of California, Santa Barbara", "University of California Santa Barbara", "Gauchos"],
    "UC Santa Cruz": ["UCSC", "	University of California, Santa Cruz", "	University of California Santa Cruz", "Banana Slugs"],
    "UC San Diego": ["UCSD", "University of California, San Diego", "University of California San Diego"]
    // Continue for all UCs...
};


document.addEventListener('DOMContentLoaded', () => {
    var filterIds = ['instructor', 'year', 'catalog_number', 'subject', 'term', 'university', 'title'];

    filterIds.forEach((filterId) => {
        var inputElement = document.getElementById(filterId); // This line was missing in the provided code snippet.
        if (inputElement) {
            var debouncedAutocomplete = debounce(() => autocomplete(inputElement, filterId), 500);
            inputElement.addEventListener('input', debouncedAutocomplete); // Use debounced function here.
            inputElement.addEventListener('blur', () => {
                hideSuggestionTimeout = setTimeout(() => clearSuggestions(inputElement), 200); // Use a timeout to delay hiding
            });
        }
    });
    var submitButton = document.getElementById('submit');
    if (submitButton) {
        submitButton.addEventListener('click', fetchGrades);
    }
});

function standardizeUniversityValue(inputElement) {
    if (inputElement && inputElement.id === 'university') {
        let inputValue = inputElement.value.trim().toLowerCase();
        for (let key in unisynonyms) {
            let synonyms = unisynonyms[key].map(name => name.toLowerCase());
            if (synonyms.includes(inputValue)) {
                inputElement.value = key; // Assign the standardized key
                break; // Exit once a match is found
            }
        }
    }
}

function autocomplete(inputElement, filterField) {
    displaySearchingMessage(inputElement);
    standardizeUniversityValue(inputElement);

    var filters = getFilters();
    var queryString = Object.keys(filters)
        .filter(key => filters[key] && key !== filterField)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(filters[key])}`)
        .join('&');

    var currentFieldQuery = `autocomplete_field=${encodeURIComponent(filterField)}&search=${encodeURIComponent(inputElement.value.trim())}`;
    var combinedQueryString = queryString.length > 0 ? `${currentFieldQuery}&${queryString}` : currentFieldQuery;
    var fetchUrl = `${API_BASE_URL}/api/autocomplete?${combinedQueryString}`;

    fetch(fetchUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (filterField === 'year') {
                data.sort((a, b) => b - a);
            }
            displaySuggestions(data, inputElement, filterField);
        })
        .catch(error => {
            console.error('Error:', error);
            displaySuggestions([], inputElement, filterField); // Clear suggestions on error
            displayErrorMessage(inputElement, 'Error loading suggestions');
        });
}

// Utility function to get all filter values, with added console logging
function getFilters() {
    var filterIds = ['instructor', 'year', 'catalog_number', 'subject', 'term', 'university', 'title'];
    let filters = {};
    filterIds.forEach(filterId => {
        var inputElement = document.getElementById(filterId);
        if (inputElement && inputElement.value.trim()) {
            filters[filterId] = inputElement.value.trim();
            //console.log(`Filter [${filterId}] has value:`, inputElement.value.trim());
        }
    });
    return filters;
}
// displaySuggestions and clearSuggestions remain unchanged from the previous explanation.
let hideSuggestionTimeout; // Declare a global variable for the hide timeout

function displaySuggestions(suggestions, inputElement, filterField) {
    clearSuggestions(inputElement);
    inputElement.style.position = 'relative';

    // Create a container for the suggestions if it doesn't already exist
    let suggestionBox = document.createElement('div');
    suggestionBox.className = 'autocomplete-suggestions';
    inputElement.after(suggestionBox);

    suggestions.forEach((item) => {
        let suggestionItem = document.createElement('div');
        suggestionItem.className = 'suggestion-item';
        suggestionItem.textContent = item;
        suggestionItem.addEventListener('click', () => {
            clearTimeout(hideSuggestionTimeout); // Clear the timeout to prevent the box from hiding
            inputElement.value = item;
            clearSuggestions(inputElement);
        });
        suggestionBox.appendChild(suggestionItem);
    });
}

function displaySearchingMessage(inputElement) {
    clearSuggestions(inputElement); // Clears any existing suggestions or messages
    inputElement.style.position = 'relative';
    let suggestionBox = document.createElement('div');
    suggestionBox.className = 'autocomplete-suggestions';
    suggestionBox.textContent = 'Searching...'; // Set the searching text
    inputElement.after(suggestionBox);
}


function clearSuggestions(inputElement) {
    let existingSuggestions = inputElement.parentNode.querySelector('.autocomplete-suggestions');
    if (existingSuggestions) {
        existingSuggestions.remove();
    }
}

function fetchGrades() {
    var filters = getFilters();
    var university = document.getElementById('university').value;

    var queryString = Object.keys(filters)
        .filter(key => filters[key])
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(filters[key])}`)
        .join('&');

    var fetchUrl = `${API_BASE_URL}/api/grades?${queryString}`;
    
    // console.log('Fetching grades from:', fetchUrl); // Add this for debugging

    document.getElementById('results').innerHTML = 'Loading...';
    
    fetch(fetchUrl)
        .then(response => {
            if (!response.ok) {
                console.error('Server response:', response.status, response.statusText);
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // console.log('Received data:', data); // Add this for debugging
            displayGradesResults(data, university);
        })
        .catch(error => {
            console.error('Error fetching grades:', error);
            document.getElementById('results').innerHTML = `Error loading data: ${error.message}`;
        });
}

function formatNumber(num) {
    if (typeof num !== 'number') return '0';
    return num.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
}

function displayGradesResults(data, university) {
    // Determine whether to use the provided GPA or calculate it
    var useProvidedGPA = university === 'UC San Diego';
    var averageGPA = calculateAverageGPA(data, useProvidedGPA);

    // Update GPA display
    let gpaDisplay = document.getElementById('averageGPA');
    if (!gpaDisplay) {
        gpaDisplay = document.createElement('p');
        gpaDisplay.id = 'averageGPA';
        var chartContainer = document.getElementById('gradesChart').parentNode;
        chartContainer.insertBefore(gpaDisplay, document.getElementById('gradesChart'));
    }
    gpaDisplay.textContent = `Average GPA: ${averageGPA.toFixed(2)}`;

    // Handle chart display
    var ctx = document.getElementById('gradesChart').getContext('2d');
    if (gradesChartInstance) {
        gradesChartInstance.destroy();
    }

    let gradeLabels = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F'];
    let gradeData = [
        data['A_plus'], data['A'], data['A_minus'],
        data['B_plus'], data['B'], data['B_minus'],
        data['C_plus'], data['C'], data['C_minus'],
        data['D_plus'], data['D'], data['D_minus'],
        data['F']
    ];

    // Adjust labels and data for specific universities
    if (university === 'Cal State East Bay') {
        gradeLabels = ['A', 'B', 'C', 'DFWU'];
        gradeData = [
            data['A_plus'] + data['A'] + data['A_minus'],
            data['B_plus'] + data['B'] + data['B_minus'],
            data['C_plus'] + data['C'] + data['C_minus'],
            data['DFWU']
        ];
    } else if (university === 'UC San Diego') {
        gradeLabels = ['A', 'B', 'C', 'D', 'F'];
        gradeData = [
            data['A_plus'] + data['A'] + data['A_minus'],
            data['B_plus'] + data['B'] + data['B_minus'],
            data['C_plus'] + data['C'] + data['C_minus'],
            data['D_plus'] + data['D'] + data['D_minus'],
            data['F']
        ];
    }

    // Create chart
    gradesChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: gradeLabels,
            datasets: [{
                label: 'Grade Distribution',
                backgroundColor: '#4f46e5',
                borderColor: '#4f46e5',
                borderWidth: 1,
                data: gradeData,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: document.documentElement.classList.contains('dark') ? '#374151' : '#e5e7eb'
                    },
                    ticks: {
                        color: document.documentElement.classList.contains('dark') ? '#f9fafb' : '#111827',
                        font: {
                            size: 14
                        }
                    }
                },
                x: {
                    grid: {
                        color: document.documentElement.classList.contains('dark') ? '#374151' : '#e5e7eb'
                    },
                    ticks: {
                        color: document.documentElement.classList.contains('dark') ? '#f9fafb' : '#111827',
                        font: {
                            size: 14
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: document.documentElement.classList.contains('dark') ? '#f9fafb' : '#111827',
                        font: {
                            size: 14
                        }
                    }
                },
                title: {
                    display: true,
                    text: 'Grade Distribution',
                    color: document.documentElement.classList.contains('dark') ? '#f9fafb' : '#111827',
                    font: {
                        size: 18,
                        weight: 'bold'
                    }
                }
            }
        }
    });

    // Display detailed grades
    var resultsContainer = document.getElementById('results');
    resultsContainer.innerHTML = '';

    // Create the grades given section
    const gradesSection = document.createElement('div');
    gradesSection.className = 'grades-section';

    // Define grade categories with their respective data keys
    const categories = {
        'Letter Grades': [
            { key: 'A_plus', display: 'A+' },
            { key: 'A', display: 'A' },
            { key: 'A_minus', display: 'A-' },
            { key: 'B_plus', display: 'B+' },
            { key: 'B', display: 'B' },
            { key: 'B_minus', display: 'B-' },
            { key: 'C_plus', display: 'C+' },
            { key: 'C', display: 'C' },
            { key: 'C_minus', display: 'C-' },
            { key: 'D_plus', display: 'D+' },
            { key: 'D', display: 'D' },
            { key: 'D_minus', display: 'D-' },
            { key: 'F', display: 'F' }
        ],
        'Pass/No Pass': [
            { key: 'Pass', display: 'Pass' },
            { key: 'Not_Pass', display: 'Not Pass' },
            { key: 'Satisfactory', display: 'Satisfactory' },
            { key: 'Not_Satisfactory', display: 'Not Satisfactory' },
            { key: 'Unsatisfactory', display: 'Unsatisfactory' }
        ],
        'Withdrawals': [
            { key: 'Withdrawn', display: 'Withdrawn' },
            { key: 'Withdrawn_Incomplete', display: 'Withdrawn Incomplete' },
            { key: 'Withdrawn_Medical', display: 'Withdrawn Medical' },
            { key: 'Withdrawn_Passing', display: 'Withdrawn Passing' },
            { key: 'Withdrawn_from_University', display: 'Withdrawn from University' }
        ],
        'Special Grades': [
            { key: 'DFWU', display: 'DFWU' },
            { key: 'Drop', display: 'Drop' },
            { key: 'Honors', display: 'Honors' },
            { key: 'I_RD_RP', display: 'I RD RP' },
            { key: 'wo_I_RD_RP', display: 'wo I RD RP' }
        ],
        'Status': [
            { key: 'In_Progress', display: 'In Progress' },
            { key: 'Incomplete', display: 'Incomplete' },
            { key: 'No_Grade', display: 'No Grade' },
            { key: 'Not_Reported', display: 'Not Reported' },
            { key: 'Pending_Judicial_Action', display: 'Pending Judicial Action' },
            { key: 'Report_In_Progress', display: 'Report In Progress' },
            { key: 'Review', display: 'Review' },
            { key: 'Repeat', display: 'Repeat' },
            { key: 'Withheld', display: 'Withheld' }
        ]
    };

    // Create sections for each category
    Object.entries(categories).forEach(([categoryName, gradeTypes]) => {
        // Check if category has any values
        const hasValues = gradeTypes.some(grade => data[grade.key]);
        if (!hasValues) return;

        // Calculate category total
        const categoryTotal = gradeTypes.reduce((sum, grade) => {
            return sum + (data[grade.key] || 0);
        }, 0);

        // Create category container
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'grade-category';

        // Add category header with total
        const categoryHeader = document.createElement('div');
        categoryHeader.className = 'category-header';
        categoryHeader.innerHTML = `
            <h3>${categoryName}</h3>
            <span>Total: ${formatNumber(categoryTotal)}</span>
        `;
        categoryDiv.appendChild(categoryHeader);

        // Create grades grid
        const gradesGrid = document.createElement('div');
        gradesGrid.className = 'grades-grid';

        // Add individual grades
        gradeTypes.forEach(grade => {
            if (!data[grade.key]) return;
            const gradeItem = document.createElement('div');
            gradeItem.className = 'grade-item';
            gradeItem.innerHTML = `
                <span class="grade-name">${grade.display}</span>
                <span class="grade-value">${formatNumber(data[grade.key])}</span>
            `;
            gradesGrid.appendChild(gradeItem);
        });

        categoryDiv.appendChild(gradesGrid);
        gradesSection.appendChild(categoryDiv);
    });

    resultsContainer.appendChild(gradesSection);
}

let gradesChartInstance = null; // This will hold the chart instance

function calculateAverageGPA(data, useProvidedGPA = false) {
    if (useProvidedGPA) {
        return data['average_GPA']; // Use the provided GPA
    }

    var gradePoints = {
        'A_plus': 4.0, 'A': 4.0, 'A_minus': 3.7,
        'B_plus': 3.3, 'B': 3.0, 'B_minus': 2.7,
        'C_plus': 2.3, 'C': 2.0, 'C_minus': 1.7,
        'D_plus': 1.3, 'D': 1.0, 'D_minus': 0.7,
        'F': 0.0, 'DFWU': 0.5
    };

    let totalPoints = 0;
    let totalGrades = 0;

    Object.keys(gradePoints).forEach(grade => {
        var count = data[grade] || 0;
        totalPoints += count * gradePoints[grade];
        totalGrades += count;
    });

    return totalGrades > 0 ? totalPoints / totalGrades : 0;
}

function truncateToTwoDecimals(num) {
    return Math.trunc(num * 100) / 100;
}

function displayErrorMessage(inputElement, message) {
    clearSuggestions(inputElement);
    inputElement.style.position = 'relative';
    let suggestionBox = document.createElement('div');
    suggestionBox.className = 'autocomplete-suggestions error';
    suggestionBox.textContent = message;
    inputElement.after(suggestionBox);
}
