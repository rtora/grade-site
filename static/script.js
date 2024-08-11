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
    "Chico State": ["California State University, Chico", "California State University Chico","CSUC", "CSU Chico","Cal State Chico","Chico University","Chico State University"],
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
    "UCLA": ["University of California, Los Angeles", "Bruins", "Westwood","UC Los Angeles", "University of California Los Angeles"],
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
    //console.log(`Autocomplete triggered for: ${filterField}`);
    displaySearchingMessage(inputElement);
    standardizeUniversityValue(inputElement);

    // Get all filter values except the current one being typed into
    var filters = getFilters();

    //console.log('Current filters:', filters);

    // varruct the query string with all filters except the current one
    var queryString = Object.keys(filters)
        .filter(key => filters[key] && key !== filterField) // Keep only non-empty values and exclude current field
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(filters[key])}`)
        .join('&');
    //console.log('varructed query string:', queryString);

    // Prepare the current field and its value for the URL
    // console.log('Search Value:',inputElement.value, 'Type: ',inputElement.type);
    // console.log('Search Term:', inputElement.id);
    var currentFieldQuery = `autocomplete_field=${encodeURIComponent(filterField)}&search=${encodeURIComponent(inputElement.value.trim())}`;

    // Combine the current field query with the rest of the filters
    var combinedQueryString = queryString.length > 0 ? `${currentFieldQuery}&${queryString}` : currentFieldQuery;
    //console.log('Combined query string:', combinedQueryString);

    var fetchUrl = `https://collegegrades.org/autocomplete?${combinedQueryString}`;
    // var fetchUrl = `http://localhost:5000/autocomplete?${combinedQueryString}`;
    //console.log('Fetching URL:', fetchUrl);

    fetch(fetchUrl, {
        method: 'GET',
        credentials: 'include', // This line is crucial for including credentials
        headers: {
            'Content-Type': 'application/json',
            // Add any other necessary headers here
        }
    })  
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        //console.log(filterField);
        if (filterField === 'year'){
            data.sort((a,b)=>b - a)
        }
        //console.log('Data received from autocomplete:', data);
        displaySuggestions(data, inputElement, filterField);
    })
    .catch(error => {
        //console.error('Error:', error);
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
    var university = document.getElementById('university').value; // Capture the selected university
    //console.log('Fetching grades with filters:', filters);

    // varruct the query string with all filters
    var queryString = Object.keys(filters)
        .filter(key => filters[key]) // Keep only non-empty values
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(filters[key])}`)
        .join('&');
    //console.log('varructed query string for grades:', queryString);

    var fetchUrl = `https://collegegrades.org/grades?${queryString}`;
    //console.log('Fetching URL for grades:', fetchUrl);

    fetch(fetchUrl, {
        method: 'GET',
        credentials: 'include', // This line is crucial for including credentials
        headers: {
            'Content-Type': 'application/json',
            // Add any other necessary headers here
        }
    })        
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        //console.log('Data received from /api/grades:', data);
        displayGradesResults(data, university); // You need to define this
    })
    .catch(error => {
        //console.error('Error fetching grades:', error);
    });
}

