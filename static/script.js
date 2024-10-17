document.addEventListener('DOMContentLoaded', function() {
    fetchModels();
    document.getElementById('filterForm').addEventListener('submit', handleFilterSubmit);
});

let allModels = [];
let providers = new Set();
let licenses = new Set();
let parameterRange = [Infinity, -Infinity];
let contextRange = [Infinity, -Infinity];

async function fetchModels(filters = {}) {
    try {
        const queryParams = new URLSearchParams(filters).toString();
        const response = await fetch(`http://localhost:8000/api/models?${queryParams}`);
        if (!response.ok) {
            throw new Error('Failed to fetch models');
        }
        allModels = await response.json();
        if (allModels.length === 0) {
            displayError('No models found matching the criteria.');
        } else {
            populateTable(allModels);
            updateFilters();
        }
    } catch (error) {
        console.error('Error fetching models:', error);
        displayError('Failed to load models. Please try again.');
    }
}

function populateTable(models) {
    const tableBody = document.querySelector('#llmTable tbody');
    tableBody.innerHTML = '';

    models.forEach(model => {
        const row = document.createElement('tr');
        const logoHtml = model.provider_logo 
            ? `<img src="/static/logos/${model.provider_logo}" alt="${model.provider_name} logo" style="height: 20px; width: auto;">`
            : '';
        
        // Format parameter count
        const parameterCount = model.parameter_count !== null ? formatParameterCount(model.parameter_count) : '<span class="text-muted">N/A</span>';
        
        // Format context size
        const contextSize = model.context_size !== null ? model.context_size.toLocaleString() : '<span class="text-muted">N/A</span>';
        
        row.innerHTML = `
            <td><a href="model.html?id=${model.id}">${model.name}</a></td>
            <td>${logoHtml} <a href="${model.provider_website}" target="_blank">${model.provider_name}</a></td>
            <td>${model.release_date || '<span class="text-muted">N/A</span>'}</td>
            <td>${parameterCount}</td>
            <td>${contextSize}</td>
            <td>${model.license || '<span class="text-muted">N/A</span>'}</td>
        `;
        tableBody.appendChild(row);
    });

    addSortingListeners();
}

function formatParameterCount(count) {
    if (count >= 1000) {
        return Math.floor(count / 1000) + 'B';
    } else {
        return Math.floor(count) + 'M';
    }
}

function updateFilters() {
    updateProviderBadges();
    updateParameterSlider();
    updateContextSlider();
    updateLicenseFilter();
}

function updateProviderBadges() {
    const providerBadges = document.getElementById('providerBadges');
    providerBadges.innerHTML = '';
    
    allModels.forEach(model => providers.add(model.provider_name));
    
    providers.forEach(provider => {
        const badge = document.createElement('div');
        badge.className = 'badge border border-secondary text-secondary me-2 mb-2 provider-badge d-inline-flex align-items-center';
        
        // Find a model with this provider to get the logo
        const modelWithLogo = allModels.find(model => model.provider_name === provider);
        
        if (modelWithLogo && modelWithLogo.provider_logo) {
            const logo = document.createElement('img');
            logo.src = `/static/logos/${modelWithLogo.provider_logo}`;
            logo.alt = `${provider} logo`;
            logo.style.height = '20px';
            logo.style.width = 'auto';
            logo.style.marginRight = '5px';
            badge.appendChild(logo);
        }
        
        const providerName = document.createElement('span');
        providerName.textContent = provider;
        badge.appendChild(providerName);
        
        badge.addEventListener('click', () => toggleProviderFilter(provider, badge));
        providerBadges.appendChild(badge);
    });
}

function toggleProviderFilter(provider, badge) {
    badge.classList.toggle('bg-primary');
    badge.classList.toggle('bg-secondary');
    applyFilters();
}

