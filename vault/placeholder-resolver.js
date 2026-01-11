/**
 * PlaceholderResolver - Resolves ${{placeholder}} syntax from vault, env, or values
 * 
 * Supported patterns:
 * - ${{vault:credential_name}}  - Resolve from vault
 * - ${{env:ENV_VAR_NAME}}       - Resolve from environment variable
 * - ${{value:literal_value}}    - Direct value (for non-sensitive data)
 * - ${{credential_name}}        - Shorthand for vault:credential_name
 * 
 * @example
 * const resolver = new PlaceholderResolver(vaultAPI);
 * const config = {
 *   email: "${{gmail_email}}",
 *   password: "${{vault:gmail_password}}",
 *   rememberMe: "${{value:true}}"
 * };
 * const resolved = await resolver.resolve(config);
 * // { email: "user@gmail.com", password: "secret123", rememberMe: "true" }
 */

import { VaultAPI } from './vault.js';

export class PlaceholderResolver {
    constructor(vaultAPI = null) {
        this.vaultAPI = vaultAPI || new VaultAPI();
        this.placeholderPattern = /\$\{\{([^}]+)\}\}/g;
    }

    /**
     * Check if a string contains placeholders
     */
    hasPlaceholders(str) {
        if (typeof str !== 'string') return false;
        return this.placeholderPattern.test(str);
    }

    /**
     * Parse a placeholder string into source and key
     * Examples:
     *   "vault:gmail_email" => { source: "vault", key: "gmail_email" }
     *   "env:API_KEY" => { source: "env", key: "API_KEY" }
     *   "gmail_email" => { source: "vault", key: "gmail_email" } (default)
     */
    parsePlaceholder(placeholder) {
        const parts = placeholder.split(':');
        if (parts.length === 1) {
            // Shorthand: ${{credential_name}} defaults to vault
            return { source: 'vault', key: parts[0].trim() };
        }
        return {
            source: parts[0].trim(),
            key: parts.slice(1).join(':').trim()
        };
    }

    /**
     * Resolve a single placeholder value
     */
    async resolvePlaceholder(placeholder) {
        const { source, key } = this.parsePlaceholder(placeholder);

        switch (source) {
            case 'vault':
                return await this.vaultAPI.getCredential(key);
            
            case 'env':
                const envValue = process.env[key];
                if (!envValue) {
                    throw new Error(`Environment variable not found: ${key}`);
                }
                return envValue;
            
            case 'value':
                // Direct value - useful for non-sensitive config
                return key;
            
            default:
                throw new Error(`Unknown placeholder source: ${source}`);
        }
    }

    /**
     * Resolve a string that may contain one or more placeholders
     */
    async resolveString(str) {
        if (!this.hasPlaceholders(str)) {
            return str;
        }

        const matches = [...str.matchAll(this.placeholderPattern)];
        let result = str;

        for (const match of matches) {
            const fullMatch = match[0]; // e.g., "${{gmail_email}}"
            const placeholder = match[1]; // e.g., "gmail_email"
            const value = await this.resolvePlaceholder(placeholder);
            result = result.replace(fullMatch, value);
        }

        return result;
    }

    /**
     * Resolve all placeholders in an object (deep)
     * Handles nested objects and arrays
     */
    async resolve(obj) {
        if (obj === null || obj === undefined) {
            return obj;
        }

        // Handle strings
        if (typeof obj === 'string') {
            return await this.resolveString(obj);
        }

        // Handle arrays
        if (Array.isArray(obj)) {
            return await Promise.all(obj.map(item => this.resolve(item)));
        }

        // Handle objects
        if (typeof obj === 'object') {
            const resolved = {};
            for (const [key, value] of Object.entries(obj)) {
                resolved[key] = await this.resolve(value);
            }
            return resolved;
        }

        // Return primitives as-is
        return obj;
    }

    /**
     * Extract all placeholder references from an object
     * Useful for checking what credentials are needed before resolution
     */
    extractPlaceholders(obj, extracted = new Set()) {
        if (typeof obj === 'string' && this.hasPlaceholders(obj)) {
            const matches = [...obj.matchAll(this.placeholderPattern)];
            matches.forEach(match => {
                const { source, key } = this.parsePlaceholder(match[1]);
                extracted.add(`${source}:${key}`);
            });
        } else if (Array.isArray(obj)) {
            obj.forEach(item => this.extractPlaceholders(item, extracted));
        } else if (typeof obj === 'object' && obj !== null) {
            Object.values(obj).forEach(value => this.extractPlaceholders(value, extracted));
        }
        return Array.from(extracted);
    }

    /**
     * Validate that all required credentials are available
     * Returns array of missing credentials
     */
    async validateCredentials(config) {
        const placeholders = this.extractPlaceholders(config);
        const missing = [];

        for (const placeholder of placeholders) {
            const { source, key } = this.parsePlaceholder(placeholder.split(':')[1] || placeholder);
            
            if (source === 'vault') {
                const hasCredential = await this.vaultAPI.hasCredential(key);
                if (!hasCredential) {
                    missing.push(key);
                }
            } else if (source === 'env') {
                if (!process.env[key]) {
                    missing.push(`env:${key}`);
                }
            }
        }

        return missing;
    }
}

// Standalone utility for quick one-off resolutions
export async function resolvePlaceholders(config, vaultAPI = null) {
    const resolver = new PlaceholderResolver(vaultAPI);
    return await resolver.resolve(config);
}
