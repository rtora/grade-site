function debounce(func, wait) {
    let timeout;

    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };

        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}


document.addEventListener('DOMContentLoaded', () => {
    const filterIds = ['instructor', 'year', 'catalog_number', 'subject', 'term', 'university', 'title'];

    filterIds.forEach((filterId) => {
        const inputElement = document.getElementById(filterId); // This line was missing in the provided code snippet.
        if (inputElement) {
            const debouncedAutocomplete = debounce(() => autocomplete(inputElement, filterId), 500);
            inputElement.addEventListener('input', debouncedAutocomplete); // Use debounced function here.
        }
    });
    const submitButton = document.getElementById('submit');
    if (submitButton) {
        submitButton.addEventListener('click', fetchGrades);
    }
});

function autocomplete(inputElement, filterField) {
    console.log(`Autocomplete triggered for: ${filterField}`);

    // Get all filter values except the current one being typed into
    const filters = getFilters();
    console.log('Current filters:', filters);

    // Construct the query string with all filters except the current one
    const queryString = Object.keys(filters)
        .filter(key => filters[key] && key !== filterField) // Keep only non-empty values and exclude current field
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(filters[key])}`)
        .join('&');
    console.log('Constructed query string:', queryString);

    // Prepare the current field and its value for the URL
    const currentFieldQuery = `autocomplete_field=${encodeURIComponent(filterField)}&search=${encodeURIComponent(inputElement.value.trim())}`;

    // Combine the current field query with the rest of the filters
    const combinedQueryString = queryString.length > 0 ? `${currentFieldQuery}&${queryString}` : currentFieldQuery;
    console.log('Combined query string:', combinedQueryString);

    const fetchUrl = `http://127.0.0.1:5000/autocomplete?${combinedQueryString}`;
    console.log('Fetching URL:', fetchUrl);

    fetch(fetchUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log('Data received from autocomplete:', data);
            displaySuggestions(data, inputElement, filterField);
        })
        .catch(error => {
            console.error('Error:', error);
        });
}


// Utility function to get all filter values, with added console logging
function getFilters() {
    const filterIds = ['instructor', 'year', 'catalog_number', 'subject', 'term', 'university', 'title'];
    let filters = {};
    filterIds.forEach(filterId => {
        const inputElement = document.getElementById(filterId);
        if (inputElement && inputElement.value.trim()) {
            filters[filterId] = inputElement.value.trim();
            console.log(`Filter [${filterId}] has value:`, inputElement.value.trim());
        }
    });
    return filters;
}

// displaySuggestions and clearSuggestions remain unchanged from the previous explanation.

function displaySuggestions(suggestions, inputElement, filterField) {
    clearSuggestions(inputElement);

    // Create a container for the suggestions if it doesn't already exist
    let suggestionBox = document.createElement('div');
    suggestionBox.className = 'autocomplete-suggestions';
    inputElement.parentNode.appendChild(suggestionBox);

    suggestions.forEach((item) => {
        let suggestionItem = document.createElement('div');
        suggestionItem.className = 'suggestion-item';
        suggestionItem.textContent = item;
        suggestionItem.addEventListener('click', () => {
            inputElement.value = item;
            clearSuggestions(inputElement);
        });
        suggestionBox.appendChild(suggestionItem);
    });
}

function clearSuggestions(inputElement) {
    let existingSuggestions = inputElement.parentNode.querySelector('.autocomplete-suggestions');
    if (existingSuggestions) {
        existingSuggestions.remove();
    }
}

function fetchGrades() {
    const filters = getFilters();
    const university = document.getElementById('university').value; // Capture the selected university
    console.log('Fetching grades with filters:', filters);

    // Construct the query string with all filters
    const queryString = Object.keys(filters)
        .filter(key => filters[key]) // Keep only non-empty values
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(filters[key])}`)
        .join('&');
    console.log('Constructed query string for grades:', queryString);

    const fetchUrl = `http://127.0.0.1:5000/api/grades?${queryString}`;
    console.log('Fetching URL for grades:', fetchUrl);

    fetch(fetchUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log('Data received from /api/grades:', data);
            displayGradesResults(data, university); // You need to define this
        })
        .catch(error => {
            console.error('Error fetching grades:', error);
        });
}

