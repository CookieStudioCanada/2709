let clients = [];
let files = [];
let lineup = [];
let editClientIndex = null;
let editFileIndex = null;
let newFileSubTasks = [];
let chatHistory = [];

// Add these helper functions at the top of your file
function parseDate(dateString) {
    if (!dateString) return null;
    // Parse the date string and return date object with time set to midnight
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
}

function formatDateForInput(date) {
    if (!date) return '';
    // Format date as YYYY-MM-DD for input fields
    return date.toISOString().split('T')[0];
}

function formatDateForDisplay(date) {
    if (!date) return 'N/A';
    // Format date for display (e.g., "Dec 2, 2023")
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: 'America/Montreal'
    });
}

function getCurrentMontrealDate() {
    // Get current date in Montreal timezone
    return new Date(new Date().toLocaleString('en-US', {
        timeZone: 'America/Montreal'
    }));
}

function isOverdue(dueDate) {
    if (!dueDate) return false;
    const today = getCurrentMontrealDate();
    today.setHours(0, 0, 0, 0);
    const dueDateObj = parseDate(dueDate);
    return dueDateObj < today;
}

// Save data to localStorage
function saveData() {
    localStorage.setItem('clients', JSON.stringify(clients));
    localStorage.setItem('files', JSON.stringify(files));
    localStorage.setItem('lineup', JSON.stringify(lineup));
}

// Load data from localStorage
function loadData() {
    const storedClients = localStorage.getItem('clients');
    const storedFiles = localStorage.getItem('files');
    const storedLineup = localStorage.getItem('lineup');
    if (storedClients) clients = JSON.parse(storedClients);
    if (storedFiles) files = JSON.parse(storedFiles);
    if (storedLineup) lineup = JSON.parse(storedLineup);
}

// Initialize Bootstrap components
function initializeBootstrap() {
    // Initialize all tooltips
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    if (tooltipTriggerList.length > 0) {
        [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
    }

    // Initialize all popovers
    const popoverTriggerList = document.querySelectorAll('[data-bs-toggle="popover"]');
    if (popoverTriggerList.length > 0) {
        [...popoverTriggerList].map(popoverTriggerEl => new bootstrap.Popover(popoverTriggerEl));
    }

    // Initialize all modals
    const modalElements = document.querySelectorAll('.modal');
    modalElements.forEach(modalElement => {
        new bootstrap.Modal(modalElement, {
            keyboard: true,
            backdrop: true
        });
    });
}

// Update window.onload
window.onload = function() {
    loadData();
    renderClientList();
    renderFileList();
    renderLineup();
    populateClientDropdowns();
    initializeDashboard();
    initializeBootstrap();
    initializeChat();

    // Safely add event listener for CSV import
    const importCSVInput = document.getElementById('importCSV');
    if (importCSVInput) {
        importCSVInput.addEventListener('change', handleFileSelect);
    }
};

// Add event listeners after DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Account modal functionality
    const accountLinks = document.querySelectorAll('[data-bs-toggle="modal"][data-bs-target="#accountModal"]');
    accountLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            openAccountModal();
        });
    });
});

// Function to render the client list
function renderClientList(filter = '') {
    const clientList = document.getElementById('clientList');
    clientList.innerHTML = '';

    const filteredClients = clients.filter(client =>
        client.name.toLowerCase().includes(filter.toLowerCase())
    );

    if (filteredClients.length === 0) {
        const noResults = document.createElement('div');
        noResults.className = 'text-center p-3';
        noResults.innerHTML = `
            <p class="text-muted">No clients found</p>
            ${filter ? `
                <button class="btn btn-outline-secondary btn-sm" onclick="resetClientSearch()">
                    <i class="bi bi-arrow-counterclockwise"></i> Reset Search
                </button>
            ` : ''}
        `;
        clientList.appendChild(noResults);
        return;
    }

    filteredClients.forEach((client, index) => {
        const li = document.createElement('li');
        li.className = 'list-group-item';
        li.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div class="client-list-item" onclick="viewClientDetails(${index})" style="cursor: pointer;">
                    <i class="bi bi-person-fill" style="font-size: 1.5rem; margin-right: 10px;"></i>
                    <h5>${client.name}</h5>
                </div>
                <div>
                    <button class="btn btn-sm btn-secondary btn-edit-client" onclick="editClient(${index})">Edit</button>
                </div>
            </div>
        `;
        clientList.appendChild(li);
    });
}

// View Client Details
function viewClientDetails(index) {
    const client = clients[index];
    document.getElementById('clientDetailName').textContent = client.name;
    document.getElementById('clientDetailEmail').textContent = client.email || '';
    const clientFilesList = document.getElementById('clientFilesList');
    clientFilesList.innerHTML = '';

    const clientFiles = files.filter(file => file.clientName === client.name);

    if (clientFiles.length === 0) {
        const li = document.createElement('li');
        li.className = 'list-group-item';
        li.textContent = 'No files associated with this client.';
        clientFilesList.appendChild(li);
    } else {
        clientFiles.forEach(file => {
            const li = document.createElement('li');
            li.className = 'list-group-item';
            li.setAttribute('onclick', `openFileFromClient('${file.id}')`);
            li.style.cursor = 'pointer';
            const priorityClass = file.priority === 'High' ? 'priority-high' :
                                  file.priority === 'Medium' ? 'priority-medium' : 'priority-low';
            li.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h5>${file.name} <i class="bi bi-flag-fill ${priorityClass}"></i></h5>
                        <p class="mb-0 due-date">Due: ${file.dueDate || 'N/A'}</p>
                        <p class="mb-0">Status: ${file.status}</p>
                    </div>
                </div>
            `;
            clientFilesList.appendChild(li);
        });
    }

    $('#clientDetailsModal').modal('show');
}

