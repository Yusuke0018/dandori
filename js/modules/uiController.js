// UI Controller - Manages all UI interactions
export class UIController {
    constructor(taskManager) {
        this.taskManager = taskManager;
        this.currentView = 'timeline';
        this.currentDate = new Date();
        this.editingTaskId = null;
    }
    
    init() {
        this.renderCurrentView();
        this.updateDateHeader();
        this.populateProjects();
        this.initTimeLabels();
    }
    
    // Switch between views
    switchView(viewName) {
        // Update active tab
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === viewName);
        });
        
        // Update active view
        document.querySelectorAll('.view-container').forEach(view => {
            view.classList.toggle('active', view.id === `${viewName}-view`);
        });
        
        this.currentView = viewName;
        this.renderCurrentView();
    }
    
    // Render current view
    renderCurrentView() {
        switch (this.currentView) {
            case 'timeline':
                this.renderTimelineView();
                break;
            case 'board':
                this.renderBoardView();
                break;
            case 'projects':
                this.renderProjectsView();
                break;
        }
    }
    
    // Render timeline view
    renderTimelineView() {
        const tasks = this.taskManager.getTasksForDate(this.currentDate);
        
        // Separate day and timed tasks
        const dayTasks = tasks.filter(t => t.type === 'day');
        const timedTasks = tasks.filter(t => t.type === 'timed');
        
        // Render day tasks
        this.renderDayTasks(dayTasks);
        
        // Render timed tasks
        this.renderTimedTasks(timedTasks);
    }
    
    // Render day tasks (time unspecified)
    renderDayTasks(tasks) {
        const container = document.querySelector('.day-tasks-list');
        container.innerHTML = '';
        
        tasks.forEach(task => {
            const card = this.createTaskCard(task);
            container.appendChild(card);
        });
    }
    
    // Render timed tasks on timeline
    renderTimedTasks(tasks) {
        const grid = document.querySelector('.timeline-grid');
        
        // Remove existing task elements
        grid.querySelectorAll('.timeline-task').forEach(el => el.remove());
        
        // Sort tasks by start time
        tasks.sort((a, b) => a.startMin - b.startMin);
        
        // Check for overlaps and render
        const columns = this.calculateColumns(tasks);
        
        tasks.forEach((task, index) => {
            const element = this.createTimelineTask(task, columns[index]);
            grid.appendChild(element);
        });
    }
    
    // Calculate column positions for overlapping tasks
    calculateColumns(tasks) {
        const columns = new Array(tasks.length).fill(0);
        
        for (let i = 0; i < tasks.length; i++) {
            for (let j = i + 1; j < tasks.length; j++) {
                if (this.taskManager.hasTimeConflict(tasks[i], tasks[j])) {
                    columns[j] = 1;
                }
            }
        }
        
        return columns;
    }
    
    // Create task card element
    createTaskCard(task) {
        const card = document.createElement('div');
        card.className = 'task-card';
        card.dataset.taskId = task.id;
        
        // Add project tag if exists
        if (task.projectId && task.projectId !== 'default') {
            const project = this.taskManager.data.projects.find(p => p.id === task.projectId);
            if (project) {
                const tag = document.createElement('span');
                tag.className = 'project-tag';
                tag.dataset.color = project.color;
                tag.textContent = project.name;
                card.appendChild(tag);
            }
        }
        
        // Task title
        const title = document.createElement('div');
        title.className = 'task-title';
        title.textContent = task.title;
        card.appendChild(title);
        
        // Checkbox
        const checkbox = document.createElement('div');
        checkbox.className = 'task-checkbox';
        checkbox.addEventListener('click', (e) => {
            e.stopPropagation();
            this.handleTaskComplete(task.id);
        });
        card.appendChild(checkbox);
        
        // Click to edit
        card.addEventListener('click', () => {
            this.openTaskModal(task);
        });
        
        return card;
    }
    
    // Create timeline task element
    createTimelineTask(task, column) {
        const element = this.createTaskCard(task);
        element.classList.add('timeline-task');
        
        // Calculate position and height
        const top = (task.startMin / 1440) * 100;
        const height = ((task.endMin - task.startMin) / 1440) * 100;
        
        element.style.top = `${top}%`;
        element.style.height = `${height}%`;
        
        if (column === 1) {
            element.classList.add('overlapping');
        }
        
        // Add time info
        const timeInfo = document.createElement('div');
        timeInfo.className = 'task-time';
        timeInfo.textContent = `${this.taskManager.minutesToTime(task.startMin)} - ${this.taskManager.minutesToTime(task.endMin)}`;
        element.insertBefore(timeInfo, element.firstChild);
        
        return element;
    }
    
    // Render board view (someday tasks)
    renderBoardView() {
        const tasks = this.taskManager.getSomedayTasks();
        const container = document.querySelector('.board-grid');
        container.innerHTML = '';
        
        tasks.forEach(task => {
            const card = this.createTaskCard(task);
            container.appendChild(card);
        });
    }
    
    // Render projects view
    renderProjectsView() {
        const projects = this.taskManager.getProjectsWithProgress();
        const container = document.querySelector('.projects-list');
        container.innerHTML = '';
        
        projects.forEach(project => {
            const card = this.createProjectCard(project);
            container.appendChild(card);
        });
    }
    
    // Create project card
    createProjectCard(project) {
        const card = document.createElement('div');
        card.className = 'project-card';
        
        card.innerHTML = `
            <div class="project-header">
                <div class="project-info">
                    <div class="project-color-indicator" style="background-color: var(--color-project-${project.color})"></div>
                    <h3 class="project-name">${project.name}</h3>
                </div>
                ${project.deadline ? `<div class="project-deadline">期限: ${project.deadline}</div>` : ''}
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${project.progress}%"></div>
            </div>
            <div class="project-stats">
                <div class="stat-item">
                    <span>完了:</span>
                    <strong>${project.completedTasks}/${project.totalTasks}</strong>
                </div>
                <div class="stat-item">
                    <span>進捗:</span>
                    <strong>${Math.round(project.progress)}%</strong>
                </div>
            </div>
        `;
        
        return card;
    }
    
    // Handle task completion
    handleTaskComplete(taskId) {
        const card = document.querySelector(`[data-task-id="${taskId}"]`);
        if (!card) return;
        
        // Add completing animation
        card.classList.add('completing');
        
        setTimeout(() => {
            this.taskManager.completeTask(taskId);
            this.renderCurrentView();
        }, 300);
    }
    
    // Open task modal
    openTaskModal(task = null) {
        const modal = document.getElementById('task-modal');
        const form = document.getElementById('task-form');
        
        if (task) {
            // Edit mode
            this.editingTaskId = task.id;
            document.querySelector('.modal-title').textContent = 'タスクを編集';
            document.getElementById('task-title').value = task.title;
            this.selectTaskType(task.type);
            
            if (task.date) {
                document.getElementById('task-date').value = task.date;
            }
            
            if (task.type === 'timed') {
                document.getElementById('task-start').value = this.taskManager.minutesToTime(task.startMin);
                document.getElementById('task-end').value = this.taskManager.minutesToTime(task.endMin);
            }
            
            document.getElementById('task-project').value = task.projectId || '';
        } else {
            // Create mode
            this.editingTaskId = null;
            document.querySelector('.modal-title').textContent = 'タスクを追加';
            form.reset();
            this.selectTaskType('day');
            
            // Set default date to current date
            document.getElementById('task-date').value = this.taskManager.formatDate(this.currentDate);
        }
        
        modal.hidden = false;
    }
    
    // Close task modal
    closeTaskModal() {
        document.getElementById('task-modal').hidden = true;
        document.getElementById('task-form').reset();
        this.editingTaskId = null;
    }
    
    // Select task type in modal
    selectTaskType(type) {
        // Update active button
        document.querySelectorAll('.type-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === type);
        });
        
        // Show/hide form fields
        const dateGroup = document.querySelector('.date-group');
        const timeGroup = document.querySelector('.time-group');
        
        switch (type) {
            case 'someday':
                dateGroup.hidden = true;
                timeGroup.hidden = true;
                break;
            case 'day':
                dateGroup.hidden = false;
                timeGroup.hidden = true;
                break;
            case 'timed':
                dateGroup.hidden = false;
                timeGroup.hidden = false;
                break;
        }
    }
    
    // Navigate dates
    navigateDate(direction) {
        this.currentDate.setDate(this.currentDate.getDate() + direction);
        this.updateDateHeader();
        this.renderTimelineView();
    }
    
    // Update date header
    updateDateHeader() {
        const dateElement = document.querySelector('.current-date');
        const options = { month: 'numeric', day: 'numeric', weekday: 'short' };
        dateElement.textContent = this.currentDate.toLocaleDateString('ja-JP', options);
    }
    
    // Populate projects dropdown
    populateProjects() {
        const select = document.getElementById('task-project');
        select.innerHTML = '<option value="">なし</option>';
        
        this.taskManager.data.projects.forEach(project => {
            const option = document.createElement('option');
            option.value = project.id;
            option.textContent = project.name;
            select.appendChild(option);
        });
    }
    
    // Initialize time labels
    initTimeLabels() {
        const container = document.querySelector('.time-labels');
        container.innerHTML = '';
        
        for (let hour = 0; hour < 24; hour++) {
            const label = document.createElement('div');
            label.className = 'time-label';
            label.textContent = `${hour}:00`;
            container.appendChild(label);
        }
    }
    
    // Add task to current view
    addTaskToView(task) {
        this.renderCurrentView();
    }
}