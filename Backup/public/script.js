let clients = [];
let files = [];
let lineup = [];
let editClientIndex = null;
let editFileIndex = null;
let newFileSubTasks = [];
let chatHistory = [];

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

// Function to render the client list
function renderClientList(filter = '') {
    const clientList = document.getElementById('clientList');
    clientList.innerHTML = '';

    const filteredClients = clients.filter(client =>
        client.name.toLowerCase().includes(filter.toLowerCase())
    );

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
                    <button class="btn btn-sm btn-secondary btn-edit-client mr-2" onclick="editClient(${index})">Edit</button>
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
    fileList.innerHTML = '';

    const searchFilter = document.getElementById('searchFile').value.toLowerCase();
    const clientFilter = document.getElementById('filterClient').value;
    const statusFilter = document.getElementById('filterStatus').value;
    const priorityFilter = document.getElementById('filterPriority').value;
    const dueDateFilter = document.getElementById('filterDueDate').value;

    let filteredFiles = files.filter(file =>
        file.name.toLowerCase().includes(searchFilter)
    );

    if (clientFilter) {
        filteredFiles = filteredFiles.filter(file => file.clientName === clientFilter);
    }
    if (statusFilter) {
        filteredFiles = filteredFiles.filter(file => file.status === statusFilter);
    }
    if (priorityFilter) {
        filteredFiles = filteredFiles.filter(file => file.priority === priorityFilter);
    }
    if (dueDateFilter) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        switch (dueDateFilter) {
            case 'incoming':
                // Include files with due dates >= today or without due dates
                const filesWithDueDates = filteredFiles.filter(file => file.dueDate && new Date(file.dueDate) >= today);
                const filesWithoutDueDates = filteredFiles.filter(file => !file.dueDate);
                filesWithDueDates.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
                filteredFiles = filesWithDueDates.concat(filesWithoutDueDates);
                break;
            case 'latest':
                filteredFiles.sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate));
                break;
            case 'overdue':
                filteredFiles = filteredFiles.filter(file => file.dueDate && new Date(file.dueDate) < today);
                break;
        }
    }

    filteredFiles.forEach((file, index) => {
        const li = document.createElement('li');
        li.className = 'list-group-item';
        const priorityClass = file.priority === 'High' ? 'priority-high' :
                              file.priority === 'Medium' ? 'priority-medium' : 'priority-low';
        const isInLineup = lineup.includes(file.id);
        li.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div onclick="viewFileDetails(${index})" style="cursor:pointer;">
                    <h5>${file.name} <i class="bi bi-flag-fill ${priorityClass}"></i></h5>
                    <p class="mb-0">Client: ${file.clientName}</p>
                    <p class="mb-0 due-date">Due: ${file.dueDate || 'N/A'}</p>
                </div>
                <div>
                    <input type="checkbox" class="form-check-input" id="lineupCheckbox${file.id}" onchange="toggleLineup(${file.id})" ${isInLineup ? 'checked' : ''}>
                    <label class="form-check-label" for="lineupCheckbox${file.id}">Lineup</label>
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

    lineup.forEach((fileId) => {
        const file = files.find(f => f.id === fileId);
        if (file) {
            const li = document.createElement('li');
            li.setAttribute('data-id', file.id);
            const priorityClass = file.priority === 'High' ? 'priority-high' :
                                  file.priority === 'Medium' ? 'priority-medium' : 'priority-low';
            li.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h5>${file.name} <i class="bi bi-flag-fill ${priorityClass}"></i></h5>
                        <p class="mb-0">Client: ${file.clientName}</p>
                        <p class="mb-0 due-date">Due: ${file.dueDate || 'N/A'}</p>
                    </div>
                    <button class="btn btn-sm btn-danger" onclick="removeFromLineup(${file.id})">Remove</button>
                </div>
            `;
            lineupList.appendChild(li);
        }
    });

    // Initialize drag-and-drop using jQuery UI
    $("#lineupList").sortable({
        update: function(event, ui) {
            const newOrder = [];
            $("#lineupList li").each(function() {
                newOrder.push(parseInt($(this).attr('data-id')));
            });
            lineup = newOrder;
            saveData();
        }
    });
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

        // We select nav link 'clients' after the data has been imported. 
        // Show this content with id= clients
        $('#clients').addClass('show active');


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

    // We select nav link 'clients' after the data has been imported. 
    // Show this content with id= clients
    $('#clients').addClass('show active');
    
});

// Modify the window.onload function to include the new event listener and styles
window.onload = function() {
    loadData();
    renderClientList();
    renderFileList();
    renderLineup();
    populateClientDropdowns();

    // Add event listener for CSV import
    document.getElementById('importCSV').addEventListener('change', handleFileSelect);

    // Add pointer cursor to navbar items
    const style = document.createElement('style');
    style.textContent = `
        .navbar-nav .nav-item:hover {
            cursor: pointer;
        }
    `;
    document.head.appendChild(style);

    // Close hamburger menu when a nav link is clicked
    document.querySelectorAll('.navbar-nav .nav-link').forEach(link => {
        link.addEventListener('click', () => {
            const navbarToggler = document.querySelector('.navbar-toggler');
            const navbarCollapse = document.querySelector('.navbar-collapse');
            if (navbarCollapse.classList.contains('show')) {
                navbarToggler.click();
            }
        });
    });

    initializeChat();
};

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