function displayGradesResults(data) {
    // Example implementation: Displaying data as JSON in a preformatted text element
    var resultsContainer = document.getElementById('results');
    if (resultsContainer) {
        // Clear previous results
        resultsContainer.innerHTML = '';

        // Create a preformatted text element to display JSON data
        var pre = document.createElement('pre');
        pre.textContent = JSON.stringify(data, null, 2);

        resultsContainer.appendChild(pre);
    }
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

function displayGradesResults(data, university) {
    // Determine whether to use the provided GPA or calculate it
    //console.log('Received data:', data); // Check the entire data structure
    //console.log('University:', university); // Specifically check the university value
    var useProvidedGPA = university === 'UC San Diego';
    //console.log('Using provided GPA?', useProvidedGPA);
    var averageGPA = calculateAverageGPA(data, useProvidedGPA);

    // Attempt to find an existing GPA display element
    let gpaDisplay = document.getElementById('averageGPA');

    // If it doesn't exist, create it
    if (!gpaDisplay) {
        gpaDisplay = document.createElement('p');
        gpaDisplay.id = 'averageGPA';
        // Find the container where the chart is located or another appropriate location in your HTML structure
        var chartContainer = document.getElementById('gradesChart').parentNode;
        chartContainer.insertBefore(gpaDisplay, document.getElementById('gradesChart'));
    }

    // Update the GPA display text
    gpaDisplay.textContent = `Average GPA: ${averageGPA.toFixed(2)}`;

    var ctx = document.getElementById('gradesChart').getContext('2d');

    // Destroy existing chart instance if present
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

    // Create a new chart instance with adjusted labels and data
    gradesChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: gradeLabels,
            datasets: [{
                label: 'Grade Distribution',
                backgroundColor: '#E0E1DD',
                borderColor: '#E0E1DD',
                borderWidth: 1,
                data: gradeData,
                color: '#E0E1DD',
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#0D1B2A' // Change font color of y-axis labels
                    },
                    title: {
                        display: true,
                        text: 'Grade Count', // Optional: if you have a title
                        color: '#0D1B2A' // Change font color of the y-axis title
                    }
                },
                x: {
                    ticks: {
                        color: '#0D1B2A' // Change font color of x-axis labels
                    },
                    title: {
                        display: true,
                        text: 'Letter Grade', // Optional: if you have a title
                        color: '#0D1B2A' // Change font color of the x-axis title
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#0D1B2A' // Ensures legend labels match axis labels
                    }
                },
                title: {
                    display: true,
                    text: 'Number of Grades Given', // Optional: if you have a chart title
                    color: '#0D1B2A' // Change font color of the chart title
                }
            }
        }
    });
    
    // Displaying the JSON data underneath the chart
    var resultsContainer = document.getElementById('results');
    if (!resultsContainer) {
        //console.error('Results container not found');
        return;
    }

    // Clear previous results data
    resultsContainer.innerHTML = '';

    let relevantGrades = []; // Will hold the final list of relevant grades to include based on the university

    // Determine relevant grades based on university
    if (university === 'UC San Diego') {
        relevantGrades = ['A', 'B', 'C', 'D', 'F'];
    } else if (university === 'Cal State East Bay') {
        relevantGrades = ['A', 'B', 'C', 'DFWU'];
    } else {
        // For other universities, include all grades but filter out zero values later
        relevantGrades = ['A_plus', 'A', 'A_minus', 'B_plus', 'B', 'B_minus', 'C_plus', 'C', 'C_minus', 'D_plus', 'D', 'D_minus', 'F'];
    }

    // Adjust the data array based on relevant grades and data values
    gradeData = relevantGrades.map(grade => data[grade] || 0).filter(value => value > 0);

    // Adjust the labels array to match the filtered gradeData
    gradeLabels = gradeLabels.filter((_, index) => gradeData[index] > 0);

    // Your chart creation code remains unchanged...

    // Filter and prepare the data for display excluding 'average_gpa'
    var filteredData = Object.entries(data)
        .filter(([key, value]) => {
            // Ensure the key is in the list of relevant grades and the value is greater than 0, excluding 'average_gpa'
            return key !== 'average_GPA' && (relevantGrades.includes(key) || value > 0);
        })
        .reduce((acc, [key, value]) => {
            // Convert internal grade identifiers to a more friendly format
            var simplifiedKey = key.replace(/_plus/g, '+').replace(/_minus/g, '-').replace(/_/g, ' ');
            if(typeof value == 'number'){
                acc[simplifiedKey] = truncateToTwoDecimals(value);
            }else{
                acc[simplifiedKey] = value;
            }
            return acc;
    }, {});

    // Define the desired order of grades
    var gradeOrder = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F'];

    // Convert the gradeOrder to a mapping for easier comparison
    var gradeOrderMap = gradeOrder.reduce((acc, grade, index) => {
        acc[grade] = index;
        return acc;
    }, {});

    // Sort the keys of filteredData based on the custom grade order
    var sortedDataKeys = Object.keys(filteredData).sort((a, b) => {
        // Use the gradeOrderMap to get the order index
        var orderA = gradeOrderMap[a] !== undefined ? gradeOrderMap[a] : gradeOrder.length;
        var orderB = gradeOrderMap[b] !== undefined ? gradeOrderMap[b] : gradeOrder.length;
        return orderA - orderB;
    });

    // Use the sorted keys to varruct the sortedData object
    var sortedData = sortedDataKeys.reduce((acc, key) => {
        acc[key] = filteredData[key];
        return acc;
    }, {});

    // Add a title for the section
    var titleElement = document.createElement('h2');
    titleElement.textContent = 'Grades Given';
    resultsContainer.appendChild(titleElement);

    // varruct a string with the desired format: key: value\n (without curly braces, quotes on keys, and commas)
    let formattedString = Object.entries(sortedData).map(([key, value]) => {
        return `${key}: ${value}`;
    }).join('\n');

    // Create and append the formatted text to the resultsContainer
    var pre = document.createElement('pre');
    pre.textContent = formattedString;

    // Append the JSON data underneath the title
    resultsContainer.appendChild(pre);
}
