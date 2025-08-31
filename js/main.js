// Main Application Entry Point
import { TaskManager } from './modules/taskManager.js';
import { StorageService } from './modules/storage.js';
import { UIController } from './modules/uiController.js';
import { Router } from './modules/router.js';
import { PanelController } from './modules/panelController.js';
import { DragDropController } from './modules/dragDropController.js';

class DandoriApp {
    constructor() {
        this.storage = new StorageService();
        this.taskManager = new TaskManager(this.storage);
        this.uiController = new UIController(this.taskManager);
        this.router = new Router(this.uiController);
        this.panelController = new PanelController(this.router);
        this.dragDropController = new DragDropController(this.taskManager, this.uiController);
        
        this.init();
    }
    
    async init() {
        // Load saved data
        await this.taskManager.loadData();
        
        // Initialize UI
        this.uiController.init();
        
        // Set up routing
        this.router.init();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Update current time indicator
        this.updateTimeIndicator();
        setInterval(() => this.updateTimeIndicator(), 60000); // Update every minute
        
        console.log('ダンドリ App initialized');
    }
    
    setupEventListeners() {
        // Add button: tasks by default, projects when in projects view
        document.querySelector('.btn-add').addEventListener('click', () => {
            if (this.uiController.currentView === 'projects') {
                const name = window.prompt('プロジェクト名を入力してください');
                if (!name || !name.trim()) return;
                const colors = ['blue','green','orange','red','purple','teal','pink','gray'];
                const colorInput = window.prompt(`色を選択してください:\n${colors.join(', ')}`, 'blue');
                const color = colors.includes((colorInput || '').trim()) ? colorInput.trim() : 'blue';
                this.taskManager.createProject({ name: name.trim(), color });
                this.uiController.renderCurrentView();
            } else {
                this.uiController.openTaskModal();
            }
        });
        
        // Tab navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.dataset.view;
                this.router.navigateTo(view);
            });
        });
        
        // Modal events
        const modal = document.getElementById('task-modal');
        const closeBtn = modal.querySelector('.modal-close');
        const cancelBtn = modal.querySelector('.btn-cancel');
        const form = document.getElementById('task-form');
        
        closeBtn.addEventListener('click', () => this.uiController.closeTaskModal());
        cancelBtn.addEventListener('click', () => this.uiController.closeTaskModal());
        
        // Close modal on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.uiController.closeTaskModal();
            }
        });
        
        // Task type selector
        document.querySelectorAll('.type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.uiController.selectTaskType(e.target.dataset.type);
            });
        });
        
        // Form submission
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleTaskSubmit();
        });
        
        // Date navigation
        document.querySelector('.date-nav.prev').addEventListener('click', () => {
            this.uiController.navigateDate(-1);
        });
        
        document.querySelector('.date-nav.next').addEventListener('click', () => {
            this.uiController.navigateDate(1);
        });
    }
    
    handleTaskSubmit() {
        const form = document.getElementById('task-form');
        const formData = new FormData(form);
        
        const taskData = {
            title: document.getElementById('task-title').value,
            type: document.querySelector('.type-btn.active').dataset.type,
            date: document.getElementById('task-date').value,
            startTime: document.getElementById('task-start').value,
            endTime: document.getElementById('task-end').value,
            projectId: document.getElementById('task-project').value
        };
        
        // Validate based on type
        if (!this.validateTaskData(taskData)) {
            return;
        }
        
        // Create task
        const task = this.taskManager.createTask(taskData);
        
        // Update UI
        this.uiController.addTaskToView(task);
        this.uiController.closeTaskModal();
        
        // Reset form
        form.reset();
    }
    
    validateTaskData(data) {
        if (!data.title.trim()) {
            alert('タスク名を入力してください');
            return false;
        }
        
        if (data.type === 'day' && !data.date) {
            alert('日付を選択してください');
            return false;
        }
        
        if (data.type === 'timed') {
            if (!data.date || !data.startTime || !data.endTime) {
                alert('日付と時間を設定してください');
                return false;
            }
            
            if (data.startTime >= data.endTime) {
                alert('終了時刻は開始時刻より後に設定してください');
                return false;
            }
        }
        
        return true;
    }
    
    updateTimeIndicator() {
        const now = new Date();
        const minutes = now.getHours() * 60 + now.getMinutes();
        const topPosition = (minutes / 1440) * 100; // 1440 = 24 * 60
        
        const indicator = document.querySelector('.current-time-line');
        if (indicator) {
            indicator.style.top = `${topPosition}%`;
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new DandoriApp();
});
