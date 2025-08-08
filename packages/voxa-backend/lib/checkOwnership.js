const PhoneNumber = require("../models/PhoneNumber");
const Agent = require("../models/Agent");
const User = require("../models/User");
const Source = require("../models/KnowledgeSource");
const Workspace = require("../models/Workspace");

// Helper function to verify agent ownership via workspace
async function verifyAgentWorkspace(agentId, userId) {
  const user = await User.findById(userId)
    .populate("lastActiveWorkspace")
    .populate("defaultWorkspace");

  if (!user || (!user.lastActiveWorkspace && !user.defaultWorkspace)) {
    return null;
  }

  const workspaceId =
    user.lastActiveWorkspace?._id || user.defaultWorkspace?._id;

  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) {
    return null;
  }
  const agent = await Agent.findOne({
    _id: agentId,
    workspace: workspaceId,
  }).populate("phoneNumber", "phoneNumber");

  return agent;
}

async function verifyWorkspace(userId) {
  const user = await User.findById(userId)
    .populate("defaultWorkspace")
    .populate("lastActiveWorkspace");

  if (!user || (!user.lastActiveWorkspace && !user.defaultWorkspace)) {
    return null;
  }

  const workspaceId =
    user.lastActiveWorkspace?._id || user.defaultWorkspace?._id;
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) {
    return null;
  }

  // Security Check: Verify the user is the owner or a member of the loaded workspace
  const isOwner = workspace.user.toString() === userId.toString();
  const isMember = workspace.members.some(
    (member) => member.user.toString() === userId.toString()
  );

  if (!isOwner && !isMember) {
    // User's lastActiveWorkspace might be stale, deny access
    console.warn(`User ${userId} attempted to access workspace ${workspaceId} they are not part of.`);
    return null;
  }

  return workspace;
}

// Helper function to verify PhoneNumber ownership via workspace
async function verifyPhoneNumberWorkspace(phoneNumberId, userId) {
  const user = await User.findById(userId)
    .populate("lastActiveWorkspace")
    .populate("defaultWorkspace");
  if (!user || (!user.lastActiveWorkspace && !user.defaultWorkspace)) {
    return null;
  }

  const workspaceId =
    user.lastActiveWorkspace?._id || user.defaultWorkspace?._id;
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) {
    return null;
  }

  const phoneNumber = await PhoneNumber.findOne({
    _id: phoneNumberId,
    workspace: workspaceId,
  }).populate("agent", "agentType name");

  return phoneNumber;
}

// Helper function to verify KnowledgeSource ownership via workspace
async function verifySourceWorkspace(sourceId, userId) {
  const user = await User.findById(userId)
    .populate("lastActiveWorkspace")
    .populate("defaultWorkspace");
  if (!user || (!user.lastActiveWorkspace && !user.defaultWorkspace)) {
    return null;
  }

  const workspaceId =
    user.lastActiveWorkspace?._id || user.defaultWorkspace?._id;

  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) {
    return null;
  }

  const source = await Source.findOne({
    _id: sourceId,
    workspace: workspaceId,
  });

  return source;
}

module.exports = {
  verifyAgentWorkspace,
  verifyPhoneNumberWorkspace,
  verifySourceWorkspace,
  verifyWorkspace,
};
