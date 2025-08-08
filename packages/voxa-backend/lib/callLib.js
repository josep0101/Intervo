const { v4: uuidv4 } = require('uuid');

function transformAgentToConfig(agent, existingConversationId = null) {
  const transformedConfig = {
    leadPrompt: agent.prompt,
    sttService: agent.sttSettings.service,
    ttsService: agent.ttsSettings.service,
    introduction: agent.introduction,
    phoneNumber: agent.phoneNumber,
    activityId: agent.activityId,
    conversationId: existingConversationId || uuidv4()
  };

  return transformedConfig;
}   

module.exports = { transformAgentToConfig };