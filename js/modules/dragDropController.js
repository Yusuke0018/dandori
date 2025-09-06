// Drag & Drop Controller
export class DragDropController {
    constructor(taskManager, uiController) {
        this.taskManager = taskManager;
        this.uiController = uiController;
        this.draggedElement = null;
        this.draggedTask = null;
        this.touchOffset = { x: 0, y: 0 };
        this.init();
    }
    
    init() {
        // Initialize drag zones
        this.initDragZones();
        
        // Touch events
        document.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        document.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        document.addEventListener('touchend', (e) => this.handleTouchEnd(e));
        
        // Mouse events (desktop)
        document.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    }
    
    initDragZones() {
        // Make drop zones
        const dropZones = [
            '.day-tasks-list',
            '.timeline-grid',
            '.board-grid'
        ];
        
        dropZones.forEach(selector => {
            const zone = document.querySelector(selector);
            if (zone) {
                zone.classList.add('drop-zone');
            }
        });
    }
    
    handleTouchStart(e) {
        const touch = e.touches[0];
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        
        if (!target?.closest('.task-card')) return;
        
        const card = target.closest('.task-card');
        const taskId = card.dataset.taskId;
        
        if (!taskId) return;
        
        // Long press to start drag
        this.longPressTimer = setTimeout(() => {
            this.startDrag(card, taskId, touch.clientX, touch.clientY);
            // Haptic feedback if available
            if (navigator.vibrate) {
                navigator.vibrate(50);
            }
        }, 400);
        
        this.touchStartPos = { x: touch.clientX, y: touch.clientY };
    }
    
    handleTouchMove(e) {
        const touch = e.touches[0];
        
        // Cancel long press if moved too much
        if (this.longPressTimer) {
            const dist = Math.sqrt(
                Math.pow(touch.clientX - this.touchStartPos.x, 2) +
                Math.pow(touch.clientY - this.touchStartPos.y, 2)
            );
            
            if (dist > 10) {
                clearTimeout(this.longPressTimer);
                this.longPressTimer = null;
            }
        }
        
        if (this.draggedElement) {
            e.preventDefault();
            this.updateDragPosition(touch.clientX, touch.clientY);
            this.checkDropZones(touch.clientX, touch.clientY);
        }
    }
    
    handleTouchEnd(e) {
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
        
        if (this.draggedElement) {
            const touch = e.changedTouches[0];
            this.handleDrop(touch.clientX, touch.clientY);
        }
    }
    
    handleMouseDown(e) {
        if (e.button !== 0) return; // Left click only
        
        const card = e.target.closest('.task-card');
        if (!card) return;
        
        const taskId = card.dataset.taskId;
        if (!taskId) return;
        
        // Start drag immediately on desktop
        e.preventDefault();
        this.startDrag(card, taskId, e.clientX, e.clientY);
    }
    
    handleMouseMove(e) {
        if (this.draggedElement) {
            e.preventDefault();
            this.updateDragPosition(e.clientX, e.clientY);
            this.checkDropZones(e.clientX, e.clientY);
        }
    }
    
    handleMouseUp(e) {
        if (this.draggedElement) {
            this.handleDrop(e.clientX, e.clientY);
        }
    }
    
    startDrag(element, taskId, x, y) {
        this.draggedElement = element;
        this.draggedTask = this.taskManager.data.tasks.find(t => t.id === taskId);
        
        if (!this.draggedTask) return;
        // タイムライン上の時間指定タスクはドラッグ移動不可
        if (this.draggedTask.type === 'timed' && element.closest('.timeline-grid')) {
            this.draggedElement = null;
            this.draggedTask = null;
            return;
        }
        
        // Create ghost element
        this.ghost = element.cloneNode(true);
        this.ghost.className = 'task-card dragging-ghost';
        this.ghost.style.position = 'fixed';
        this.ghost.style.width = element.offsetWidth + 'px';
        this.ghost.style.pointerEvents = 'none';
        this.ghost.style.zIndex = '1000';
        this.ghost.style.opacity = '0.8';
        this.ghost.style.transform = 'scale(1.05) rotate(2deg)';
        this.ghost.style.transition = 'transform 0.2s';
        
        document.body.appendChild(this.ghost);
        
        // Calculate offset
        const rect = element.getBoundingClientRect();
        this.touchOffset = {
            x: x - rect.left,
            y: y - rect.top
        };
        
        // Update position
        this.updateDragPosition(x, y);
        
        // Mark original as dragging
        element.classList.add('dragging-source');
        element.style.opacity = '0.3';
    }
    
