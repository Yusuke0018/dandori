// Panel Controller - Manages left toggle panel
export class PanelController {
    constructor(router) {
        this.router = router;
        this.panel = document.getElementById('toggle-panel');
        this.tab = document.getElementById('panel-tab');
        this.backdrop = document.getElementById('panel-backdrop');
        this.isOpen = false;
        this.touchStartX = 0;
        this.init();
    }
    
    init() {
        // Tab click
        this.tab.addEventListener('click', () => this.toggle());
        
        // Backdrop click
        this.backdrop.addEventListener('click', () => this.close());
        
        // Panel item clicks
        document.querySelectorAll('.panel-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                this.handleNavigation(view);
            });
        });
        
        // Swipe gesture from left edge
        this.initSwipeGestures();
        
        // Update badges
        this.updateBadges();
    }
    
    initSwipeGestures() {
        // Touch events for edge swipe
        document.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            this.touchStartX = touch.clientX;
            
            // Detect left edge swipe start
            if (touch.clientX < 20 && !this.isOpen) {
                this.swipeStarted = true;
            }
        });
        
        document.addEventListener('touchmove', (e) => {
            if (!this.swipeStarted) return;
            
            const touch = e.touches[0];
            const distance = touch.clientX - this.touchStartX;
            
            if (distance > 50) {
                this.open();
                this.swipeStarted = false;
            }
        });
        
        document.addEventListener('touchend', () => {
            this.swipeStarted = false;
        });
        
        // Mouse events for edge hover (desktop)
        let hoverTimer;
        document.addEventListener('mousemove', (e) => {
            if (e.clientX < 10 && !this.isOpen) {
                if (!hoverTimer) {
                    hoverTimer = setTimeout(() => {
                        this.tab.style.opacity = '1';
                        this.tab.style.width = '36px';
                    }, 200);
                }
            } else {
                if (hoverTimer) {
                    clearTimeout(hoverTimer);
                    hoverTimer = null;
                }
                if (!this.isOpen) {
                    this.tab.style.opacity = '';
                    this.tab.style.width = '';
                }
            }
        });
    }
    
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }
    
    open() {
        this.isOpen = true;
        this.panel.classList.add('open');
        this.tab.classList.add('active');
        this.backdrop.hidden = false;
        
        requestAnimationFrame(() => {
            this.backdrop.classList.add('visible');
        });
        
        // Pulse animation on first open
        if (!localStorage.getItem('dandori_panel_opened')) {
            localStorage.setItem('dandori_panel_opened', 'true');
            this.tab.style.animation = 'pulse 0.5s ease 2';
        }
    }
    
    close() {
        this.isOpen = false;
        this.panel.classList.remove('open');
        this.tab.classList.remove('active');
        this.backdrop.classList.remove('visible');
        
        setTimeout(() => {
            if (!this.isOpen) {
                this.backdrop.hidden = true;
            }
        }, 200);
    }
    
    handleNavigation(view) {
        // Update active state
        document.querySelectorAll('.panel-item').forEach(item => {
            item.classList.toggle('active', item.dataset.view === view);
        });
        
        // Special handling for calendar view
        if (view === 'calendar') {
            this.showMiniCalendar();
            return;
        }
        
        // Map panel views to router views
        const viewMap = {
            'today': 'timeline',
            'someday': 'board',
            'projects': 'projects',
            'completed': 'completed'
        };
        
        const routerView = viewMap[view] || view;
        this.router.navigateTo(routerView);
        
        // Close panel after navigation
        setTimeout(() => this.close(), 150);
    }
    
    showMiniCalendar() {
        const calendar = document.querySelector('.mini-calendar');
        calendar.hidden = !calendar.hidden;
        
        if (!calendar.hidden) {
            this.renderMiniCalendar();
        }
    }
    
    renderMiniCalendar() {
        const grid = document.querySelector('.calendar-grid');
        grid.innerHTML = '';
        
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth();
        
        // Update month header
        const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
        document.querySelector('.cal-month').textContent = `${year}年${monthNames[month]}`;
        
        // First day of month
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        // Add empty cells for days before month starts
        for (let i = 0; i < firstDay; i++) {
            const empty = document.createElement('div');
            empty.className = 'cal-day empty';
            grid.appendChild(empty);
        }
        
        // Add days of month
        for (let day = 1; day <= daysInMonth; day++) {
            const dayEl = document.createElement('button');
            dayEl.className = 'cal-day';
            dayEl.textContent = day;
            
            // Mark today
            if (day === today.getDate()) {
                dayEl.classList.add('today');
            }
            
            // Add click handler
            dayEl.addEventListener('click', () => {
                const selectedDate = new Date(year, month, day);
                this.handleDateSelection(selectedDate);
            });
            
            grid.appendChild(dayEl);
        }
    }
    
    handleDateSelection(date) {
        // Navigate to timeline view with selected date
        window.app.uiController.currentDate = date;
        window.app.uiController.updateDateHeader();
        this.router.navigateTo('timeline');
        this.close();
    }
    
    updateBadges() {
        // This would be called when tasks change
        // For now, just example counts
        const badges = {
            'today': 3,
            'someday': 5,
            'projects': 2
        };
        
        Object.entries(badges).forEach(([view, count]) => {
            const item = document.querySelector(`.panel-item[data-view="${view}"] .panel-badge`);
            if (item) {
                item.textContent = count;
                item.style.display = count > 0 ? 'block' : 'none';
            }
        });
    }
}

// Add pulse animation to CSS
const style = document.createElement('style');
style.textContent = `
@keyframes pulse {
    0%, 100% { transform: translateY(-50%) scale(1); }
    50% { transform: translateY(-50%) scale(1.1); }
}
`;
document.head.appendChild(style);