function updateParameterSlider() {
    allModels.forEach(model => {
        parameterRange[0] = Math.min(parameterRange[0], model.parameter_count);
        parameterRange[1] = Math.max(parameterRange[1], model.parameter_count);
    });

    const parameterSlider = document.getElementById('parameterSlider');
    noUiSlider.create(parameterSlider, {
        start: parameterRange,
        connect: true,
        range: {
            'min': parameterRange[0],
            'max': parameterRange[1]
        },
        format: {
            to: value => Math.round(value),
            from: value => Number(value)
        }
    });

    const minParamValue = document.getElementById('minParamValue');
    const maxParamValue = document.getElementById('maxParamValue');

    parameterSlider.noUiSlider.on('update', (values, handle) => {
        minParamValue.textContent = values[0].toLocaleString();
        maxParamValue.textContent = values[1].toLocaleString();
    });

    parameterSlider.noUiSlider.on('change', applyFilters);
}

function updateContextSlider() {
    allModels.forEach(model => {
        contextRange[0] = Math.min(contextRange[0], model.context_size);
        contextRange[1] = Math.max(contextRange[1], model.context_size);
    });

    const contextSlider = document.getElementById('contextSlider');
    noUiSlider.create(contextSlider, {
        start: contextRange,
        connect: true,
        range: {
            'min': contextRange[0],
            'max': contextRange[1]
        },
        format: {
            to: value => Math.round(value),
            from: value => Number(value)
        }
    });

    const minContextValue = document.getElementById('minContextValue');
    const maxContextValue = document.getElementById('maxContextValue');

    contextSlider.noUiSlider.on('update', (values, handle) => {
        minContextValue.textContent = values[0].toLocaleString();
        maxContextValue.textContent = values[1].toLocaleString();
    });

    contextSlider.noUiSlider.on('change', applyFilters);
}

function updateLicenseFilter() {
    const licenseFilter = document.getElementById('licenseFilter');
    allModels.forEach(model => licenses.add(model.license));
    
    licenses.forEach(license => {
        const option = document.createElement('option');
        option.value = license;
        option.textContent = license;
        licenseFilter.appendChild(option);
    });

    licenseFilter.addEventListener('change', applyFilters);
}

function applyFilters() {
    const selectedProviders = Array.from(document.querySelectorAll('.provider-badge.bg-primary')).map(badge => badge.textContent);
    const [minParams, maxParams] = document.getElementById('parameterSlider').noUiSlider.get();
    const [minContext, maxContext] = document.getElementById('contextSlider').noUiSlider.get();
    const selectedLicense = document.getElementById('licenseFilter').value;

    const filteredModels = allModels.filter(model => 
        (selectedProviders.length === 0 || selectedProviders.includes(model.provider_name)) &&
        model.parameter_count >= minParams &&
        model.parameter_count <= maxParams &&
        model.context_size >= minContext &&
        model.context_size <= maxContext &&
        (selectedLicense === '' || model.license === selectedLicense)
    );

    populateTable(filteredModels);
}

function handleFilterSubmit(event) {
    event.preventDefault();
    applyFilters();
}

function addSortingListeners() {
    const headers = document.querySelectorAll('#llmTable th');
    headers.forEach((header, index) => {
        header.addEventListener('click', () => sortTable(index));
    });
}

function sortTable(columnIndex) {
    const table = document.getElementById('llmTable');
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));

    const sortedRows = rows.sort((a, b) => {
        const aColText = a.querySelector(`td:nth-child(${columnIndex + 1})`).textContent.trim();
        const bColText = b.querySelector(`td:nth-child(${columnIndex + 1})`).textContent.trim();

        if (aColText === 'N/A' && bColText === 'N/A') return 0;
        if (aColText === 'N/A') return 1;
        if (bColText === 'N/A') return -1;

        if (columnIndex === 3) { // Parameter Count column
            return parseParameterCount(aColText) - parseParameterCount(bColText);
        } else if (columnIndex === 4) { // Context Size column
            return parseInt(aColText.replace(/,/g, '')) - parseInt(bColText.replace(/,/g, ''));
        } else {
            return aColText.localeCompare(bColText);
        }
    });

    tbody.innerHTML = '';
    sortedRows.forEach(row => tbody.appendChild(row));
}

function parseParameterCount(text) {
    if (text === 'N/A') return -1; // Place N/A at the end when sorting
    if (text.endsWith('B')) {
        return parseFloat(text) * 1000;
    } else if (text.endsWith('M')) {
        return parseFloat(text);
    }
    return 0; // fallback
}

function displayError(message) {
    const tableBody = document.querySelector('#llmTable tbody');
    tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">${message}</td></tr>`;
}
