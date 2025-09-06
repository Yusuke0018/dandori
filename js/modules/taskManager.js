// Task Manager - Core business logic
export class TaskManager {
    constructor(storage) {
        this.storage = storage;
        this.data = null;
        this.currentDate = new Date();
    }
    
    // Load data from storage
    async loadData() {
        this.data = this.storage.load();
        // Normalize legacy "default" project -> optional project
        this.normalizeProjects();
        this.processCarryOver();
        return this.data;
    }
    
    // Save current state
    save() {
        return this.storage.save(this.data);
    }
    
    // Create a new task
    createTask(taskData) {
        const task = {
            id: this.generateId(),
            title: taskData.title,
            type: taskData.type, // 'someday', 'day', 'timed'
            date: taskData.date || null,
            projectId: taskData.projectId || '',
            done: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Add time information for timed tasks
        if (taskData.type === 'timed') {
            task.startMin = this.timeToMinutes(taskData.startTime);
            // 終了時間は任意
            if (taskData.endTime) {
                task.endMin = this.timeToMinutes(taskData.endTime);
            }
        }
        
        this.data.tasks.push(task);
        this.save();
        
        return task;
    }
    
    // Update existing task
    updateTask(taskId, updates) {
        const taskIndex = this.data.tasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) return null;
        
        const task = {
            ...this.data.tasks[taskIndex],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        
        this.data.tasks[taskIndex] = task;
        this.save();
        
        return task;
    }
    
    // Delete task
    deleteTask(taskId) {
        const taskIndex = this.data.tasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) return false;
        
        this.data.tasks.splice(taskIndex, 1);
        this.save();
        
        return true;
    }
    
    // Mark task as done
    completeTask(taskId) {
        return this.updateTask(taskId, { done: true });
    }

    // Toggle task done state
    toggleTaskDone(taskId) {
        const idx = this.data.tasks.findIndex(t => t.id === taskId);
        if (idx === -1) return null;
        const current = this.data.tasks[idx];
        return this.updateTask(taskId, { done: !current.done });
    }
    
    // Get tasks by type
    getTasksByType(type) {
        return this.data.tasks.filter(t => t.type === type && !t.done);
    }
    
    // Get tasks for a specific date
    getTasksForDate(date) {
        const dateStr = this.formatDate(date);
        return this.data.tasks.filter(t => 
            (t.type === 'day' || t.type === 'timed') && 
            t.date === dateStr
        );
    }
    
    // Get someday tasks
    getSomedayTasks() {
        return this.data.tasks.filter(t => t.type === 'someday');
    }

    // Get completed tasks (recent first)
    getCompletedTasks(limit = 100) {
        return this.data.tasks
            .filter(t => t.done)
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
            .slice(0, limit);
    }
    
    // Create a new project
    createProject(projectData) {
        const project = {
            id: this.generateId(),
            name: projectData.name,
            color: projectData.color || 'blue',
            deadline: projectData.deadline || null,
            createdAt: new Date().toISOString()
        };
        
        this.data.projects.push(project);
        this.save();
        
        return project;
    }

    // Update project
    updateProject(projectId, updates) {
        const idx = this.data.projects.findIndex(p => p.id === projectId);
        if (idx === -1) return null;
        const project = { ...this.data.projects[idx], ...updates };
        this.data.projects[idx] = project;
        this.save();
        return project;
    }

    // Delete project and unassign tasks (no project)
    deleteProject(projectId) {
        const idx = this.data.projects.findIndex(p => p.id === projectId);
        if (idx === -1) return false;
        this.data.projects.splice(idx, 1);
        // Unassign tasks
        this.data.tasks = this.data.tasks.map(t => (
            t.projectId === projectId ? { ...t, projectId: '' } : t
        ));
        this.save();
        return true;
    }

    // Normalize legacy default project and references
    normalizeProjects() {
        if (!this.data || !Array.isArray(this.data.projects)) return;
        const hadDefault = this.data.projects.some(p => p.id === 'default');
        if (hadDefault) {
            // Remove the legacy default project
            this.data.projects = this.data.projects.filter(p => p.id !== 'default');
            // Unassign tasks pointing to default
            this.data.tasks = this.data.tasks.map(t => t.projectId === 'default' ? { ...t, projectId: '' } : t);
            this.save();
        }
    }
    
    // Get all projects with progress
    getProjectsWithProgress() {
        return this.data.projects.map(project => {
            const tasks = this.data.tasks.filter(t => t.projectId === project.id);
            const completedTasks = tasks.filter(t => t.done);
            
            return {
                ...project,
                totalTasks: tasks.length,
                completedTasks: completedTasks.length,
                progress: tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0
            };
        });
    }
    
    // Process carry-over for incomplete timed tasks
    processCarryOver() {
        if (!this.data.settings.carryOver) return;
        
        const today = this.formatDate(new Date());
        const yesterday = this.formatDate(new Date(Date.now() - 86400000));
        
        // Find incomplete timed tasks from yesterday
        const incompleteTasks = this.data.tasks.filter(t => 
            t.type === 'timed' && 
            t.date === yesterday && 
            !t.done
        );
        
        incompleteTasks.forEach(task => {
            // Check if same time slot is available today
            const conflictingTask = this.data.tasks.find(t => 
                t.type === 'timed' &&
                t.date === today &&
                !t.done &&
                this.hasTimeConflict(task, t)
            );
            
            if (conflictingTask) {
                // Convert to day task if there's a conflict
                task.type = 'day';
                delete task.startMin;
                delete task.endMin;
            }
            
            // Move to today
            task.date = today;
            task.updatedAt = new Date().toISOString();
        });
        
        if (incompleteTasks.length > 0) {
            this.save();
        }
    }
    
    // Check if two timed tasks have time conflict
    hasTimeConflict(task1, task2) {
        // どちらかに開始がなければ判定不能（基本なしとする）
        if (typeof task1.startMin !== 'number' || typeof task2.startMin !== 'number') {
            return false;
        }
        // 終了未設定は衝突なしとして扱う（タイムライン追加時の警告を抑制）
        if (typeof task1.endMin !== 'number' || typeof task2.endMin !== 'number') {
            return false;
        }
        // 翌日またぎ（end < start）は当日終端（1440分）までと解釈
        const end1 = task1.endMin >= task1.startMin ? task1.endMin : 1440;
        const end2 = task2.endMin >= task2.startMin ? task2.endMin : 1440;
        return !(end1 <= task2.startMin || task1.startMin >= end2);
    }
    
    // Convert time string to minutes
    timeToMinutes(timeStr) {
        if (!timeStr) return 0;
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    }
    
    // Convert minutes to time string
    minutesToTime(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }
    
    // Format date to YYYY-MM-DD
    formatDate(date) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const day = d.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    // Generate unique ID
    generateId() {
        return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