function displayGradesResults(data) {
    // Example implementation: Displaying data as JSON in a preformatted text element
    const resultsContainer = document.getElementById('results');
    if (resultsContainer) {
        // Clear previous results
        resultsContainer.innerHTML = '';

        // Create a preformatted text element to display JSON data
        const pre = document.createElement('pre');
        pre.textContent = JSON.stringify(data, null, 2);

        resultsContainer.appendChild(pre);
    }
}

let gradesChartInstance = null; // This will hold the chart instance

function calculateAverageGPA(data, useProvidedGPA = false) {
    if (useProvidedGPA) {
        return data['average_GPA']; // Use the provided GPA
    }
    
    const gradePoints = {
        'A_plus': 4.0, 'A': 4.0, 'A_minus': 3.7,
        'B_plus': 3.3, 'B': 3.0, 'B_minus': 2.7,
        'C_plus': 2.3, 'C': 2.0, 'C_minus': 1.7,
        'D_plus': 1.3, 'D': 1.0, 'D_minus': 0.7,
        'F': 0.0, 'DFWU': 0.5
    };
    
    let totalPoints = 0;
    let totalGrades = 0;
    
    Object.keys(gradePoints).forEach(grade => {
        const count = data[grade] || 0;
        totalPoints += count * gradePoints[grade];
        totalGrades += count;
    });
    
    return totalGrades > 0 ? totalPoints / totalGrades : 0;
}
  

function displayGradesResults(data, university) {
    // Determine whether to use the provided GPA or calculate it
    console.log('Received data:', data); // Check the entire data structure
    console.log('University:', university); // Specifically check the university value
    const useProvidedGPA = university === 'UC San Diego';
    console.log('Using provided GPA?', useProvidedGPA);
    const averageGPA = calculateAverageGPA(data, useProvidedGPA);

    // Attempt to find an existing GPA display element
    let gpaDisplay = document.getElementById('averageGPA');

    // If it doesn't exist, create it
    if (!gpaDisplay) {
        gpaDisplay = document.createElement('p');
        gpaDisplay.id = 'averageGPA';
        // Find the container where the chart is located or another appropriate location in your HTML structure
        const chartContainer = document.getElementById('gradesChart').parentNode;
        chartContainer.insertBefore(gpaDisplay, document.getElementById('gradesChart'));
    }

    // Update the GPA display text
    gpaDisplay.textContent = `Average GPA: ${averageGPA.toFixed(2)}`;

    const ctx = document.getElementById('gradesChart').getContext('2d');

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
            data['A'] + data['A_plus'] + data['A_minus'], 
            data['B'] + data['B_plus'] + data['B_minus'],
            data['C'] + data['C_plus'] + data['C_minus'],
            data['DFWU']
        ];
    } else if (university === 'UC San Diego') {
        gradeLabels = ['A', 'B', 'C', 'D', 'F'];
        gradeData = [
            data['A'] + data['A_plus'] + data['A_minus'], 
            data['B'] + data['B_plus'] + data['B_minus'],
            data['C'] + data['C_plus'] + data['C_minus'],
            data['D'] + data['D_plus'] + data['D_minus'],
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
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                borderColor: 'rgba(255, 99, 132, 1)',
                borderWidth: 1,
                data: gradeData,
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
    
    // Displaying the JSON data underneath the chart
    const resultsContainer = document.getElementById('results');
    if (!resultsContainer) {
        console.error('Results container not found');
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
    const filteredData = Object.entries(data)
        .filter(([key, value]) => {
            // Ensure the key is in the list of relevant grades and the value is greater than 0, excluding 'average_gpa'
            return relevantGrades.includes(key) || value > 0 && key !== 'average_gpa';
        })
        .reduce((acc, [key, value]) => {
            // Convert internal grade identifiers to a more friendly format
            const simplifiedKey = key.replace('_plus', '+').replace('_minus', '-');
            acc[simplifiedKey] = value;
            return acc;
    }, {});

    // Add a title for the section
    const titleElement = document.createElement('h2');
    titleElement.textContent = 'Grades Given';
    resultsContainer.appendChild(titleElement);

    // Convert the filtered data object to a nicely formatted JSON string
    const jsonData = JSON.stringify(filteredData, null, 2);

    // Create a preformatted text element to display the JSON data
    const pre = document.createElement('pre');
    pre.textContent = jsonData.replace(/[{}]/g, '');

    // Append the JSON data underneath the title
    resultsContainer.appendChild(pre);
}