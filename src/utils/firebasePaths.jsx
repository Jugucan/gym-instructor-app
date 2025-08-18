// Helper to get user-specific collection paths
export const getUserCollectionPath = (appId, userId, collectionName) => {
    if (!userId || !appId) {
      console.error("User ID or App ID is not available for collection path.");
      return null;
    }
    return `artifacts/${appId}/users/${userId}/${collectionName}`;
};