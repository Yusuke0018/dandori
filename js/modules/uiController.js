// UI Controller - Manages all UI interactions
export class UIController {
    constructor(taskManager) {
        this.taskManager = taskManager;
        this.currentView = 'timeline';
        this.currentDate = new Date();
        this.editingTaskId = null;
        this.lastDeletedTask = null;
        this.undoTimer = null;
    }
    
    init() {
        this.renderCurrentView();
        this.updateDateHeader();
        this.updateProgressRing();
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
            case 'completed':
                this.renderCompletedView();
                break;
            case 'home':
            default:
                this.renderHomeView();
                break;
        }
    }

    // Render home view (today's tasks as cards)
    renderHomeView() {
        const container = document.querySelector('.home-list');
        if (!container) return;
        const tasks = this.taskManager.getTasksForDate(this.currentDate);
        container.innerHTML = '';
        // Sort: timed first by startMin, then day tasks
        const timed = tasks.filter(t => t.type === 'timed').sort((a,b)=>a.startMin-b.startMin);
        const days = tasks.filter(t => t.type === 'day');
        const ordered = [...timed, ...days];
        ordered.forEach(task => {
            const card = this.createTaskCard(task);
            // Add time subtitle for timed tasks
            if (task.type === 'timed') {
                const subtitle = document.createElement('div');
                subtitle.className = 'task-time-inline';
                subtitle.textContent = `${this.taskManager.minutesToTime(task.startMin)} - ${this.taskManager.minutesToTime(task.endMin)}`;
                card.insertBefore(subtitle, card.querySelector('.task-title'));
            }
            container.appendChild(card);
        });
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
        if (!tasks || tasks.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'empty-hint';
            empty.textContent = 'この日に予定はありません。右下の＋で追加できます。';
            container.appendChild(empty);
            return;
        }

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
        // Remove any empty label
        const prevEmpty = grid.querySelector('.empty-hint');
        if (prevEmpty) prevEmpty.remove();
        
        if (!tasks || tasks.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'empty-hint';
            empty.style.position = 'absolute';
            empty.style.top = '12px';
            empty.style.left = '12px';
            empty.textContent = '時間指定のタスクはありません。';
            grid.appendChild(empty);
            return;
        }

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
        if (task.done) card.classList.add('done');
        
        // Add project tag if exists
        if (task.projectId && task.projectId !== 'default') {
            const project = this.taskManager.data.projects.find(p => p.id === task.projectId);
            if (project) {
                const tag = document.createElement('span');
                tag.className = 'project-tag';
                tag.dataset.color = project.color;
                tag.textContent = project.name;
                card.appendChild(tag);
                card.classList.add(`proj-color-${project.color}`);
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
        if (task.done) checkbox.classList.add('checked');
        checkbox.addEventListener('click', (e) => {
            e.stopPropagation();
            this.handleTaskComplete(task.id);
        });
        card.appendChild(checkbox);
        
        // Click to edit
        card.addEventListener('click', () => {
            this.openTaskModal(task);
        });

        // Swipe gestures (touch): left=edit, right=delete with undo
        this.attachSwipeHandlers(card, task);

        return card;
    }

    attachSwipeHandlers(card, task) {
        let startX = 0;
        let startY = 0;
        let moved = false;

        const resetTransform = () => {
            card.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
            card.style.transform = '';
            setTimeout(() => {
                card.style.transition = '';
            }, 220);
        };

        card.addEventListener('touchstart', (e) => {
            const t = e.touches[0];
            startX = t.clientX;
            startY = t.clientY;
            moved = false;
            card.style.transition = '';
        }, { passive: true });

        card.addEventListener('touchmove', (e) => {
            const t = e.touches[0];
            const dx = t.clientX - startX;
            const dy = t.clientY - startY;
            if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
                moved = true;
                e.preventDefault();
                card.style.transform = `translateX(${dx}px)`;
            }
        }, { passive: false });

        card.addEventListener('touchend', (e) => {
            if (!moved) {
                resetTransform();
                return;
            }
            const dx = (e.changedTouches[0].clientX - startX) || 0;
            if (dx > 80) {
                // Right swipe: delete with undo
                card.style.opacity = '0.3';
                this.deleteTaskWithUndo(task.id, () => {
                    // On actual delete finalize, fade out
                    card.style.opacity = '';
                    this.renderCurrentView();
                });
            } else if (dx < -80) {
                // Left swipe: edit
                this.openTaskModal(task);
            }
            resetTransform();
        });
    }

    deleteTaskWithUndo(taskId, onFinalize) {
        // Find and remove task immediately
        const idx = this.taskManager.data.tasks.findIndex(t => t.id === taskId);
        if (idx === -1) return;
        const removed = this.taskManager.data.tasks[idx];
        this.taskManager.data.tasks.splice(idx, 1);
        this.taskManager.save();
        this.renderCurrentView();
        this.updateProgressRing();

        // Store for undo
        this.clearUndoState();
        this.lastDeletedTask = removed;

        // Show toast
        this.showUndoToast(() => {
            if (!this.lastDeletedTask) return;
            // Restore
            this.taskManager.data.tasks.push(this.lastDeletedTask);
            this.taskManager.save();
            this.lastDeletedTask = null;
            this.renderCurrentView();
            this.updateProgressRing();
        });

        // Finalize after 3s if not undone
        this.undoTimer = setTimeout(() => {
            this.clearUndoState();
            if (typeof onFinalize === 'function') onFinalize();
        }, 3000);
    }

    clearUndoState() {
        if (this.undoTimer) {
            clearTimeout(this.undoTimer);
            this.undoTimer = null;
        }
        this.lastDeletedTask = null;
        const existing = document.getElementById('undo-toast');
        if (existing) existing.remove();
    }

    showUndoToast(onUndo) {
        const toast = document.createElement('div');
        toast.id = 'undo-toast';
        toast.style.position = 'fixed';
        toast.style.left = '50%';
        toast.style.bottom = '20px';
        toast.style.transform = 'translateX(-50%)';
        toast.style.background = 'var(--color-neutral-900, #333)';
        toast.style.color = '#fff';
        toast.style.padding = '12px 16px';
        toast.style.borderRadius = '12px';
        toast.style.boxShadow = '0 6px 18px rgba(0,0,0,0.15)';
        toast.style.zIndex = '1003';
        toast.style.display = 'flex';
        toast.style.gap = '12px';
        toast.style.alignItems = 'center';
        toast.style.fontSize = '14px';

        const label = document.createElement('span');
        label.textContent = '削除しました';
        const btn = document.createElement('button');
        btn.textContent = '元に戻す';
        btn.style.background = 'transparent';
        btn.style.color = 'var(--color-primary, #2b6cb0)';
        btn.style.border = 'none';
        btn.style.fontWeight = '700';
        btn.style.cursor = 'pointer';

        btn.addEventListener('click', () => {
            if (this.undoTimer) {
                clearTimeout(this.undoTimer);
                this.undoTimer = null;
            }
            toast.remove();
            onUndo?.();
        });

        toast.appendChild(label);
        toast.appendChild(btn);
        document.body.appendChild(toast);
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
        if (!tasks || tasks.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'empty-state-card';
            empty.textContent = '「いつかやる」タスクはありません。右下の＋で追加できます。';
            container.appendChild(empty);
            return;
        }

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
        if (!projects || projects.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'empty-state-card';
            empty.textContent = 'プロジェクトはまだありません。右下の＋で作成できます。';
            container.appendChild(empty);
            return;
        }

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

    // Render completed tasks view
    renderCompletedView() {
        const tasks = this.taskManager.getCompletedTasks();
        const container = document.querySelector('.completed-list');
        container.innerHTML = '';

        tasks.forEach(task => {
            const card = this.createTaskCard(task);
            card.classList.add('done');
            container.appendChild(card);
        });
    }
    
    // Handle task completion (toggle)
    handleTaskComplete(taskId) {
        const card = document.querySelector(`[data-task-id="${taskId}"]`);
        if (!card) return;

        // Determine current state
        const task = this.taskManager.data.tasks.find(t => t.id === taskId);
        const willComplete = task ? !task.done : true;

        // Add completing animation only when moving to done
        if (willComplete) {
            card.classList.add('completing');
            setTimeout(() => {
                this.taskManager.toggleTaskDone(taskId);
                this.renderCurrentView();
                this.updateProgressRing();
            }, 300);
        } else {
            // Revert immediately when unchecking
            this.taskManager.toggleTaskDone(taskId);
            this.renderCurrentView();
            this.updateProgressRing();
        }
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
        this.renderCurrentView();
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
        this.updateProgressRing();
    }
    
    // Update progress ring
    updateProgressRing() {
        const today = this.taskManager.formatDate(new Date());
        const todayTasks = this.taskManager.data.tasks.filter(t => 
            (t.type === 'day' || t.type === 'timed') && 
            t.date === today
        );
        
        const completedTasks = todayTasks.filter(t => t.done);
        const progress = todayTasks.length > 0 
            ? Math.round((completedTasks.length / todayTasks.length) * 100)
            : 0;
        
        // Update ring
        const ring = document.querySelector('.progress-ring-fill');
        const text = document.querySelector('.progress-text');
        
        if (ring && text) {
            const circumference = 2 * Math.PI * 15; // radius = 15
            const offset = circumference - (progress / 100) * circumference;
            
            ring.style.strokeDashoffset = offset;
            text.textContent = `${progress}%`;
        }
        
        // Update panel badges
        if (window.app?.panelController) {
            window.app.panelController.updateBadges();
        }
    }
}
