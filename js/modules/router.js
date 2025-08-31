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
        const validViews = ['home', 'timeline', 'board', 'projects', 'completed'];
        
        if (!validViews.includes(view)) {
            view = 'home';
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
        const validViews = ['home', 'timeline', 'board', 'projects', 'completed'];
        
        if (validViews.includes(hash)) {
            return hash;
        }
        
        // Default to home
        return 'home';
    }
}