function openFileFromClient(fileId) {
    const fileIndex = files.findIndex(file => file.id === parseInt(fileId));
    if (fileIndex !== -1) {
        $('#clientDetailsModal').modal('hide');
        viewFileDetails(fileIndex);
    }
}

// Function to render the file list
function renderFileList() {
    const fileList = document.getElementById('fileList');
    if (!fileList) return;

    // Get filter values
    const searchTerm = document.getElementById('searchFile').value.toLowerCase();
    const clientFilter = document.getElementById('filterClient').value;
    const statusFilter = document.getElementById('filterStatus').value;
    const priorityFilter = document.getElementById('filterPriority').value;
    const dueDateFilter = document.getElementById('filterDueDate').value;

    // Check if any filters are active
    const hasActiveFilters = searchTerm || clientFilter || statusFilter || priorityFilter || dueDateFilter;

    // Filter files
    let filteredFiles = files.filter(file => {
        const matchesSearch = file.name.toLowerCase().includes(searchTerm) ||
                            file.clientName.toLowerCase().includes(searchTerm);
        const matchesClient = !clientFilter || file.clientName === clientFilter;
        const matchesStatus = !statusFilter || file.status === statusFilter;
        const matchesPriority = !priorityFilter || file.priority === priorityFilter;
        
        let matchesDate = true;
        if (dueDateFilter) {
            const today = getCurrentMontrealDate();
            today.setHours(0, 0, 0, 0);
            const dueDate = parseDate(file.dueDate);
            
            switch(dueDateFilter) {
                case 'today':
                    matchesDate = dueDate && dueDate.getTime() === today.getTime();
                    break;
                case 'tomorrow':
                    const tomorrow = new Date(today);
                    tomorrow.setDate(today.getDate() + 1);
                    matchesDate = dueDate && dueDate.getTime() === tomorrow.getTime();
                    break;
                case 'thisWeek':
                    const endOfWeek = new Date(today);
                    endOfWeek.setDate(today.getDate() + (5 - today.getDay()));
                    matchesDate = dueDate && dueDate >= today && dueDate <= endOfWeek;
                    break;
                case 'overdue':
                    matchesDate = isOverdue(file.dueDate);
                    break;
                case 'noDueDate':
                    matchesDate = !file.dueDate;
                    break;
            }
        }

        return matchesSearch && matchesClient && matchesStatus && matchesPriority && matchesDate;
    });

    // Clear existing list
    fileList.innerHTML = '';

    if (filteredFiles.length === 0) {
        fileList.innerHTML = `
            <div class="text-center p-3">
                <p class="text-muted">No files found</p>
                ${hasActiveFilters ? `
                    <button class="btn btn-outline-secondary btn-sm" onclick="resetFileFilters()">
                        <i class="bi bi-arrow-counterclockwise"></i> Reset Filters
                    </button>
                ` : ''}
            </div>
        `;
        return;
    }

    // Sort files by priority (High > Medium > Normal) and then by due date
    filteredFiles.sort((a, b) => {
        const priorityOrder = { 'High': 0, 'Medium': 1, 'Normal': 2 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        // If priorities are equal, sort by due date
        const dateA = parseDate(a.dueDate) || new Date(9999, 11, 31); // Put items with no due date at the end
        const dateB = parseDate(b.dueDate) || new Date(9999, 11, 31);
        return dateA - dateB;
    });

    // Render filtered and sorted files
    filteredFiles.forEach((file, index) => {
        const priorityFlag = file.priority === 'High' ? '<i class="bi bi-flag-fill priority-high"></i>' :
                           file.priority === 'Medium' ? '<i class="bi bi-flag-fill priority-medium"></i>' : '';
        const li = document.createElement('li');
        li.className = 'list-group-item';
        li.style.cursor = 'pointer';
        li.onclick = () => viewFileDetails(index);
        li.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div class="flex-grow-1">
                    <h5>${file.name} ${priorityFlag}</h5>
                    <p class="mb-0">Client: ${file.clientName} | Due: ${formatDateForDisplay(parseDate(file.dueDate))}</p>
                </div>
            </div>
        `;
        fileList.appendChild(li);
    });
}

// Function to render the lineup
function renderLineup() {
    const lineupList = document.getElementById('lineupList');
    lineupList.innerHTML = '';

    if (lineup.length === 0) {
        lineupList.innerHTML = `
            <div class="text-center">
                <p class="text-muted">No files in lineup</p>
            </div>
        `;
        return;
    }

    lineup.forEach((fileId) => {
        const file = files.find(f => f.id === fileId);
        if (file) {
            const li = document.createElement('li');
            li.className = 'list-group-item';
            li.setAttribute('data-id', file.id);
            const priorityFlag = file.priority === 'High' ? '<i class="bi bi-flag-fill priority-high"></i>' :
                               file.priority === 'Medium' ? '<i class="bi bi-flag-fill priority-medium"></i>' : '';
            li.innerHTML = `
                <div class="d-flex align-items-center">
                    <span class="drag-handle">↕</span>
                    <div class="flex-grow-1 mx-2" onclick="viewFileDetails(${files.indexOf(file)})" style="cursor: pointer;">
                        <h5>${file.name} ${priorityFlag}</h5>
                        <p class="mb-0">Client: ${file.clientName} | Due: ${formatDateForDisplay(parseDate(file.dueDate))}</p>
                    </div>
                    <button class="btn btn-danger" onclick="removeFromLineup(${file.id})">×</button>
                </div>
            `;
            lineupList.appendChild(li);
        }
    });

    $("#lineupList").sortable({
        handle: '.drag-handle',
        placeholder: 'ui-sortable-placeholder',
        update: function(event, ui) {
            lineup = $("#lineupList li").map(function() {
                return parseInt($(this).attr('data-id'));
            }).get();
            saveData();
        }
    }).disableSelection();
}

// Populate Client Dropdowns in Forms and Filters
function populateClientDropdowns() {
    const clientSelects = document.querySelectorAll('#fileClient, #detailFileClient, #filterClient');
    clientSelects.forEach(select => {
        const currentValue = select.value;
        if (select.id === 'filterClient') {
            select.innerHTML = '<option value="">All Clients</option>';
        } else {
            select.innerHTML = '<option value="">Select Client</option>';
        }
        clients.forEach(client => {
            const option = document.createElement('option');
            option.value = client.name;
            option.textContent = client.name;
            select.appendChild(option);
        });
        select.value = currentValue;
    });
}

// Add Client
document.getElementById('clientForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const name = document.getElementById('clientName').value;
    const email = document.getElementById('clientEmail').value;
    clients.push({ name, email });
    renderClientList();
    populateClientDropdowns();
    saveData();
    this.reset();
    $('#addClientModal').modal('hide');
});

// Edit Client
function editClient(index) {
    editClientIndex = index;
    const client = clients[index];
    document.getElementById('editClientName').value = client.name;
    document.getElementById('editClientEmail').value = client.email;
    $('#editClientModal').modal('show');
}

// Update Client
document.getElementById('editClientForm').addEventListener('submit', function(e) {
    e.preventDefault();
    clients[editClientIndex] = {
        name: document.getElementById('editClientName').value,
        email: document.getElementById('editClientEmail').value
    };
    $('#editClientModal').modal('hide');
    renderClientList();
    populateClientDropdowns();
    saveData();
});

// Delete Client
document.getElementById('deleteClientBtn').addEventListener('click', function() {
    if (confirm('Are you sure you want to delete this client?')) {
        const clientName = clients[editClientIndex].name;
        // Remove associated files
        files = files.filter(file => file.clientName !== clientName);
        lineup = lineup.filter(fileId => {
            const file = files.find(f => f.id === fileId);
            return file !== undefined;
        });
        // Remove client
        clients.splice(editClientIndex, 1);
        $('#editClientModal').modal('hide');
        renderClientList();
        populateClientDropdowns();
        renderFileList();
        renderLineup();
        saveData();
    }
});

// Search Clients
document.getElementById('searchClient').addEventListener('input', function() {
    renderClientList(this.value);
});

// Add File
document.getElementById('fileForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const newFile = {
        id: Date.now(), // Unique ID for the file
        clientName: document.getElementById('fileClient').value,
        name: document.getElementById('fileName').value,
        status: document.getElementById('fileStatus').value,
        notes: document.getElementById('fileNotes').value,
        priority: document.getElementById('filePriority').value,
        dueDate: document.getElementById('fileDueDate').value,
        subTasks: newFileSubTasks.slice() // Copy of the newFileSubTasks array
    };

    files.push(newFile);

    const isInLineup = document.getElementById('addAddToLineup').checked;
    if (isInLineup) {
        lineup.push(newFile.id);
    }

    renderFileList();
    renderLineup();
    saveData();

    this.reset();
    newFileSubTasks = []; // Reset the subtasks array
    renderNewFileSubTasks(); // Clear the subtasks list

    $('#addFileModal').modal('hide');
});

// Reset the Add File Modal when it is opened
$('#addFileModal').on('shown.bs.modal', function() {
    newFileSubTasks = [];
    renderNewFileSubTasks();
    document.getElementById('fileForm').reset();
});

// Function to render subtasks in the Add File Modal
function renderNewFileSubTasks() {
    const subTaskList = document.getElementById('addSubTaskList');
    subTaskList.innerHTML = '';
    newFileSubTasks.forEach((task, index) => {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center';
        li.innerHTML = `
            <div>
                <input type="checkbox" ${task.completed ? 'checked' : ''} onclick="toggleNewFileSubTask(${index})">
                <span class="${task.completed ? 'task-completed' : ''}">${task.description}</span>
            </div>
            <button class="btn btn-sm btn-danger" onclick="deleteNewFileSubTask(${index})">Delete</button>
        `;
        subTaskList.appendChild(li);
    });
}

// Add Sub-Task in Add File Modal
document.getElementById('addAddSubTaskBtn').addEventListener('click', function() {
    const taskDescription = document.getElementById('addNewSubTask').value;
    if (taskDescription) {
        newFileSubTasks.push({ description: taskDescription, completed: false });
        renderNewFileSubTasks();
        document.getElementById('addNewSubTask').value = '';
    }
});

// Toggle Sub-Task Completion in Add File Modal
function toggleNewFileSubTask(taskIndex) {
    newFileSubTasks[taskIndex].completed = !newFileSubTasks[taskIndex].completed;
    renderNewFileSubTasks();
}

// Delete Sub-Task in Add File Modal
function deleteNewFileSubTask(taskIndex) {
    newFileSubTasks.splice(taskIndex, 1);
    renderNewFileSubTasks();
}

// View and Edit File Details
function viewFileDetails(index) {
    editFileIndex = index;
    const file = files[index];
    document.getElementById('detailFileName').value = file.name;
    document.getElementById('detailFileClient').value = file.clientName;
    document.getElementById('detailFileStatus').value = file.status;
    document.getElementById('detailFileNotes').value = file.notes;
    document.getElementById('detailFilePriority').value = file.priority;
    document.getElementById('detailFileDueDate').value = file.dueDate;
    document.getElementById('detailAddToLineup').checked = lineup.includes(file.id);
    renderSubTasks(file.subTasks);
    $('#fileDetailsModal').modal('show');
}

// Render Sub-Tasks
function renderSubTasks(subTasks) {
    const subTaskList = document.getElementById('subTaskList');
    subTaskList.innerHTML = '';
    subTasks.forEach((task, index) => {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center';
        li.innerHTML = `
            <div>
                <input type="checkbox" ${task.completed ? 'checked' : ''} onclick="toggleSubTask(${index})">
                <span class="${task.completed ? 'task-completed' : ''}">${task.description}</span>
            </div>
            <button class="btn btn-sm btn-danger" onclick="deleteSubTask(${index})">Delete</button>
        `;
        subTaskList.appendChild(li);
    });
}

// Add Sub-Task
document.getElementById('addSubTaskBtn').addEventListener('click', function() {
    const taskDescription = document.getElementById('newSubTask').value;
    if (taskDescription) {
        files[editFileIndex].subTasks.push({ description: taskDescription, completed: false });
        renderSubTasks(files[editFileIndex].subTasks);
        saveData();
        document.getElementById('newSubTask').value = '';
    }
});

// Toggle Sub-Task Completion
function toggleSubTask(taskIndex) {
    const subTasks = files[editFileIndex].subTasks;
    subTasks[taskIndex].completed = !subTasks[taskIndex].completed;
    renderSubTasks(subTasks);
    saveData();
}

// Delete Sub-Task
function deleteSubTask(taskIndex) {
    const subTasks = files[editFileIndex].subTasks;
    subTasks.splice(taskIndex, 1);
    renderSubTasks(subTasks);
    saveData();
}

// Update File Details
document.getElementById('fileDetailsForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const updatedFile = files[editFileIndex];
    updatedFile.name = document.getElementById('detailFileName').value;
    updatedFile.clientName = document.getElementById('detailFileClient').value;
    updatedFile.status = document.getElementById('detailFileStatus').value;
    updatedFile.notes = document.getElementById('detailFileNotes').value;
    updatedFile.priority = document.getElementById('detailFilePriority').value;
    updatedFile.dueDate = document.getElementById('detailFileDueDate').value;

    const isInLineup = document.getElementById('detailAddToLineup').checked;
    if (isInLineup && !lineup.includes(updatedFile.id)) {
        lineup.push(updatedFile.id);
    } else if (!isInLineup && lineup.includes(updatedFile.id)) {
        lineup = lineup.filter(id => id !== updatedFile.id);
    }

    $('#fileDetailsModal').modal('hide');
    renderFileList();
    renderLineup();
    saveData();
});

// Delete File
document.getElementById('deleteFileBtn').addEventListener('click', function() {
    if (confirm('Are you sure you want to delete this file?')) {
        const fileId = files[editFileIndex].id;
        files.splice(editFileIndex, 1);
        lineup = lineup.filter(id => id !== fileId);
        $('#fileDetailsModal').modal('hide');
        renderFileList();
        renderLineup();
        saveData();
    }
});

// Remove File from Lineup
function removeFromLineup(fileId) {
    lineup = lineup.filter(id => id !== fileId);
    renderLineup();
    renderFileList();
    saveData();
}

// Toggle Lineup Inclusion from File List
function toggleLineup(fileId) {
    const checkbox = document.getElementById(`lineupCheckbox${fileId}`);
    if (checkbox.checked) {
        if (!lineup.includes(fileId)) {
            lineup.push(fileId);
        }
    } else {
        lineup = lineup.filter(id => id !== fileId);
    }
    renderLineup();
    saveData();
}

// Search and Filter Files
document.getElementById('searchFile').addEventListener('input', renderFileList);
document.getElementById('filterClient').addEventListener('change', renderFileList);
document.getElementById('filterStatus').addEventListener('change', renderFileList);
document.getElementById('filterPriority').addEventListener('change', renderFileList);
document.getElementById('filterDueDate').addEventListener('change', renderFileList);

// Function to trigger the file input
function triggerImport() {
    document.getElementById('importCSV').click();
}

// Function to handle file selection
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        importFromCSV(file);
    }
}

// Function to import data from CSV
function importFromCSV(file) {
    const reader = new FileReader();

    reader.onload = function(e) {
        const content = e.target.result;
        const lines = content.split('\n');
        
        // Clear existing data
        clients = [];
        files = [];
        lineup = [];

        // Process each line
        for (let i = 1; i < lines.length; i++) { // Start from 1 to skip header
            const line = lines[i].trim();
            if (line) {
                const values = line.split(',');
                if (values[0] === 'Client') {
                    clients.push({
                        name: values[2],
                        email: values[3]
                    });
                } else if (values[0] === 'File') {
                    const subTasks = values[8] ? values[8].split('|').map(task => {
                        const [description, completed] = task.split(':');
                        return { description, completed: completed === 'true' };
                    }) : [];
                    
                    const file = {
                        id: parseInt(values[1]),
                        clientName: values[2],
                        name: values[3],
                        status: values[4],
                        notes: values[5],
                        priority: values[6],
                        dueDate: values[7],
                        subTasks: subTasks
                    };
                    files.push(file);

                    // Add to lineup if there's a lineup order
                    const lineupOrder = parseInt(values[9]);
                    if (!isNaN(lineupOrder) && lineupOrder > 0) {
                        lineup[lineupOrder - 1] = file.id;
                    }
                }
            }
        }

        // Remove any undefined entries from lineup
        lineup = lineup.filter(id => id !== undefined);

        // Update the UI and save data
        renderClientList();
        renderFileList();
        renderLineup();
        populateClientDropdowns();
        saveData();

        alert('Data imported successfully!');
    };

    reader.readAsText(file);
}

// Function to export data
function exportToCSV() {
    $('#exportModal').modal('show');
}

// Handle export form submission
document.getElementById('exportForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const fileName = document.getElementById('exportFileName').value || 'task_manager_data';
    let csvContent = "data:text/csv;charset=utf-8,";

    // Headers
    csvContent += "Type,ID,Client Name,File Name,Status,Notes,Priority,Due Date,Sub Tasks,Lineup Order\n";

    // Client data
    clients.forEach(client => {
        csvContent += `Client,,${client.name},${client.email},,,,,,\n`;
    });

    // File data
    files.forEach(file => {
        const subTasks = file.subTasks.map(task => `${task.description}:${task.completed}`).join('|');
        const lineupOrder = lineup.indexOf(file.id) + 1;
        csvContent += `File,${file.id},${file.clientName},${file.name},${file.status},${file.notes},${file.priority},${file.dueDate},${subTasks},${lineupOrder > 0 ? lineupOrder : ''}\n`;
    });

    // Create a download link and trigger the download
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${fileName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    $('#exportModal').modal('hide');
});

// Move the import input element to the body
document.body.insertAdjacentHTML('beforeend', '<input type="file" id="importCSV" accept=".csv" style="display: none;">');

// Handle tab clicks
$('.navbar-nav .nav-link').on('click', function (e) {
    e.preventDefault();
    const targetTab = $(this).attr('href');

    // Remove active class from all nav items and add to clicked item
    $('.navbar-nav .nav-item').removeClass('active');
    $(this).parent().addClass('active');

    // Hide all tab panes and show the target pane
    $('.tab-pane').removeClass('show active');
    $(targetTab).addClass('show active');

    // Update aria-selected attributes
    $('.navbar-nav .nav-link').attr('aria-selected', 'false');
    $(this).attr('aria-selected', 'true');
});

// Ensure the first tab is active on page load
$('.navbar-nav .nav-item:first-child .nav-link').click();

// Add this function to your existing script.js
async function generateWithGemini(prompt) {
    console.log('Starting generateWithGemini with prompt:', prompt);
    try {
        const appData = {
            clients: clients,
            files: files,
            lineup: lineup,
            chatHistory: chatHistory.slice(-6)
        };
        console.log('Prepared appData:', appData);

        console.log('Sending request to:', 'http://localhost:3000/api/generate');
        const response = await fetch('http://localhost:3000/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ 
                prompt: prompt,
                appData: appData
            })
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers));
        
        if (!response.ok) {
            console.error('Server Response Error:', response.status, response.statusText);
            const errorText = await response.text();
            console.error('Error response body:', errorText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Parsed response data:', data);
        
        if (data.error) {
            console.error('API Error:', data.error);
            throw new Error(data.error);
        }
        
        return data.generated_text;
    } catch (error) {
        console.error('Detailed error in generateWithGemini:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        return `Error: ${error.message}`;
    }
}

// Example usage:
// const response = await generateWithGemini('Write a description for this task');

// Chat Interface Functions
function initializeChat() {
    const chatToggle = document.getElementById('chatToggle');
    const chatBox = document.getElementById('chatBox');
    const closeChatBtn = document.getElementById('closeChatBtn');
    const chatInput = document.getElementById('chatInput');
    const sendMessageBtn = document.getElementById('sendMessageBtn');
    const chatMessages = document.getElementById('chatMessages');

    // Toggle chat box
    chatToggle.addEventListener('click', () => {
        chatBox.classList.toggle('hidden');
        if (!chatBox.classList.contains('hidden')) {
            chatInput.focus();
        }
    });

    // Close chat box
    closeChatBtn.addEventListener('click', () => {
        chatBox.classList.add('hidden');
    });

    // Send message
    async function sendMessage() {
        const message = chatInput.value.trim();
        if (!message) return;

        console.log('Sending message:', message);
        
        try {
            // Add user message to chat and history
            addMessageToChat('user', message);
            chatHistory.push({ role: 'user', content: message });
            chatInput.value = '';

            console.log('Getting AI response...');
            const response = await generateWithGemini(message);
            console.log('AI response received:', response);
            
            // Add AI response to chat and history
            addMessageToChat('ai', response);
            chatHistory.push({ role: 'assistant', content: response });
        } catch (error) {
            console.error('Error in sendMessage:', error);
            addMessageToChat('ai', 'Sorry, there was an error processing your message.');
        }
    }

    // Add message to chat
    function addMessageToChat(sender, message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        if (sender === 'ai') {
            // Use the formatting function for AI messages
            messageDiv.innerHTML = formatAIMessage(message);
        } else {
            messageDiv.textContent = message;
        }
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Event listeners
    sendMessageBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    // Update chat header with AI name and icon
    document.querySelector('.chat-header h5').innerHTML = `
        <i class="bi bi-robot"></i> FileFlow AI
    `;

    // Create dropdown for suggested prompts
    const suggestedPromptsHTML = `
        <div class="suggested-prompts-dropdown">
            <button class="btn btn-outline-light dropdown-toggle w-100" 
                    type="button" 
                    data-bs-toggle="dropdown" 
                    aria-expanded="false">
                <i class="bi bi-lightbulb"></i> Suggested Questions
            </button>
            <ul class="dropdown-menu w-100">
                <li><h6 class="dropdown-header">Common Questions</h6></li>
                <li><button class="dropdown-item" type="button">📋 What's my highest priority task?</button></li>
                <li><button class="dropdown-item" type="button">⏰ Show me overdue files</button></li>
                <li><button class="dropdown-item" type="button">👥 Summarize my client workload</button></li>
                <li><div class="dropdown-divider"></div></li>
                <li><h6 class="dropdown-header">Task Management</h6></li>
                <li><button class="dropdown-item" type="button">📊 What's next in the lineup?</button></li>
                <li><button class="dropdown-item" type="button">⚠️ Any files needing attention?</button></li>
                <li><button class="dropdown-item" type="button">🎯 Help me prioritize my work</button></li>
            </ul>
        </div>
    `;

    const suggestedPromptsDiv = document.createElement('div');
    suggestedPromptsDiv.className = 'suggested-prompts';
    suggestedPromptsDiv.innerHTML = suggestedPromptsHTML;
    
    // Add click handlers for dropdown items
    suggestedPromptsDiv.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', () => {
            // Remove emoji and send the text
            const promptText = item.textContent.replace(/^[^\w\s]+ /, '');
            chatInput.value = promptText;
            sendMessage();
        });
    });
    
    chatBox.insertBefore(suggestedPromptsDiv, chatMessages);
}

function formatAIMessage(message) {
    let formattedMessage = '<div class="ai-response">';
    
    // Split into sections by double asterisks
    const sections = message.split(/\*\*(.*?)\*\*/g);
    
    sections.forEach((section, index) => {
        if (index % 2 === 1) {
            // Headers (bold sections)
            formattedMessage += `<h3 class="section-header">${section}</h3>`;
        } else {
            // Process content
            let content = section
                // Remove bullet points and format as regular text
                .replace(/^[•-] (.*?)(?=\n|$)/gm, '$1')
                // Handle line breaks
                .replace(/\n\n+/g, '<br><br>')
                .replace(/\n/g, '<br>');
            
            formattedMessage += content;
        }
    });
    
    formattedMessage += '</div>';
    return formattedMessage;
}

// Add this to your existing script.js
$("#menu-toggle").click(function(e) {
    e.preventDefault();
    $("#wrapper").toggleClass("toggled");
    
    // Store the toggle state in localStorage
    const isToggled = $("#wrapper").hasClass("toggled");
    localStorage.setItem("sidebarToggled", isToggled);
});

// Add this new function for account settings
function saveAccountSettings() {
    const name = document.getElementById('accountName').value;
    const email = document.getElementById('accountEmail').value;
    const password = document.getElementById('accountPassword').value;
    
    // Here you would typically send this to your backend
    console.log('Saving account settings:', { name, email, password });
    
    // For now, just close the modal
    $('#accountModal').modal('hide');
}

// Add these new reset functions
function resetClientSearch() {
    document.getElementById('searchClient').value = '';
    renderClientList();
}

function resetFileFilters() {
    document.getElementById('searchFile').value = '';
    document.getElementById('filterClient').value = '';
    document.getElementById('filterStatus').value = '';
    document.getElementById('filterPriority').value = '';
    document.getElementById('filterDueDate').value = '';
    renderFileList();
}

function initializeDashboard() {
    renderDashboardLineup();
    renderDashboardCalendar();
    renderDueThisWeek();
}

function renderDashboardLineup() {
    const container = document.getElementById('dashboardLineup');
    if (!container) return;

    let html = `
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h5 class="mb-0 fw-bold">Current Lineup</h5>
            <a href="#lineup" class="btn btn-sm btn-outline-secondary" onclick="showLineupTab()">View All</a>
        </div>
    `;

    if (lineup.length === 0) {
        html += '<p class="text-muted">No files in lineup</p>';
    } else {
        lineup.slice(0, 5).forEach((fileId) => {
            const file = files.find(f => f.id === fileId);
            if (file) {
                const priorityFlag = file.priority === 'High' ? '<i class="bi bi-flag-fill priority-high"></i>' :
                                   file.priority === 'Medium' ? '<i class="bi bi-flag-fill priority-medium"></i>' : '';
                html += `
                    <div class="due-item">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="mb-0">${file.name} ${priorityFlag}</h6>
                                <small class="text-muted">Due: ${file.dueDate || 'N/A'}</small>
                            </div>
                        </div>
                    </div>
                `;
            }
        });

        if (lineup.length > 5) {
            html += `<p class="text-center mt-2 mb-0"><small class="text-muted">+${lineup.length - 5} more items</small></p>`;
        }
    }

    container.innerHTML = html;
}

function renderDashboardCalendar() {
    const container = document.getElementById('dashboardCalendar');
    if (!container) return;

    const events = files.filter(f => f.dueDate).map(f => ({
        date: parseDate(f.dueDate),
        title: f.name,
        priority: f.priority,
        client: f.clientName
    }));

    const today = getCurrentMontrealDate();
    today.setHours(0, 0, 0, 0);
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());

    let calendarHTML = `
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h5 class="mb-0 fw-bold">Weekly Calendar</h5>
        </div>
        <table class="table table-bordered">
            <tbody>
                <tr>
                    ${[...Array(7)].map((_, day) => {
                        const currentDate = new Date(weekStart);
                        currentDate.setDate(weekStart.getDate() + day);
                        currentDate.setHours(0, 0, 0, 0);
                        const isToday = currentDate.getTime() === today.getTime();
                        
                        const dayEvents = events.filter(e => 
                            e.date.getTime() === currentDate.getTime()
                        );

                        return `
                            <td class="${isToday ? 'bg-light' : ''}" style="height: 200px; position: relative;">
                                <div class="calendar-day-header">
                                    <div class="d-flex justify-content-between align-items-center p-2">
                                        <span>${currentDate.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                                        <span>${currentDate.getDate()}</span>
                                    </div>
                                </div>
                                <div class="calendar-events">
                                    ${dayEvents.map(e => `
                                        <div class="calendar-event ${e.priority.toLowerCase()}-priority" 
                                             data-bs-toggle="tooltip" 
                                             data-bs-placement="top" 
                                             title="${e.title} - ${e.client}">
                                            <small>${e.title}</small>
                                        </div>
                                    `).join('')}
                                </div>
                            </td>
                        `;
                    }).join('')}
                </tr>
            </tbody>
        </table>
    `;

    container.innerHTML = calendarHTML;

    // Initialize tooltips
    const tooltips = container.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltips.forEach(tooltip => new bootstrap.Tooltip(tooltip));
}

function renderDueThisWeek() {
    const container = document.getElementById('dueThisWeek');
    if (!container) return;

    let html = `
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h5 class="mb-0 fw-bold">Due This Week</h5>
        </div>
    `;

    const today = getCurrentMontrealDate();
    today.setHours(0, 0, 0, 0);
    
    const nextFriday = new Date(today);
    nextFriday.setDate(today.getDate() + ((5 - today.getDay() + 7) % 7));
    nextFriday.setHours(23, 59, 59, 999);

    const relevantFiles = files.filter(f => {
        if (!f.dueDate) return false;
        const dueDate = parseDate(f.dueDate);
        return dueDate <= nextFriday;
    }).sort((a, b) => parseDate(a.dueDate) - parseDate(b.dueDate));

    if (relevantFiles.length === 0) {
        html += '<p class="text-muted">No files due this week</p>';
    } else {
        html += relevantFiles.map(file => {
            const isFileOverdue = isOverdue(file.dueDate);
            
            return `
                <div class="due-item">
                    <div class="d-flex justify-content-between align-items-center">
                        <h6 class="mb-1">${file.name}</h6>
                        <span class="badge ${isFileOverdue ? 'bg-danger' : 'bg-secondary'} ms-2">
                            ${isFileOverdue ? 'Overdue' : 'Due'}
                        </span>
                    </div>
                    <small class="${isFileOverdue ? 'text-danger' : 'text-muted'}">
                        Due: ${formatDateForDisplay(parseDate(file.dueDate))}<br>
                        Client: ${file.clientName}
                    </small>
                </div>
            `;
        }).join('');
    }

    container.innerHTML = html;
}

// Add this helper function for consistent date handling
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('default', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

// Update the account link in the sidebar to use onclick
function openAccountModal() {
    const modalElement = document.getElementById('accountModal');
    if (!modalElement) return;
    
    const modal = new bootstrap.Modal(modalElement, {
        backdrop: true,
        keyboard: true
    });
    modal.show();
}

// Function to switch to lineup tab
function showLineupTab() {
    const lineupTab = document.querySelector('a[href="#lineup"]');
    if (lineupTab) {
        lineupTab.click();
    }
}

// Update the date filter dropdown in the files tab
function updateDateFilterDropdown() {
    const filterDueDate = document.getElementById('filterDueDate');
    filterDueDate.innerHTML = `
        <option value="">All Dates</option>
        <option value="overdue">Overdue</option>
        <option value="today">Due Today</option>
        <option value="tomorrow">Due Tomorrow</option>
        <option value="thisWeek">Due This Week</option>
        <option value="noDueDate">No Due Date</option>
    `;
}

// Update priority options in modals
function updatePriorityDropdowns() {
    const priorityDropdowns = ['filePriority', 'detailFilePriority'].forEach(dropdownId => {
        const dropdown = document.getElementById(dropdownId);
        if (dropdown) {
            dropdown.innerHTML = `
                <option value="Normal">Normal</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
            `;
        }
    });

    // Special handling for filter dropdown
    const filterPriority = document.getElementById('filterPriority');
    if (filterPriority) {
        filterPriority.innerHTML = `
            <option value="">All Priorities</option>
            <option value="Normal">Normal</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
        `;
    }
}

// Update client list view to use three dots
function renderClientList() {
    const clientList = document.getElementById('clientList');
    if (!clientList) return;

    clientList.innerHTML = '';
    const searchTerm = document.getElementById('searchClient').value.toLowerCase();

    const filteredClients = clients.filter(client =>
        client.name.toLowerCase().includes(searchTerm) ||
        client.email.toLowerCase().includes(searchTerm)
    );

    filteredClients.forEach((client, index) => {
        const li = document.createElement('li');
        li.className = 'list-group-item';
        li.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div class="flex-grow-1" onclick="viewClientDetails(${index})" style="cursor: pointer;">
                    <h5>${client.name}</h5>
                    <p class="mb-0">${client.email || ''}</p>
                </div>
                <button class="btn btn-dark btn-sm rounded-2 p-1" onclick="editClient(${index})">
                    <i class="bi bi-three-dots text-white" style="margin-right: 0px; padding: 5px;"></i>
                </button>
            </div>
        `;
        clientList.appendChild(li);
    });

    if (filteredClients.length === 0) {
        clientList.innerHTML = `
            <div class="text-center p-3">
                <p class="text-muted">No clients found</p>
                ${searchTerm ? `
                    <button class="btn btn-outline-secondary btn-sm" onclick="resetClientSearch()">
                        <i class="bi bi-arrow-counterclockwise"></i> Reset Search
                    </button>
                ` : ''}
            </div>
        `;
    }
}

// Make sure to call these functions when initializing the app
document.addEventListener('DOMContentLoaded', function() {
    updateDateFilterDropdown();
    updatePriorityDropdowns();
    // ... other initialization code ...
});