/**
 * Error Tracker - Automatic Console Error Capture
 * 
 * Captures all console errors and warnings, stores them in memory
 * for later review and tracking.
 */

export const errorTracker = {
    errors: [],
    warnings: [],
    
    // Initialize error capture
    init() {
        // Capture console.error
        const originalError = console.error;
        console.error = (...args) => {
            this.captureError('error', args);
            originalError.apply(console, args);
        };
        
        // Capture console.warn
        const originalWarn = console.warn;
        console.warn = (...args) => {
            this.captureError('warning', args);
            originalWarn.apply(console, args);
        };
        
        // Capture unhandled errors
        window.addEventListener('error', (event) => {
            this.captureError('unhandled', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error
            });
        });
        
        // Capture unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.captureError('promise', {
                reason: event.reason,
                promise: event.promise
            });
        });
        
        console.log('🔍 Error tracker initialized - capturing all console errors');
    },
    
    // Capture and categorize errors
    captureError(type, data) {
        const entry = {
            timestamp: new Date().toISOString(),
            type: type,
            data: this.serializeData(data),
            count: 1
        };
        
        // Check if similar error exists
        const existingError = this.findSimilarError(entry);
        if (existingError) {
            existingError.count++;
            existingError.timestamp = entry.timestamp;
        } else {
            if (type === 'error' || type === 'unhandled' || type === 'promise') {
                this.errors.push(entry);
            } else if (type === 'warning') {
                this.warnings.push(entry);
            }
        }
        
        // Auto-log to memory storage (localStorage for now)
        this.saveToStorage();
    },
    
    // Find similar error to avoid duplicates
    findSimilarError(newEntry) {
        const allErrors = [...this.errors, ...this.warnings];
        return allErrors.find(existing => {
            return existing.data.message === newEntry.data.message ||
                   existing.data.filename === newEntry.data.filename;
        });
    },
    
    // Serialize error data for storage
    serializeData(data) {
        if (typeof data === 'string') {
            return { message: data };
        } else if (data instanceof Error) {
            return {
                message: data.message,
                stack: data.stack,
                name: data.name
            };
        } else {
            // Extract key properties
            const serialized = {};
            for (const key in data) {
                if (data.hasOwnProperty(key)) {
                    serialized[key] = typeof data[key] === 'string' 
                        ? data[key] 
                        : JSON.stringify(data[key]);
                }
            }
            return serialized;
        }
    },
    
    // Save errors to localStorage
    saveToStorage() {
        try {
            const errorLog = {
                lastUpdated: new Date().toISOString(),
                errors: this.errors,
                warnings: this.warnings,
                summary: this.getSummary()
            };
            localStorage.setItem('fnlloyd_error_log', JSON.stringify(errorLog));
        } catch (e) {
            // Don't log this error to avoid infinite loop
        }
    },
    
    // Get error summary
    getSummary() {
        return {
            totalErrors: this.errors.length,
            totalWarnings: this.warnings.length,
            criticalCount: this.errors.filter(e => e.type === 'critical').length,
            mostFrequent: this.getMostFrequentErrors()
        };
    },
    
    // Get most frequent errors
    getMostFrequentErrors(limit = 5) {
        const allErrors = [...this.errors, ...this.warnings];
        return allErrors
            .sort((a, b) => b.count - a.count)
            .slice(0, limit)
            .map(e => ({
                message: e.data.message?.substring(0, 100) || 'Unknown error',
                count: e.count,
                type: e.type
            }));
    },
    
    // Export errors for memory storage
    exportForMemory() {
        const summary = this.getSummary();
        let output = `## Console Errors Summary - ${new Date().toISOString()}\n\n`;
        
        output += `**Total Errors:** ${summary.totalErrors}\n`;
        output += `**Total Warnings:** ${summary.totalWarnings}\n\n`;
        
        if (this.errors.length > 0) {
            output += `### 🔴 Critical Errors\n\n`;
            this.errors.forEach((error, index) => {
                output += `${index + 1}. **${error.data.message || 'Unknown'}**\n`;
                output += `   - Type: ${error.type}\n`;
                output += `   - Count: ${error.count}\n`;
                output += `   - Last Occurrence: ${error.timestamp}\n`;
                if (error.data.filename) {
                    output += `   - Location: ${error.data.filename}:${error.data.lineno || ''}\n`;
                }
                output += `\n`;
            });
        }
        
        if (this.warnings.length > 0) {
            output += `### 🟡 Warnings\n\n`;
            this.warnings.forEach((warning, index) => {
                output += `${index + 1}. **${warning.data.message || 'Unknown'}**\n`;
                output += `   - Type: ${warning.type}\n`;
                output += `   - Count: ${warning.count}\n`;
                output += `   - Last Occurrence: ${warning.timestamp}\n`;
                output += `\n`;
            });
        }
        
        return output;
    },
    
    // Clear all errors
    clear() {
        this.errors = [];
        this.warnings = [];
        localStorage.removeItem('fnlloyd_error_log');
        console.log('✅ Error log cleared');
    },
    
    // Load from storage
    loadFromStorage() {
        try {
            const stored = localStorage.getItem('fnlloyd_error_log');
            if (stored) {
                const data = JSON.parse(stored);
                this.errors = data.errors || [];
                this.warnings = data.warnings || [];
            }
        } catch (e) {
            // Ignore load errors
        }
    },
    
    // Copy errors to clipboard for memory storage
    copyToClipboard() {
        const output = this.exportForMemory();
        navigator.clipboard.writeText(output).then(() => {
            console.log('✅ Error log copied to clipboard - paste into memory');
        }).catch(err => {
            console.error('Failed to copy:', err);
        });
    },
    
    // Get raw error data for manual review
    getRawData() {
        return {
            errors: this.errors,
            warnings: this.warnings,
            summary: this.getSummary()
        };
    }
};

// Remove auto-initialization - call explicitly instead
// if (typeof window !== 'undefined') {
//     errorTracker.init();
// }

export function initErrorTracker() {
    errorTracker.init();
}

export default errorTracker;
