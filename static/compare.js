document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const model1Id = urlParams.get('model1');
    const model2Id = urlParams.get('model2');

    if (model1Id && model2Id) {
        fetchComparisonData(model1Id, model2Id);
    } else {
        displayError('Please select two models to compare.');
    }
});

async function fetchComparisonData(model1Id, model2Id) {
    try {
        const response = await fetch(`http://localhost:8000/api/compare?model_ids=${model1Id}&model_ids=${model2Id}`);
        if (!response.ok) {
            throw new Error('Failed to fetch comparison data');
        }
        const models = await response.json();
        displayComparison(models);
    } catch (error) {
        console.error('Error fetching comparison data:', error);
        displayError('Failed to load comparison data. Please try again.');
    }
}

function displayComparison(models) {
    const container = document.getElementById('comparisonContainer');
    container.innerHTML = '';

    models.forEach((model, index) => {
        const column = document.createElement('div');
        column.className = 'col-md-6';
        column.innerHTML = `
            <h3>${model.name}</h3>
            <p><strong>Developer:</strong> ${model.developer}</p>
            <p><strong>Release Date:</strong> ${model.release_date}</p>
            <p><strong>Parameter Count:</strong> ${model.parameter_count.toLocaleString()}</p>
            <p><strong>Architecture Type:</strong> ${model.architecture_type}</p>
            <p><strong>Training Data Size:</strong> ${model.training_data_size}</p>
            <p><strong>Description:</strong> ${model.description || 'N/A'}</p>
            <p><strong>Use Cases:</strong> ${model.use_cases || 'N/A'}</p>
        `;
        container.appendChild(column);
    });
}

function displayError(message) {
    const container = document.getElementById('comparisonContainer');
    container.innerHTML = `<div class="alert alert-danger" role="alert">${message}</div>`;
}
