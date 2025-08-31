// Router - Handles view navigation
export class Router {
    constructor(uiController) {
        this.uiController = uiController;
    }
    
    init() {
        // Handle browser back/forward
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.view) {
                this.uiController.switchView(e.state.view);
            }
        });
        
        // Set initial state
        const initialView = this.getInitialView();
        this.navigateTo(initialView, false);
    }
    
    navigateTo(view, pushState = true) {
        // Valid views
        const validViews = ['timeline', 'board', 'projects'];
        
        if (!validViews.includes(view)) {
            view = 'timeline';
        }
        
        // Update UI
        this.uiController.switchView(view);
        
        // Update URL
        if (pushState) {
            const url = `#${view}`;
            window.history.pushState({ view }, '', url);
        }
    }
    
    getInitialView() {
        // Check URL hash
        const hash = window.location.hash.slice(1);
        const validViews = ['timeline', 'board', 'projects'];
        
        if (validViews.includes(hash)) {
            return hash;
        }
        
        // Default to timeline
        return 'timeline';
    }
}