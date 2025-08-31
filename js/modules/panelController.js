// Panel Controller - Manages left toggle panel
export class PanelController {
    constructor(router) {
        this.router = router;
        this.panel = document.getElementById('toggle-panel');
        this.tab = document.getElementById('panel-tab');
        this.backdrop = document.getElementById('panel-backdrop');
        this.isOpen = false;
        this.touchStartX = 0;
        this.calDate = new Date();
        this.calDate.setDate(1);
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
        
        // Calendar nav
        document.addEventListener('click', (e) => {
            if (e.target.matches('.cal-nav.prev')) {
                this.changeMonth(-1);
            } else if (e.target.matches('.cal-nav.next')) {
                this.changeMonth(1);
            }
        });

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
            'today': 'home',
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
        
        const base = new Date(this.calDate.getFullYear(), this.calDate.getMonth(), 1);
        const year = base.getFullYear();
        const month = base.getMonth();

        // Update month header
        const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
        document.querySelector('.cal-month').textContent = `${year}年${monthNames[month]}`;

        // Weekday header
        const wdays = ['日','月','火','水','木','金','土'];
        wdays.forEach(d => {
            const el = document.createElement('div');
            el.className = 'cal-weekday';
            el.textContent = d;
            grid.appendChild(el);
        });

        // Compute 6-week grid starting Sunday
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const prevDays = (firstDay + 7) % 7;
        const totalCells = 42; // 6 weeks
        const today = new Date();
        
        for (let i = 0; i < totalCells; i++) {
            const dayNum = i - prevDays + 1;
            const cellDate = new Date(year, month, dayNum);
            const inCurrent = dayNum >= 1 && dayNum <= daysInMonth;
            const btn = document.createElement('button');
            btn.className = 'cal-day';
            if (!inCurrent) btn.classList.add('adjacent');
            btn.textContent = String(cellDate.getDate());
            
            // Mark today
            if (cellDate.toDateString() === today.toDateString()) {
                btn.classList.add('today');
            }

            // Has tasks dot
            const tm = window.app?.taskManager;
            if (tm) {
                const dateStr = tm.formatDate(cellDate);
                const has = tm.data.tasks.some(t => !t.done && (t.type==='day'||t.type==='timed') && t.date === dateStr);
                if (has) btn.classList.add('has-tasks');
            }

            btn.addEventListener('click', () => {
                this.handleDateSelection(cellDate);
            });
            grid.appendChild(btn);
        }
    }

    changeMonth(delta) {
        this.calDate.setMonth(this.calDate.getMonth() + delta);
        this.renderMiniCalendar();
    }
    
    handleDateSelection(date) {
        // Navigate to timeline view with selected date
        window.app.uiController.currentDate = date;
        window.app.uiController.updateDateHeader();
        this.router.navigateTo('timeline');
        this.close();
    }
    
    updateBadges() {
        try {
            const tm = window.app?.taskManager;
            if (!tm) return;
            const todayStr = tm.formatDate(new Date());
            const todayCount = tm.data.tasks.filter(t => !t.done && (t.type === 'day' || t.type === 'timed') && t.date === todayStr).length;
            const somedayCount = tm.data.tasks.filter(t => !t.done && t.type === 'someday').length;
            const projectsCount = tm.data.projects.length;
            const completedCount = tm.data.tasks.filter(t => t.done).length;

            const badges = {
                'today': todayCount,
                'someday': somedayCount,
                'projects': projectsCount,
                'completed': completedCount
            };

            Object.entries(badges).forEach(([view, count]) => {
                const item = document.querySelector(`.panel-item[data-view="${view}"] .panel-badge`);
                if (item) {
                    item.textContent = String(count);
                    item.style.display = count > 0 ? 'block' : 'none';
                }
            });
        } catch (_) {
            // noop
        }
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
