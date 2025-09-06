// Main Application Entry Point
import { TaskManager } from './modules/taskManager.js';
import { StorageService } from './modules/storage.js';
import { UIController } from './modules/uiController.js';
import { Router } from './modules/router.js';
import { DragDropController } from './modules/dragDropController.js';

class DandoriApp {
    constructor() {
        this.storage = new StorageService();
        this.taskManager = new TaskManager(this.storage);
        this.uiController = new UIController(this.taskManager);
        this.router = new Router(this.uiController);
        // 左トグルは廃止
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
                this.uiController.openProjectModal();
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
        // Swipe navigation among top tabs
        this.initSwipeNavigation();
        
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

        // Project modal events
        const pModal = document.getElementById('project-modal');
        const pClose = pModal.querySelector('.project-modal-close');
        const pCancel = pModal.querySelector('.project-cancel');
        const pForm = document.getElementById('project-form');
        const pDelete = pModal.querySelector('.btn-project-delete');
        pClose.addEventListener('click', () => this.uiController.closeProjectModal());
        pCancel.addEventListener('click', () => this.uiController.closeProjectModal());
        pModal.addEventListener('click', (e) => { if (e.target === pModal) this.uiController.closeProjectModal(); });
        pForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleProjectSubmit();
        });
        pDelete.addEventListener('click', () => {
            const id = this.uiController.editingProjectId;
            if (id && confirm('このプロジェクトを削除しますか？（所属タスクはプロジェクト未設定になります）')) {
                this.taskManager.deleteProject(id);
                this.uiController.closeProjectModal();
                this.uiController.renderCurrentView();
                this.uiController.showToast('削除しました');
            }
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
            // 終了時間は任意。開始時間は必須。
            if (!data.date || !data.startTime) {
                alert('日付と開始時刻を設定してください');
                return false;
            }
            // 終了時間がある場合のみ関係性を確認。
            // 終了が開始より前でも「翌日まで」を意味するためエラーにしない。
            // 例: 23:30 -> 01:00（翌日）
            // 同時刻（0分）も許容。
        }
        
        return true;
    }

    initSwipeNavigation() {
        const container = document.querySelector('.app-main');
        if (!container) return;

        let sx = 0, sy = 0, dx = 0, dy = 0, active = false;
        let touching = false; // タッチとポインタの二重発火防止
        const threshold = 40;
        const views = ['timeline','calendar','board','projects','completed'];

        const onStart = (x, y) => { sx = x; sy = y; dx = dy = 0; active = true; };
        const onMove = (x, y, preventDefault) => {
            if (!active) return;
            dx = x - sx; dy = y - sy;
            if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8 && typeof preventDefault === 'function') {
                // 水平方向の意図が強い場合、スクロールの既定動作を抑止
                preventDefault();
            }
        };
        const onEnd = () => {
            if (!active) return; active = false;
            if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > threshold) {
                const cur = this.uiController.currentView;
                // 文脈別のスワイプ挙動
                if (cur === 'timeline') {
                    // 今日（タイムライン）: 右→履歴、左→カレンダー
                    if (dx > 0) {
                        this.router.navigateTo('completed');
                    } else {
                        this.router.navigateTo('calendar');
                    }
                } else if (cur === 'completed') {
                    // 履歴: 左→今日（タイムライン）
                    if (dx < 0) {
                        this.router.navigateTo('timeline');
                    } else {
                        // 右は通常のタブ移動（前ページ）
                        const idx = views.indexOf(cur);
                        if (idx !== -1) {
                            const next = Math.max(idx - 1, 0);
                            if (next !== idx) this.router.navigateTo(views[next]);
                        }
                    }
                } else if (cur === 'calendar') {
                    // カレンダーでも左右スワイプはページ（タブ）移動
                    const idx = views.indexOf(cur);
                    if (idx !== -1) {
                        const next = dx < 0 ? Math.min(idx + 1, views.length - 1) : Math.max(idx - 1, 0);
                        if (next !== idx) this.router.navigateTo(views[next]);
                    }
                } else {
                    // タブ移動
                    const idx = views.indexOf(cur);
                    if (idx !== -1) {
                        const next = dx < 0 ? Math.min(idx + 1, views.length - 1) : Math.max(idx - 1, 0);
                        if (next !== idx) this.router.navigateTo(views[next]);
                    }
                }
            }
        };

        // Touch events（モバイル）
        container.addEventListener('touchstart', e => { touching = true; const t = e.touches[0]; onStart(t.clientX, t.clientY); }, { passive: true });
        container.addEventListener('touchmove', e => { const t = e.touches[0]; onMove(t.clientX, t.clientY, () => e.preventDefault()); }, { passive: false });
        container.addEventListener('touchend', () => { onEnd(); touching = false; }, { passive: true });
        container.addEventListener('touchcancel', () => { active = false; touching = false; }, { passive: true });

        // Pointer events（iOS/Androidの最新環境用、タッチのみ扱う）
        container.addEventListener('pointerdown', e => { if (touching || e.pointerType !== 'touch') return; onStart(e.clientX, e.clientY); });
        container.addEventListener('pointermove', e => { if (touching || e.pointerType !== 'touch') return; onMove(e.clientX, e.clientY, () => e.preventDefault()); });
        container.addEventListener('pointerup',   e => { if (touching || e.pointerType !== 'touch') return; onEnd(); });
        container.addEventListener('pointercancel', () => { if (!touching) active = false; });
    }

    handleProjectSubmit() {
        const name = document.getElementById('project-name').value.trim();
        const color = document.getElementById('project-color').value;
        const deadline = document.getElementById('project-deadline').value || null;
        if (!name) { alert('プロジェクト名を入力してください'); return; }
        if (this.uiController.editingProjectId) {
            this.taskManager.updateProject(this.uiController.editingProjectId, { name, color, deadline });
            this.uiController.showToast('更新しました');
        } else {
            this.taskManager.createProject({ name, color, deadline });
            this.uiController.showToast('作成しました');
        }
        this.uiController.closeProjectModal();
        this.uiController.renderCurrentView();
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