    updateDragPosition(x, y) {
        if (!this.ghost) return;
        
        this.ghost.style.left = (x - this.touchOffset.x) + 'px';
        this.ghost.style.top = (y - this.touchOffset.y) + 'px';
    }
    
    checkDropZones(x, y) {
        const element = document.elementFromPoint(x, y);
        
        // Clear previous highlights
        document.querySelectorAll('.drop-zone').forEach(zone => {
            zone.classList.remove('drag-over');
        });
        
        // Highlight current drop zone
        const dropZone = element?.closest('.drop-zone');
        if (dropZone) {
            dropZone.classList.add('drag-over');
            
            // Show time slot preview in timeline
            if (dropZone.classList.contains('timeline-grid')) {
                this.showTimeSlotPreview(x, y, dropZone);
            }
        }
    }
    
    showTimeSlotPreview(x, y, timeline) {
        const rect = timeline.getBoundingClientRect();
        const relativeY = y - rect.top;
        const totalMinutes = 1440; // 24 hours
        const minutes = Math.floor((relativeY / rect.height) * totalMinutes);
        const snapMinutes = Math.floor(minutes / 15) * 15; // Snap to 15 min
        
        // Remove old preview
        const oldPreview = timeline.querySelector('.time-slot-preview');
        if (oldPreview) {
            oldPreview.remove();
        }
        
        // Create preview
        const preview = document.createElement('div');
        preview.className = 'time-slot-preview';
        preview.style.position = 'absolute';
        preview.style.left = '0';
        preview.style.right = '0';
        preview.style.top = `${(snapMinutes / totalMinutes) * 100}%`;
        preview.style.height = '60px';
        preview.style.background = 'var(--color-primary-alpha)';
        preview.style.border = '2px dashed var(--color-primary)';
        preview.style.borderRadius = 'var(--radius-md)';
        preview.style.pointerEvents = 'none';
        
        timeline.appendChild(preview);
    }
    
    handleDrop(x, y) {
        if (!this.draggedElement || !this.draggedTask) return;
        
        const dropElement = document.elementFromPoint(x, y);
        const dropZone = dropElement?.closest('.drop-zone');
        
        if (dropZone) {
            this.processDrop(dropZone, x, y);
        }
        
        // Cleanup
        this.cleanup();
    }
    
    processDrop(dropZone, x, y) {
        let updated = false;
        
        if (dropZone.classList.contains('day-tasks-list')) {
            // Drop to day tasks (time unspecified)
            updated = this.dropToDay();
        } else if (dropZone.classList.contains('timeline-grid')) {
            // Drop to timeline (timed)
            updated = this.dropToTimeline(dropZone, y);
        } else if (dropZone.classList.contains('board-grid')) {
            // Drop to someday board
            updated = this.dropToSomeday();
        }
        
        if (updated) {
            // Refresh UI
            this.uiController.renderCurrentView();
            
            // Success animation
            this.showSuccessFeedback(x, y);
        }
    }
    
    dropToDay() {
        const updates = {
            type: 'day',
            date: this.taskManager.formatDate(this.uiController.currentDate)
        };
        
        // Remove time if it was timed
        delete updates.startMin;
        delete updates.endMin;
        
        return this.taskManager.updateTask(this.draggedTask.id, updates);
    }
    
