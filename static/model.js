document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const modelId = urlParams.get('id');
    if (modelId) {
        fetchModelDetails(modelId);
        fetchModelPerformance(modelId);
    } else {
        console.error('No model ID provided');
    }
});

async function fetchModelDetails(modelId) {
    try {
        const response = await fetch(`http://localhost:8000/api/models/${modelId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch model details');
        }
        const model = await response.json();
        displayModelDetails(model);
    } catch (error) {
        console.error('Error fetching model details:', error);
        displayError('Failed to load model details. Please try again.');
    }
}

async function fetchModelPerformance(modelId) {
    try {
        const response = await fetch(`http://localhost:8000/api/models/${modelId}/performance`);
        if (!response.ok) {
            throw new Error('Failed to fetch model performance');
        }
        const performance = await response.json();
        if (performance.length === 0) {
            displayError('No performance metrics available for this model.');
        } else {
            displayPerformanceMetrics(performance);
        }
    } catch (error) {
        console.error('Error fetching model performance:', error);
        displayError('Failed to load performance metrics. Please try again.');
    }
}

function displayModelDetails(model) {
    const detailsContainer = document.getElementById('modelDetails');
    detailsContainer.innerHTML = `
        <h2>${model.name}</h2>
        <p><strong>Developer:</strong> ${model.developer}</p>
        <p><strong>Release Date:</strong> ${model.release_date}</p>
        <p><strong>Parameter Count:</strong> ${model.parameter_count.toLocaleString()}</p>
        <p><strong>Architecture Type:</strong> ${model.architecture_type}</p>
        <p><strong>Training Data Size:</strong> ${model.training_data_size}</p>
        <p><strong>Description:</strong> ${model.description || 'N/A'}</p>
        <p><strong>Use Cases:</strong> ${model.use_cases || 'N/A'}</p>
    `;
}

function displayPerformanceMetrics(performance) {
    const tableBody = document.querySelector('#performanceTable tbody');
    tableBody.innerHTML = '';

    performance.forEach(metric => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${metric.benchmark_name}</td>
            <td>${metric.score}</td>
            <td>${metric.dataset_details || 'N/A'}</td>
        `;
        tableBody.appendChild(row);
    });
}

function displayError(message) {
    const detailsContainer = document.getElementById('modelDetails');
    detailsContainer.innerHTML = `<div class="alert alert-danger" role="alert">${message}</div>`;
    const tableBody = document.querySelector('#performanceTable tbody');
    tableBody.innerHTML = `<tr><td colspan="3" class="text-center text-danger">${message}</td></tr>`;
}
