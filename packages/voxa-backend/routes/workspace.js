// routes/workspace.js
const express = require("express");
const router = express.Router();
const Workspace = require("../models/Workspace");
const Activity = require("../models/Activity");
const { verifyWorkspace } = require("../lib/checkOwnership");
const authenticateUser = require("../lib/authMiddleware");
const User = require("../models/User");
const mongoose = require("mongoose");
const Agent = require("../models/Agent");
const KnowledgeSource = require("../models/KnowledgeSource");
const PhoneNumber = require("../models/PhoneNumber");
const { sendWorkspaceInvitationEmail, sendWorkspaceRevocationEmail } = require('../lib/emailService');
const crypto = require('crypto');
const { createWorkspace } = require('../lib/workspaceService'); // Import the service function
const { calculateCreditBalance } = require('../lib/creditService'); // Import credit service function
const twilio = require('twilio'); // Ensure Twilio is required
const fs = require('fs'); // Added for reading timezone file
const path = require('path'); // Added for path manipulation

router.use(authenticateUser);

// GET /workspace
// router.get('/', async (req, res) => {
//   try {
//     const workspaces = await Workspace.find();
//     res.json(workspaces);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

router.get("/", async (req, res) => {
  try {
    console.log(req.user.id);
    const workspace = await verifyWorkspace(req.user.id);

    if (!workspace) {
      return res.status(404).json({ error: "Workspace not found" });
    }

    const memberWorkspaces = await Workspace.find(
      {
        $or: [
          { "members.user": req.user.id },
          { _id: workspace._id },
          { user: req.user.id },
        ],
      },
      "name"
    );

    const decryptedWorkspace = workspace.toJSON();

    // --- Calculate Credit Balance --- START ---
    let creditInfo = await calculateCreditBalance(workspace);
    // --- Calculate Credit Balance --- END ---

    // --- Include price IDs from environment ---
    const priceIds = {
      businessPlanYearly: process.env.BUSINESS_PLAN_YEARLY_PRICE_ID,
      businessPlanMonthly: process.env.BUSINESS_PLAN_MONTHLY_PRICE_ID,
      businessPlanYearlyPrice: process.env.BUSINESS_PLAN_YEARLY_PRICE,
      businessPlanMonthlyPrice: process.env.BUSINESS_PLAN_MONTHLY_PRICE,
    };

    res.json({
      currentWorkspace: { ...decryptedWorkspace, creditInfo, priceIds: priceIds }, // Merge credit info
      memberWorkspaces: memberWorkspaces,
     
    });
  } catch (err) {
    console.error(err, "err");
    res.status(500).json({ error: err.message });
  }
});