    dropToTimeline(timeline, y) {
        const rect = timeline.getBoundingClientRect();
        const relativeY = y - rect.top;
        const totalMinutes = 1440;
        const minutes = Math.floor((relativeY / rect.height) * totalMinutes);
        const snapMinutes = Math.floor(minutes / 15) * 15;
        
        const updates = {
            type: 'timed',
            date: this.taskManager.formatDate(this.uiController.currentDate),
            startMin: snapMinutes
            // endMinは終了未設定を尊重して付与しない
        };
        
        // Check for conflicts
        const conflicts = this.taskManager.data.tasks.filter(t =>
            t.id !== this.draggedTask.id &&
            t.type === 'timed' &&
            t.date === updates.date &&
            !t.done &&
            this.taskManager.hasTimeConflict(updates, t)
        );
        
        if (conflicts.length > 0) {
            // Show conflict warning
            this.showConflictWarning(conflicts);
            
            // Adjust position or convert to day task
            updates.type = 'day';
            delete updates.startMin;
            delete updates.endMin;
        }
        
        return this.taskManager.updateTask(this.draggedTask.id, updates);
    }
    
    dropToSomeday() {
        const updates = {
            type: 'someday',
            date: null
        };
        
        delete updates.startMin;
        delete updates.endMin;
        
        return this.taskManager.updateTask(this.draggedTask.id, updates);
    }
    
    showSuccessFeedback(x, y) {
        const feedback = document.createElement('div');
        feedback.className = 'drop-success';
        feedback.style.position = 'fixed';
        feedback.style.left = x + 'px';
        feedback.style.top = y + 'px';
        feedback.style.transform = 'translate(-50%, -50%)';
        feedback.innerHTML = '✓';
        feedback.style.color = 'var(--color-success)';
        feedback.style.fontSize = '24px';
        feedback.style.fontWeight = 'bold';
        feedback.style.pointerEvents = 'none';
        feedback.style.zIndex = '1001';
        feedback.style.animation = 'fadeOutUp 0.5s ease forwards';
        
        document.body.appendChild(feedback);
        
        setTimeout(() => feedback.remove(), 500);
    }
    
    showConflictWarning(conflicts) {
        // Simple toast notification
        const toast = document.createElement('div');
        toast.className = 'toast-warning';
        toast.textContent = '時間が重複するため、未定タスクとして追加しました';
        toast.style.position = 'fixed';
        toast.style.bottom = '20px';
        toast.style.left = '50%';
        toast.style.transform = 'translateX(-50%)';
        toast.style.background = 'var(--color-warning)';
        toast.style.color = 'white';
        toast.style.padding = '12px 20px';
        toast.style.borderRadius = 'var(--radius-md)';
        toast.style.boxShadow = 'var(--shadow-lg)';
        toast.style.zIndex = '1002';
        toast.style.animation = 'slideUp 0.3s ease';
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideDown 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    cleanup() {
        // Remove ghost
        if (this.ghost) {
            this.ghost.remove();
            this.ghost = null;
        }
        
        // Remove time slot preview
        const preview = document.querySelector('.time-slot-preview');
        if (preview) {
            preview.remove();
        }
        
        // Reset dragging element
        if (this.draggedElement) {
            this.draggedElement.classList.remove('dragging-source');
            this.draggedElement.style.opacity = '';
            this.draggedElement = null;
        }
        
        // Clear highlights
        document.querySelectorAll('.drop-zone').forEach(zone => {
            zone.classList.remove('drag-over');
        });
        
        this.draggedTask = null;
    }
}

// Add animations to CSS
const style = document.createElement('style');
style.textContent = `
@keyframes fadeOutUp {
    to {
        opacity: 0;
        transform: translate(-50%, -150%);
    }
}

@keyframes slideUp {
    from {
        opacity: 0;
        transform: translate(-50%, 20px);
    }
    to {
        opacity: 1;
        transform: translate(-50%, 0);
    }
}

@keyframes slideDown {
    to {
        opacity: 0;
        transform: translate(-50%, 20px);
    }
}

.dragging-ghost {
    cursor: grabbing !important;
}

.dragging-source {
    transition: opacity 0.2s;
}

.drop-zone.drag-over {
    background: var(--color-primary-alpha) !important;
}
`;
document.head.appendChild(style);
