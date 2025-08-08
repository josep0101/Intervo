const User = require('../models/User'); // May be needed if we pass userId instead of user object later

/**
 * Determines the active workspace ID and owner ID for a given user.
 * Prioritizes the last active workspace, then the default workspace.
 * 
 * @param {User} user - The user object, expected to be populated with defaultWorkspace and potentially lastActiveWorkspace.
 * @returns {{workspaceId: mongoose.Types.ObjectId | null, ownerId: mongoose.Types.ObjectId | null, error?: string}} 
 *          An object containing the workspaceId and ownerId, or null if not found, plus an optional error message.
 */
const getWorkspaceAndOwner = (user) => {
  if (!user) {
    return { workspaceId: null, ownerId: null, error: "User object is missing." };
  }

  const ownerId = user._id;
  let workspaceId = null;

  // Ensure potential virtual fields or populated paths are accessed correctly
  const lastActiveWorkspace = user.lastActiveWorkspace;
  const defaultWorkspace = user.defaultWorkspace;

  if (lastActiveWorkspace && lastActiveWorkspace._id) {
    workspaceId = lastActiveWorkspace._id;
  } else if (defaultWorkspace && defaultWorkspace._id) {
    workspaceId = defaultWorkspace._id;
  }

  if (!workspaceId) {
     // It's helpful to know the owner even if workspace isn't found
    return { workspaceId: null, ownerId: ownerId, error: "No active or default workspace found for the user." };
  }

  return { workspaceId, ownerId };
};

module.exports = {
  getWorkspaceAndOwner,
}; 