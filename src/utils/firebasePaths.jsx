// firebasePaths.jsx
// Centralized utility for constructing Firestore collection paths.

/**
 * Constructs a path for a user-specific collection.
 * This is the default for private user data.
 * @param {string} appId The application ID.
 * @param {string} userId The current user's ID.
 * @param {string} collectionName The name of the collection (e.g., 'programs', 'users').
 * @returns {string} The full Firestore collection path.
 */
export const getUserCollectionPath = (appId, userId, collectionName) => {
    if (!appId || !userId || !collectionName) {
        console.error("getUserCollectionPath: Missing appId, userId, or collectionName.");
        return ''; // Or throw an error
    }
    return `artifacts/${appId}/users/${userId}/${collectionName}`;
};

/**
 * Constructs a path for a public collection shared across users for a specific app.
 * Use with caution, as security rules must be configured appropriately.
 * @param {string} appId The application ID.
 * @param {string} collectionName The name of the collection.
 * @returns {string} The full Firestore public collection path.
 */
export const getAppCollectionPath = (appId, collectionName) => {
    if (!appId || !collectionName) {
        console.error("getAppCollectionPath: Missing appId or collectionName.");
        return ''; // Or throw an error
    }
    return `artifacts/${appId}/public/data/${collectionName}`;
};
