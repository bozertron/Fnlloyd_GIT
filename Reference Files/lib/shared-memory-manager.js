#!/usr/bin/env node
/**
 * Shared Memory Manager for !Fnlloyd Character Development
 * Allows agents and tools to register progress, problems, decisions, and character presets
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const MEMORY_FILE = join(__dirname, 'shared-memory.json');

// Load or initialize memory
function loadMemory() {
    if (existsSync(MEMORY_FILE)) {
        try {
            return JSON.parse(readFileSync(MEMORY_FILE, 'utf-8'));
        } catch (e) {
            return { version: "1.0", lastUpdated: "", agents: {}, characterPresets: {}, progress: [], decisions: [], problems: [] };
        }
    }
    return { version: "1.0", lastUpdated: "", agents: {}, characterPresets: {}, progress: [], decisions: [], problems: [] };
}

// Save memory
function saveMemory(memory) {
    memory.lastUpdated = new Date().toISOString();
    writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2));
}

// Register agent progress
export function registerProgress(agentId, message, status = 'in_progress') {
    const memory = loadMemory();
    memory.progress.push({
        agent: agentId,
        message,
        status,
        timestamp: new Date().toISOString()
    });
    saveMemory(memory);
    console.log(`[${agentId}] Progress: ${message}`);
}

// Register a decision
export function registerDecision(agentId, decision, rationale = '') {
    const memory = loadMemory();
    memory.decisions.push({
        agent: agentId,
        decision,
        rationale,
        timestamp: new Date().toISOString()
    });
    saveMemory(memory);
    console.log(`[${agentId}] Decision: ${decision}`);
}

// Register a problem
export function registerProblem(agentId, problem, severity = 'medium') {
    const memory = loadMemory();
    memory.problems.push({
        agent: agentId,
        problem,
        severity,
        timestamp: new Date().toISOString(),
        resolved: false
    });
    saveMemory(memory);
    console.log(`[${agentId}] Problem: ${problem}`);
}

// Save character preset
export function saveCharacterPreset(name, characteristics) {
    const memory = loadMemory();
    memory.characterPresets[name] = {
        ...characteristics,
        savedAt: new Date().toISOString()
    };
    saveMemory(memory);
    console.log(`Saved character preset: ${name}`);
}

// Register agent
export function registerAgent(agentId, capabilities = []) {
    const memory = loadMemory();
    memory.agents[agentId] = {
        capabilities,
        registeredAt: new Date().toISOString(),
        lastActive: new Date().toISOString()
    };
    saveMemory(memory);
    console.log(`Registered agent: ${agentId}`);
}

// Get memory summary
export function getSummary() {
    const memory = loadMemory();
    return {
        version: memory.version,
        lastUpdated: memory.lastUpdated,
        agents: Object.keys(memory.agents),
        presets: Object.keys(memory.characterPresets),
        progressCount: memory.progress.length,
        decisionsCount: memory.decisions.length,
        problemsCount: memory.problems.length
    };
}

// CLI interface
const args = process.argv.slice(2);
if (args.length > 0) {
    const command = args[0];
    const agentId = args[1] || 'cli';
    
    switch (command) {
        case 'progress':
            registerProgress(agentId, args.slice(2).join(' '));
            break;
        case 'decision':
            registerDecision(agentId, args.slice(2).join(' '));
            break;
        case 'problem':
            registerProblem(agentId, args.slice(2).join(' '));
            break;
        case 'register':
            registerAgent(agentId, args.slice(2));
            break;
        case 'summary':
        case 'stats':
            console.log(JSON.stringify(getSummary(), null, 2));
            break;
        case 'save-preset':
            // Usage: node shared-memory-manager.js save-preset <name> <json>
            const name = args[1];
            const jsonStr = args.slice(2).join(' ');
            if (name && jsonStr) {
                try {
                    const chars = JSON.parse(jsonStr);
                    saveCharacterPreset(name, chars);
                } catch (e) {
                    console.error('Invalid JSON:', e.message);
                }
            } else {
                console.log('Usage: node shared-memory-manager.js save-preset <name> <json>');
            }
            break;
        default:
            console.log('Commands: progress, decision, problem, register, summary, save-preset');
            console.log(getSummary());
    }
}

// Export for use as module
export default {
    registerProgress,
    registerDecision,
    registerProblem,
    saveCharacterPreset,
    registerAgent,
    getSummary,
    loadMemory,
    saveMemory
};
