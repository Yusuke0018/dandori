// Storage Service for localStorage management
export class StorageService {
    constructor() {
        this.STORAGE_KEY = 'dandori_data';
        this.SCHEMA_VERSION = 1;
    }
    
    // Load all data from localStorage
    load() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            if (!data) {
                return this.getDefaultData();
            }
            
            const parsed = JSON.parse(data);
            
            // Check schema version and migrate if needed
            if (parsed.schemaVersion !== this.SCHEMA_VERSION) {
                return this.migrate(parsed);
            }
            
            return parsed;
        } catch (error) {
            console.error('Failed to load data:', error);
            return this.getDefaultData();
        }
    }
    
    // Save data to localStorage
    save(data) {
        try {
            const dataToSave = {
                ...data,
                schemaVersion: this.SCHEMA_VERSION,
                lastUpdated: new Date().toISOString()
            };
            
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(dataToSave));
            return true;
        } catch (error) {
            console.error('Failed to save data:', error);
            return false;
        }
    }
    
    // Clear all data
    clear() {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
            return true;
        } catch (error) {
            console.error('Failed to clear data:', error);
            return false;
        }
    }
    
    // Get default data structure
    getDefaultData() {
        return {
            schemaVersion: this.SCHEMA_VERSION,
            projects: [
                {
                    id: 'default',
                    name: '個人タスク',
                    color: 'blue',
                    createdAt: new Date().toISOString()
                }
            ],
            tasks: [],
            settings: {
                carryOver: true,
                theme: 'light',
                defaultView: 'timeline'
            },
            lastUpdated: new Date().toISOString()
        };
    }
    
    // Migrate data from older schema versions
    migrate(data) {
        console.log(`Migrating from schema version ${data.schemaVersion} to ${this.SCHEMA_VERSION}`);
        
        // Handle migration logic here
        // For now, just return default data
        return this.getDefaultData();
    }
    
    // Export data as JSON
    export() {
        const data = this.load();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `dandori_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
    }
    
    // Import data from JSON file
    async import(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    // Validate imported data
                    if (!this.validateData(data)) {
                        reject(new Error('Invalid data format'));
                        return;
                    }
                    
                    // Save imported data
                    this.save(data);
                    resolve(data);
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }
    
    // Validate data structure
    validateData(data) {
        return data &&
               typeof data === 'object' &&
               Array.isArray(data.projects) &&
               Array.isArray(data.tasks) &&
               data.settings &&
               typeof data.settings === 'object';
    }
}