router.post("/change-workspace", async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.body.workspaceId);
    if (!workspace) {
      return res.status(404).json({ error: "Workspace not found" });
    }

    // Check if user is owner or member
    const isOwner = workspace.user.toString() === req.user.id;
    const isMember = workspace.members.some(
      (member) => member.user.toString() === req.user.id
    );

    if (!isOwner && !isMember) {
      return res
        .status(403)
        .json({ error: "Not authorized to access this workspace" });
    }

    const user = await User.findById(req.user.id);
    user.lastActiveWorkspace = workspace._id;
    await user.save();

    res.json({ message: "Workspace changed successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /workspace/:id
router.put("/", async (req, res) => {
  try {
    const workspace = await verifyWorkspace(req.user.id);
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    // --- Authorization Check for Billing Fields ---
    const isOwner = workspace.user.toString() === req.user.id;
    const billingFields = ['billingCycleAnchor', 'billingCycleInterval', 'planAllocatedCredits'];
    const attemptingToUpdateBilling = billingFields.some(field => field in req.body);

    if (attemptingToUpdateBilling && !isOwner) {
      return res.status(403).json({ error: "Only the workspace owner can modify billing settings." });
    }
    // --- End Authorization Check ---

    // General Updates
    workspace.name = req.body.name || workspace.name;
    workspace.timezone = req.body.timezone || workspace.timezone;
   
  if(req.body.twilioSID){
    workspace.twilioSID = req.body.twilioSID || workspace.twilioSID;
    }
    else {
      workspace.twilioSID = "";
    }

  if(req.body.apiKey){
    workspace.apiKey = req.body.apiKey || workspace.apiKey;
  }
  else {
    workspace.apiKey = "";
  }

    console.log("req.body.forceClearTwilioCredentials",req.body.forceClearTwilioCredentials)
    if(req.body.forceClearTwilioCredentials){
      workspace.twilioSID = "";
      workspace.apiKey = "";
    }

    // Billing Field Updates (only if owner)
    if (isOwner) {
        if (req.body.billingCycleAnchor) {
            // Basic validation for date format, can be enhanced
            if (!isNaN(Date.parse(req.body.billingCycleAnchor))) {
                 workspace.billingCycleAnchor = req.body.billingCycleAnchor;
            } else {
                console.warn(`Invalid date format for billingCycleAnchor: ${req.body.billingCycleAnchor}`);
                // Optionally return an error or just ignore the invalid value
            }
        }
        if (req.body.billingCycleInterval && ['monthly', 'yearly'].includes(req.body.billingCycleInterval)) {
            workspace.billingCycleInterval = req.body.billingCycleInterval;
        }
        if (typeof req.body.planAllocatedCredits === 'number') {
            workspace.planAllocatedCredits = req.body.planAllocatedCredits;
        }
    }


    const updatedWorkspace = await workspace.save();
    // Return decrypted workspace info
    res.json(updatedWorkspace.toJSON()); 
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /workspace/:id
router.delete("/:id", async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) {
      return res.status(404).json({ error: "Workspace not found" });
    }

    // Find all users who have this workspace as their lastActiveWorkspace
    const usersToUpdate = await User.find({
      lastActiveWorkspace: workspace._id,
    });

    // Find alternative workspaces for affected users
    for (const user of usersToUpdate) {
      const alternativeWorkspace = await Workspace.findOne({
        $or: [{ user: user._id }, { "members.user": user._id }],
        _id: { $ne: workspace._id },
      });

      // Update user's lastActiveWorkspace
      user.lastActiveWorkspace = alternativeWorkspace
        ? alternativeWorkspace._id
        : null;
      await user.save();
    }

    const agents = await Agent.find({ workspace: workspace._id });
    const sources = await KnowledgeSource.find({ workspace: workspace._id });

    // Delete all knowledge sources
    for (const source of sources) {
      try {
        await KnowledgeSource.findByIdAndDelete(source._id);
      } catch (error) {
        console.error(`Error deleting knowledge source ${source._id}:`, error);
      }
    }

    // Delete all agents
    for (const agent of agents) {
      try {
        if (agent.phoneNumber) {
          await PhoneNumber.findByIdAndUpdate(agent.phoneNumber, {
            agent: null,
          });
        }
        await Agent.findByIdAndDelete(agent._id);
      } catch (error) {
        console.error(`Error deleting agent ${agent._id}:`, error);
      }
    }

    await Workspace.findByIdAndDelete(workspace._id);

    res.json({
      message: "Workspace and associated resources deleted successfully",
      deletedResources: {
        agents: agents.length,
        knowledgeSources: sources.length,
      },
    });
  } catch (err) {
    console.error("Error deleting workspace:", err);
    res.status(500).json({
      error: "Failed to delete workspace and associated resources",
      details: err.message,
    });
  }
});

// GET /workspace/users
router.get("/users", async (req, res) => {
  try {
    const workspace = await verifyWorkspace(req.user.id);
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;

    const ownerUser = await User.findById(workspace.user);
    const ownerInfo = {
      email: ownerUser.email,
      role: "admin",
      added: workspace.createdAt,
      status: "active",
    };

    const memberUsers = await Promise.all(
      workspace.members.map(async (member) => {
        const user = await User.findById(member.user);
        return {
          email: user.email,
          role: member.role,
          added: member.added,
          status: "active",
        };
      })
    );

    const pendingUsers = workspace.pendingInvites.map((invite) => ({
      email: invite.email,
      role: invite.role,
      added: invite.added,
      status: "pending",
    }));

    const allUsers = [ownerInfo, ...memberUsers, ...pendingUsers];
    const totalUsers = allUsers.length;
    const totalPages = Math.ceil(totalUsers / limit);

    const paginatedUsers = allUsers.slice(startIndex, startIndex + limit);

    res.status(200).json({
      success: true,
      users: paginatedUsers,
      pagination: {
        currentPage: page,
        totalPages,
        totalUsers,
        limit,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /workspace/invite
router.post("/invite", async (req, res) => {
  try {
    const workspace = await verifyWorkspace(req.user.id);
    if (!workspace)
      return res.status(404).json({ error: "Workspace not found" });

    const { email, role } = req.body;

    if (!email || !role) {
      return res.status(400).json({ error: "Email and role are required" });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    // if (!existingUser) {
    //   return res.status(404).json({ error: "No user found with this email" });
    // }

    const existingInvite = workspace.pendingInvites.find(
      (invite) => invite.email === email
    );
    if (existingInvite) {
      return res
        .status(400)
        .json({ error: "Invite already exists for this email" });
    }

    // Generate invite token and expiry
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const inviteTokenExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    workspace.pendingInvites.push({ 
      email, 
      role, 
      inviteToken, 
      inviteTokenExpires 
    });
    await workspace.save();

    // Send invitation email
    try {
      const inviterName = req.user?.name || 'Someone';
      const invitedUserName = existingUser?.name || '';
      // Include token in the invite link
      const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/accept-invite?workspaceId=${workspace._id}&email=${encodeURIComponent(email)}&token=${inviteToken}`;

      await sendWorkspaceInvitationEmail(
        email,
        workspace.name,
        inviterName,
        inviteLink,
        invitedUserName
      );
      console.log(`Workspace invitation email sent to ${email}`);
    } catch (emailError) {
      console.error(`Failed to send workspace invitation email to ${email}:`, emailError);
    }

    res.status(201).json({ success: true, message: "Invite to user sent" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /invitations/resolve?token=<inviteToken>
// Resolves an invitation token to find the corresponding workspace ID
router.get("/invitations/resolve", async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ error: "Invite token is missing" });
    }

    // Find the workspace containing the valid pending invite
    const workspace = await Workspace.findOne({
      "pendingInvites.inviteToken": token,
      "pendingInvites.inviteTokenExpires": { $gt: Date.now() }, // Check expiry
    }).select("_id pendingInvites"); // Select only necessary fields

    if (!workspace) {
      return res.status(404).json({ error: "Invalid or expired invite token" });
    }

    // Optionally: Verify the invite belongs to the logged-in user 
    // (This adds security if the user MUST be logged in to resolve)
    const invite = workspace.pendingInvites.find(inv => inv.inviteToken === token);
    if (invite && invite.email !== req.user.email) {
       console.warn(`User ${req.user.email} tried to resolve token for ${invite.email}`);
       // Depending on requirements, you might return 403 Forbidden or still resolve 
       // return res.status(403).json({ error: "Token does not belong to this user" });
    }

    // Return the workspace ID
    res.json({ workspaceId: workspace._id });

  } catch (err) {
    console.error("Error resolving invitation token:", err);
    res.status(500).json({ error: "Failed to resolve invitation token" });
  }
});

// POST /workspace/accept-invite/:workspaceId
router.post("/accept-invite/:workspaceId", async (req, res) => {
  try {
    const { token } = req.body; // Get token from query parameters
    if (!token) {
      return res.status(400).json({ error: "Invite token is missing" });
    }

    const workspace = await Workspace.findById(req.params.workspaceId);
    if (!workspace) {
      return res.status(404).json({ error: "Workspace not found" });
    }

    // Find the invite matching email, token, and check expiry
    const inviteIndex = workspace.pendingInvites.findIndex(
      (invite) => 
        invite.email === req.user.email && 
        invite.inviteToken === token &&
        invite.inviteTokenExpires > Date.now()
    );

    if (inviteIndex === -1) {
      // Check if an expired or invalid token was the reason
      const expiredOrInvalidInvite = workspace.pendingInvites.find(
        (invite) => invite.email === req.user.email && invite.inviteToken === token
      );
      if (expiredOrInvalidInvite) {
         return res.status(400).json({ error: "Invite token has expired or is invalid" });
      }
      return res.status(404).json({ error: "No valid pending invite found for this user and token" });
    }

    const invite = workspace.pendingInvites[inviteIndex];

    workspace.members.push({
      user: req.user.id,
      role: invite.role,
    });

    workspace.pendingInvites.splice(inviteIndex, 1);

    await workspace.save();

    // Update user's lastActiveWorkspace
    try {
      const user = await User.findById(req.user.id);
      if (user) {
        user.lastActiveWorkspace = workspace._id;
        await user.save();
        console.log(`Updated lastActiveWorkspace for user ${req.user.email} to ${workspace._id}`);
      } else {
        console.warn(`Could not find user ${req.user.id} to update lastActiveWorkspace after accepting invite.`);
      }
    } catch (userUpdateError) {
      console.error(`Failed to update lastActiveWorkspace for user ${req.user.id}:`, userUpdateError);
      // Log error but don't fail the request as the user successfully joined the workspace
    }

    res.status(201).json({ success: true, message: "Joined Workspace" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /workspace/users
router.put("/users", async (req, res) => {
  try {
    const workspace = await verifyWorkspace(req.user.id);
    if (!workspace) {
      return res.status(404).json({ error: "Workspace not found" });
    }

    if (workspace.user.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ error: "Only workspace owner can update roles" });
    }

    const { email, role } = req.body;
    if (!email || !role) {
      return res.status(400).json({ error: "Email and role are required" });
    }

    // Check pendingInvites first
    const pendingInviteIndex = workspace.pendingInvites.findIndex(
      (invite) => invite.email.toLowerCase() === email.toLowerCase()
    );

    if (pendingInviteIndex !== -1) {
      workspace.pendingInvites[pendingInviteIndex].role = role;
      await workspace.save();
      return res.json({
        success: true,
        message: "Pending invite role updated successfully",
      });
    }

    // If not in pendingInvites, check members
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const memberIndex = workspace.members.findIndex(
      (member) => member.user.toString() === user._id.toString()
    );

    if (memberIndex === -1) {
      return res.status(404).json({ error: "User not found in workspace" });
    }

    workspace.members[memberIndex].role = role;
    await workspace.save();

    res.json({ success: true, message: "User role updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /workspace/delete-user
router.post("/delete-user", async (req, res) => {
  try {
    const workspace = await verifyWorkspace(req.user.id);
    if (!workspace) {
      return res.status(404).json({ error: "Workspace not found" });
    }
    const userId = new mongoose.Types.ObjectId(req.user.id);

    // Check if user is owner or admin
    const isOwner = workspace.user.toString() === userId.toString();
    const isAdmin = workspace.members.some(
      (member) =>
        member.user.toString() === userId.toString() && member.role === "admin"
    );

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        error: "Only workspace owner or admins can remove members",
      });
    }

    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    let userRemoved = false;
    let removedUserName = '';

    const userToRemove = await User.findOne({ email: email.toLowerCase() });

    // First check pendingInvites
    const inviteIndex = workspace.pendingInvites.findIndex(
      (invite) => invite.email.toLowerCase() === email.toLowerCase()
    );

    if (inviteIndex !== -1) {
      workspace.pendingInvites.splice(inviteIndex, 1);
      await workspace.save();
      userRemoved = true; // Mark removal for email sending
      removedUserName = userToRemove?.name || ''; // Get name if user exists

      // Clear workspace references from the invited user if necessary
      try {
        const invitedUser = await User.findOne({ email: email.toLowerCase() });
        if (invitedUser) {
          let userNeedsSave = false;
          if (invitedUser.defaultWorkspace?.toString() === workspace._id.toString()) {
            invitedUser.defaultWorkspace = null;
            userNeedsSave = true;
          }
          if (invitedUser.lastActiveWorkspace?.toString() === workspace._id.toString()) {
            invitedUser.lastActiveWorkspace = null;
            userNeedsSave = true;
          }
          if (userNeedsSave) {
            await invitedUser.save();
          }
        }
      } catch (updateError) {
        console.error(`Error updating user references after removing invite for ${email}:`, updateError);
        // Log error but continue, as the invite was successfully removed
      }

      // Send revocation email for removed invite
      try {
        await sendWorkspaceRevocationEmail(email, workspace.name, removedUserName);
        console.log(`Workspace revocation email sent to ${email} for removed invite.`);
      } catch (emailError) {
        console.error(`Failed to send workspace revocation email for invite ${email}:`, emailError);
      }

      return res.json({ success: true, message: "Invitation removed" });
    }

    // If not in pendingInvites, proceed with member removal
    if (!userToRemove) {
      return res.status(404).json({ error: "User not found" });
    }

    // Prevent removing the workspace owner
    if (userToRemove._id.toString() === workspace.user.toString()) {
      return res.status(403).json({
        error: "Cannot remove workspace owner",
      });
    }

    // If admin (not owner), prevent removing other admins
    if (!isOwner) {
      const isTargetAdmin = workspace.members.some(
        (member) =>
          member.user.toString() === userToRemove._id.toString() &&
          member.role === "admin"
      );
      if (isTargetAdmin) {
        return res.status(403).json({
          error: "Admins cannot remove other admins",
        });
      }
    }

    const memberIndex = workspace.members.findIndex(
      (member) => member.user.toString() === userToRemove._id.toString()
    );

    if (memberIndex === -1) {
      return res.status(404).json({ error: "User not found in workspace" });
    }

    workspace.members.splice(memberIndex, 1);
    await workspace.save();
    userRemoved = true; // Mark removal for email sending
    removedUserName = userToRemove.name || ''; // Get name from user object

    // Clear workspace references from the removed member if necessary
    try {
      let userNeedsSave = false;
      if (userToRemove.defaultWorkspace?.toString() === workspace._id.toString()) {
        userToRemove.defaultWorkspace = null;
        userNeedsSave = true;
      }
      if (userToRemove.lastActiveWorkspace?.toString() === workspace._id.toString()) {
        userToRemove.lastActiveWorkspace = null;
        userNeedsSave = true;
      }
      if (userNeedsSave) {
        await userToRemove.save();
      }
    } catch (updateError) {
      console.error(`Error updating user references after removing member ${userToRemove.email}:`, updateError);
      // Log error but continue, as the member was successfully removed
    }

    // Send revocation email for removed member
    try {
      await sendWorkspaceRevocationEmail(email, workspace.name, removedUserName);
      console.log(`Workspace revocation email sent to ${email} for removed member.`);
    } catch (emailError) {
      console.error(`Failed to send workspace revocation email for member ${email}:`, emailError);
    }

    res.json({ success: true, message: "User removed from workspace" });
  } catch (err) {
    console.error("Error in /delete-user:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /workspace
router.post("/", async (req, res) => {
  try {
    const { workspaceName, timezone } = req.body;
    console.log("Workspace creation request:", req.body);

    if (!workspaceName || !timezone) {
      return res.status(400).json({ error: "Name and timezone are required" });
    }

    // Use the service function to create the workspace
    const savedWorkspace = await createWorkspace(
        req.user.id, 
        workspaceName, 
        timezone
    );

    // Update user's lastActiveWorkspace
    try {
        await User.findByIdAndUpdate(req.user.id, {
            lastActiveWorkspace: savedWorkspace._id,
        });
         console.log(`Set lastActiveWorkspace for user ${req.user.id} to new workspace ${savedWorkspace._id}`);
    } catch(userUpdateError) {
         console.error(`Failed to update lastActiveWorkspace for user ${req.user.id} after creating workspace ${savedWorkspace._id}:`, userUpdateError);
         // Log error but continue, workspace creation was successful
    }
   

    res.status(201).json({
      success: true,
      message: "Workspace created successfully",
      workspace: savedWorkspace.toJSON(), // Use toJSON() if you applied it in schema
    });
  } catch (err) {
     // Catch errors from createWorkspace or User.findByIdAndUpdate
    console.error("Error during workspace creation endpoint:", err);
    res.status(500).json({ error: err.message || "Failed to create workspace" });
  }
});

// GET /workspace/credit-balance
router.get("/credit-balance", async (req, res) => {
  try {
    const workspace = await verifyWorkspace(req.user.id);
    if (!workspace) {
      return res.status(404).json({ error: "Workspace not found" });
    }

    const creditInfo = await calculateCreditBalance(workspace);
    
    // Return error if no credits available and not configured
    // Check both totalAllocatedCredits and billingConfigured to ensure we only error when there are truly no credits
    if (!creditInfo.billingConfigured && (!creditInfo.totalAllocatedCredits || creditInfo.totalAllocatedCredits === 0)) {
      return res.status(400).json({ 
        error: "Billing not configured for this workspace and no one-time credits available."
      });
    }
    
    res.json(creditInfo);

  } catch (err) {
    console.error("Error fetching credit balance:", err);
    // Return a basic response rather than error to avoid breaking the frontend
    res.status(200).json({
      billingConfigured: false,
      totalAllocatedCredits: 0,
      totalUsedCredits: 0,
      totalRemainingCredits: 0,
      error: "Could not calculate credit balance"
    });
  }
});

// POST /workspace/validate-twilio-credentials
router.post("/validate-twilio-credentials", async (req, res) => {
    const { providedSid, providedToken } = req.body;

    if (!providedSid || !providedToken) {
        return res.status(400).json({
            isValid: false,
            savedToWorkspace: false,
            errorCode: "MISSING_CREDENTIALS",
            message: "Both SID (Account SID or API Key SID) and Token (Auth Token or API Key Secret) are required."
        });
    }

    let client;
    let validationAttemptType = "UNKNOWN";
    let activeWorkspace;

    try {
        activeWorkspace = await verifyWorkspace(req.user.id);
        if (!activeWorkspace) {
            // If we can't find an active workspace, we can still validate, but not save.
            // This case will be handled after successful validation if saving is attempted.
            console.warn(`User ${req.user.id} validated Twilio credentials but no active workspace found to save to.`);
        }

        if (providedSid.startsWith("AC")) {
            validationAttemptType = "AUTH_TOKEN";
            client = twilio(providedSid, providedToken);
            await client.balance.fetch(); // Test call

            if (activeWorkspace) {
                activeWorkspace.twilioSID = providedSid;
                activeWorkspace.apiKey = providedToken; // Assuming apiKey stores the Auth Token
                await activeWorkspace.save();
                return res.json({
                    isValid: true,
                    savedToWorkspace: true,
                    type: "AUTH_TOKEN",
                    message: "Successfully validated as Account SID and Auth Token. Credentials saved to your active workspace.",
                    details: { accountSid: providedSid }
                });
            } else {
                return res.json({
                    isValid: true,
                    savedToWorkspace: false,
                    type: "AUTH_TOKEN",
                    message: "Successfully validated as Account SID and Auth Token, but no active workspace found to save credentials to.",
                    details: { accountSid: providedSid }
                });
            }

        } else if (providedSid.startsWith("SK")) {
            validationAttemptType = "API_KEY";
            client = twilio(providedSid, providedToken);
            await client.request({ method: "GET", uri: "https://api.twilio.com/2010-04-01/Accounts.json?PageSize=1" });

            if (activeWorkspace) {
                activeWorkspace.twilioSID = providedSid; // Or however you distinguish API Key SID in your model
                activeWorkspace.apiKey = providedToken;    // Assuming apiKey stores the API Key Secret
                await activeWorkspace.save();
                return res.json({
                    isValid: true,
                    savedToWorkspace: true,
                    type: "API_KEY",
                    message: "Successfully validated as API Key SID and API Key Secret. Credentials saved to your active workspace.",
                    details: { apiKeySid: providedSid }
                });
            } else {
                return res.json({
                    isValid: true,
                    savedToWorkspace: false,
                    type: "API_KEY",
                    message: "Successfully validated as API Key SID and API Key Secret, but no active workspace found to save credentials to.",
                    details: { apiKeySid: providedSid }
                });
            }

        } else {
            return res.status(400).json({
                isValid: false,
                savedToWorkspace: false,
                errorCode: "INVALID_SID_FORMAT",
                message: "The provided SID does not appear to be a valid Twilio Account SID (starting with AC) or API Key SID (starting with SK)."
            });
        }
    } catch (error) {
        console.error(`Error during Twilio credential validation/saving (attempted as ${validationAttemptType}):`, error.message);
        let errorMessage = "Invalid credentials, failed to connect to Twilio, or failed to save to workspace.";
        let errorCode = "VALIDATION_OR_SAVE_FAILED";
        let httpStatus = 500;

        if (error.message && error.message.includes("verifyWorkspace")) { // Error from verifyWorkspace itself
             errorMessage = "Could not retrieve active workspace to save credentials.";
             errorCode = "WORKSPACE_NOT_FOUND_FOR_SAVE";
             httpStatus = 404; 
        } else if (error.status === 401) { // Twilio auth error
            errorMessage = `Authentication failed with Twilio when validating as ${validationAttemptType}. The SID or Token is likely incorrect. Credentials not saved.`;
            errorCode = "TWILIO_AUTH_FAILED";
            httpStatus = error.status;
        } else if (error.name === 'ValidationError') { // Mongoose validation error on save
            errorMessage = `Failed to save credentials to workspace due to validation issues: ${error.message}`;
            errorCode = "WORKSPACE_SAVE_VALIDATION_ERROR";
            httpStatus = 400;
        } else if (error.message) { // Other Twilio or general errors
            errorMessage = `Twilio API error or other issue (during ${validationAttemptType} validation/saving): ${error.message}`;
            if (error.code) {
                 errorMessage += ` (Code: ${error.code})`;
            }
        }
        
        return res.status(httpStatus).json({ 
            isValid: false,
            savedToWorkspace: false,
            errorCode: errorCode,
            type: validationAttemptType, 
            message: errorMessage,
            details: error.moreInfo || error.message 
        });
    }
});

// POST /workspace/add-onetime-credits
// Allows adding bonus/top-up credits to the current workspace
router.post("/add-onetime-credits", async (req, res) => {
  try {
    const workspace = await verifyWorkspace(req.user.id);
    if (!workspace) {
      return res.status(404).json({ error: "Workspace not found" });
    }

    // Authorization: Only workspace owner can add credits (adjust if needed)
    if (workspace.user.toString() !== req.user.id) {
      return res.status(403).json({ error: "Only the workspace owner can add credits." });
    }

    const { amount, description, expiresAt } = req.body;

    // Validation
    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: "Invalid credit amount. Must be a positive number." });
    }
    if (!description || typeof description !== 'string' || description.trim() === '') {
        return res.status(400).json({ error: "Description is required." });
    }
    let expiryDate = null;
    if (expiresAt) {
        expiryDate = new Date(expiresAt);
        if (isNaN(expiryDate.getTime())) {
             return res.status(400).json({ error: "Invalid expiresAt date format." });
        }
    }

    // Add the credit entry
    const newCredit = {
        amount: amount,
        description: description.trim(),
        addedAt: new Date()
    };
    if (expiryDate) {
        newCredit.expiresAt = expiryDate;
    }

    workspace.oneTimeCredits.push(newCredit);
    await workspace.save();

    res.status(200).json({ 
        success: true, 
        message: `Successfully added ${amount} one-time credits.`,
        workspace: workspace.toJSON() // Return updated workspace
    });

  } catch (err) {
    console.error("Error adding one-time credits:", err);
    res.status(500).json({ error: "Failed to add one-time credits", details: err.message });
  }
});

// GET /workspace/timezones
// Returns a list of timezones for dropdowns
router.get("/timezones", async (req, res) => {
  try {
    const timezonesPath = path.join(__dirname, '..', 'assets', 'timezones.json');
    const timezonesData = fs.readFileSync(timezonesPath, 'utf8');
    const timezones = JSON.parse(timezonesData);

    const formattedTimezones = timezones.map(tz => ({
      label: tz.text,
      value: tz.value
    }));

    res.json(formattedTimezones);
  } catch (err) {
    console.error("Error fetching timezones:", err);
    res.status(500).json({ error: "Failed to fetch timezones" });
  }
});

module.exports = router;
