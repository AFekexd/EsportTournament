
export function calculateDiff(original: any, updated: any, ignoredKeys: string[] = []): any {
    const changes: any = {};
    if (!original || !updated) return changes;

    const allKeys = Object.keys(updated);

    for (const key of allKeys) {
        if (ignoredKeys.includes(key)) continue;

        // Skip undefined values in updated (they mean no change intended usually in PATCH)
        if (updated[key] === undefined) continue;

        const oldValue = original[key];
        const newValue = updated[key];

        // Handle simple equality
        if (oldValue === newValue) continue;

        // Handle Dates
        if (oldValue instanceof Date && (newValue instanceof Date || typeof newValue === 'string')) {
            const newDate = new Date(newValue);
            if (oldValue.getTime() === newDate.getTime()) continue;
        }

        // Handle Objects/Arrays deep comparison (simple version)
        if (typeof oldValue === 'object' && oldValue !== null && typeof newValue === 'object' && newValue !== null) {
            if (JSON.stringify(oldValue) === JSON.stringify(newValue)) continue;
        }

        // If we received a primitive value but original was Date (common in JSON payloads)
        // Adjust for logging clarity or just log as is.
        
        changes[key] = { old: oldValue, new: newValue };
    }

    return changes;
}
