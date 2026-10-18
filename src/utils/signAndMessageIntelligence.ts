import { 
  ChatMessage, 
  AgentInstance, 
  AgentRole, 
  SignData, 
  SignText, 
  BotCognitiveMessageEvaluation, 
  MessageEvaluationRecord,
  WoodType 
} from "../types";

/**
 * Parses raw 4-line front & back sign text to extract target recipient, command, and coordinate parameters.
 */
export function parseSignText(frontLines: string[], backLines: string[] = ["", "", "", ""]): {
  targetRecipient: string;
  parsedInstruction: string;
  commandType: "mine" | "build" | "guard" | "scout" | "assist" | "status" | "regroup" | "general";
  coords?: [number, number, number];
} {
  const fullText = [...frontLines, ...backLines].map(l => l.trim()).filter(Boolean).join(" ");
  const line0 = (frontLines[0] || "").trim();
  const line1 = (frontLines[1] || "").trim();
  const line2 = (frontLines[2] || "").trim();
  const line3 = (frontLines[3] || "").trim();

  let targetRecipient = "All";
  // Check if Line 1 has bracketed target e.g. [Gemini], [Builder], [Miner], [All Bots], [Outpost]
  const bracketMatch = line0.match(/\[(.*?)\]/);
  if (bracketMatch) {
    targetRecipient = bracketMatch[1].trim();
  } else if (line0.toLowerCase().startsWith("to:") || line0.toLowerCase().startsWith("for:")) {
    targetRecipient = line0.slice(3).trim();
  } else if (line0.length > 0 && line0.length < 20) {
    targetRecipient = line0;
  }

  // Parse Coordinates if present e.g. "120 64 30" or "X=120 Z=30" or "@ [120, 64, 30]"
  let coords: [number, number, number] | undefined = undefined;
  const coordRegex = /(-?\d+)[,\s]+(-?\d+)[,\s]+(-?\d+)/;
  const matchCoords = fullText.match(coordRegex);
  if (matchCoords) {
    coords = [parseInt(matchCoords[1], 10), parseInt(matchCoords[2], 10), parseInt(matchCoords[3], 10)];
  }

  // Determine command type
  const lower = fullText.toLowerCase();
  let commandType: "mine" | "build" | "guard" | "scout" | "assist" | "status" | "regroup" | "general" = "general";
  if (lower.includes("mine") || lower.includes("dig") || lower.includes("quarry") || lower.includes("iron") || lower.includes("diamond")) {
    commandType = "mine";
  } else if (lower.includes("build") || lower.includes("portal") || lower.includes("wall") || lower.includes("schematic") || lower.includes("house")) {
    commandType = "build";
  } else if (lower.includes("guard") || lower.includes("defend") || lower.includes("secure") || lower.includes("perimeter") || lower.includes("danger")) {
    commandType = "guard";
  } else if (lower.includes("scout") || lower.includes("explore") || lower.includes("recon") || lower.includes("survey")) {
    commandType = "scout";
  } else if (lower.includes("regroup") || lower.includes("base") || lower.includes("spawn") || lower.includes("return")) {
    commandType = "regroup";
  } else if (lower.includes("status") || lower.includes("report") || lower.includes("check")) {
    commandType = "status";
  } else if (lower.includes("assist") || lower.includes("help")) {
    commandType = "assist";
  }

  const instructionBody = [line1, line2, line3].filter(Boolean).join(" ");
  const parsedInstruction = instructionBody || line0 || "Sign Notice";

  return {
    targetRecipient,
    parsedInstruction,
    commandType,
    coords
  };
}

/**
 * Cognitive Message Evaluator:
 * Takes any incoming chat/system message and runs independent evaluation for EACH bot in the swarm.
 */
export function evaluateMessageForSwarm(
  message: ChatMessage,
  agents: AgentInstance[]
): MessageEvaluationRecord {
  const evaluations: Record<string, BotCognitiveMessageEvaluation> = {};
  const text = message.text.toLowerCase().trim();
  const rawText = message.text;
  let winningAgentId: string | undefined = undefined;
  let highestConfidence = 0;

  for (const agent of agents) {
    const nameLower = agent.name.toLowerCase();
    const roleLower = agent.role.toLowerCase();

    let isForMe = false;
    let confidence = 0;
    let matchType: BotCognitiveMessageEvaluation["matchType"] = "unrelated";
    let reason = "Message does not reference my name, role, or immediate task.";
    let formulatedAction: string | undefined = undefined;
    let replyIntent: string | undefined = undefined;
    let status: BotCognitiveMessageEvaluation["status"] = "standby";

    // 1. Direct Name Match (e.g. "@Gemini", "Gemini come here", "!build Alpha-Builder")
    if (
      text.includes(`@${nameLower}`) ||
      text.includes(nameLower) ||
      rawText.includes(agent.name)
    ) {
      isForMe = true;
      confidence = 0.98;
      matchType = "direct_name";
      reason = `Explicitly addressed to my username '${agent.name}'.`;
      formulatedAction = `Executing priority directive directly assigned to ${agent.name}.`;
      replyIntent = `Acknowledge player command: "On it, ${message.sender}!"`;
      status = "active";
    }
    // 2. Role Match (e.g. "builders assemble portal", "miners dig coal", "guards protect spawn")
    else if (
      (roleLower === "builder" && (text.includes("builder") || text.includes("build") || text.includes("portal") || text.includes("schematic") || text.includes("wall"))) ||
      (roleLower === "miner" && (text.includes("miner") || text.includes("mine") || text.includes("dig") || text.includes("quarry") || text.includes("iron") || text.includes("diamond"))) ||
      (roleLower === "scout" && (text.includes("scout") && !text.includes("miner")) || text.includes("explore") || text.includes("recon") || text.includes("coords") || text.includes("map")) ||
      (roleLower === "guard" && (text.includes("guard") || text.includes("defend") || text.includes("protect") || text.includes("kill") || text.includes("zombie") || text.includes("security"))) ||
      (roleLower === "assistant" && (text.includes("help") || text.includes("assist") || text.includes("status") || text.includes("craft")))
    ) {
      isForMe = true;
      confidence = 0.85;
      matchType = "role_match";
      reason = `Matches my designated swarm role '${agent.role}'.`;
      formulatedAction = `Assume primary lead for role-specific task '${agent.role}'.`;
      replyIntent = `Radio broadcast: "${agent.name} (${agent.role}) accepting task."`;
      status = "active";
    }
    // 3. Swarm Broadcast (e.g. "@all", "all bots", "swarm", "everyone regroup", "!regroup")
    else if (
      text.includes("@all") ||
      text.includes("all bots") ||
      text.includes("everyone") ||
      text.includes("swarm") ||
      text.includes("team") ||
      text.includes("!regroup") ||
      text.includes("!halt") ||
      text.includes("!status")
    ) {
      isForMe = true;
      confidence = 0.90;
      matchType = "broadcast";
      reason = `Fleet-wide swarm broadcast targeting all active bots.`;
      formulatedAction = `Synchronizing state with collective swarm directive.`;
      replyIntent = `Swarm sync ack from ${agent.name}.`;
      status = "executing";
    }
    // 4. Proximity / Contextual Match (e.g. "here", "help", exclamation command)
    else if (text.startsWith("!") || text.startsWith("/")) {
      // General command without explicit target
      if (agent.role === "Assistant" || agent.id === agents[0]?.id) {
        isForMe = true;
        confidence = 0.70;
        matchType = "context_proximity";
        reason = `Assigned to Primary Swarm Leader '${agent.name}' as default coordinator.`;
        formulatedAction = `Dispatch command to swarm members or execute directly.`;
        replyIntent = `Leader reply: "Processing ${rawText}."`;
        status = "active";
      } else {
        isForMe = false;
        confidence = 0.25;
        matchType = "context_proximity";
        reason = `Delegated to swarm leader ${agents[0]?.name || "Leader"} for routing.`;
        status = "delegated";
      }
    } else {
      isForMe = false;
      confidence = 0.10;
      matchType = "unrelated";
      reason = `General chat dialogue not requiring ${agent.name}'s intervention.`;
      status = "standby";
    }

    evaluations[agent.id] = {
      agentId: agent.id,
      agentName: agent.name,
      agentRole: agent.role,
      isForMe,
      confidence,
      matchType,
      reason,
      formulatedAction,
      replyIntent,
      status
    };

    if (isForMe && confidence > highestConfidence) {
      highestConfidence = confidence;
      winningAgentId = agent.id;
    }
  }

  return {
    messageId: message.id,
    rawText: message.text,
    sender: message.sender,
    timestamp: message.timestamp,
    channel: message.channel,
    evaluations,
    winningAgentId
  };
}

/**
 * Sign Evaluator for Multi-Bot Swarm:
 * Decides which bot reacts to the sign, what action to take, and what response sign to place.
 */
export function evaluateSignForSwarm(
  sign: SignData,
  agents: AgentInstance[]
): {
  selectedAgent: AgentInstance;
  actionPlan: string;
  responseSignText: [string, string, string, string];
  chatReply: string;
} {
  const parsed = parseSignText(sign.front.messages, sign.back.messages);
  const targetLower = parsed.targetRecipient.toLowerCase();

  // Find best bot match
  let matchedAgent = agents.find(a => 
    a.name.toLowerCase().includes(targetLower) ||
    targetLower.includes(a.name.toLowerCase())
  );

  if (!matchedAgent) {
    if (parsed.commandType === "mine") {
      matchedAgent = agents.find(a => a.role === "Miner") || agents[0];
    } else if (parsed.commandType === "build") {
      matchedAgent = agents.find(a => a.role === "Builder") || agents[0];
    } else if (parsed.commandType === "guard") {
      matchedAgent = agents.find(a => a.role === "Guard") || agents[0];
    } else if (parsed.commandType === "scout") {
      matchedAgent = agents.find(a => a.role === "Scout") || agents[0];
    } else {
      matchedAgent = agents.find(a => a.role === "Assistant") || agents[0];
    }
  }

  const selectedAgent = matchedAgent || agents[0];
  const coordsStr = parsed.coords ? `[${parsed.coords.join(", ")}]` : `[${sign.x + 2}, ${sign.y}, ${sign.z + 1}]`;

  let actionPlan = "";
  let responseSignText: [string, string, string, string] = [
    `[${selectedAgent.name}]`,
    "STATUS: ACCEPTED",
    `TASK: ${parsed.commandType.toUpperCase()}`,
    "TICK: ACTIVE"
  ];
  let chatReply = "";

  switch (parsed.commandType) {
    case "mine":
      actionPlan = `Navigate to ${coordsStr}, equip diamond pickaxe, and excavate target resource node.`;
      responseSignText = [
        `[${selectedAgent.name}]`,
        "MINING DEPOT",
        "STATUS: EXCAVATING",
        "Y-LEVEL: 16"
      ];
      chatReply = `[${selectedAgent.name}] Read sign at [${sign.x}, ${sign.y}, ${sign.z}]: Commencing mining operations at ${coordsStr}.`;
      break;

    case "build":
      actionPlan = `Verify schematic materials, position at ${coordsStr}, and place structured block sequence.`;
      responseSignText = [
        `[${selectedAgent.name}]`,
        "CONSTRUCTION SITE",
        "SCHEMATIC: ACTIVE",
        "FRAME: IN PROGRESS"
      ];
      chatReply = `[${selectedAgent.name}] Read sign at [${sign.x}, ${sign.y}, ${sign.z}]: Construction order acknowledged. Building now.`;
      break;

    case "guard":
      actionPlan = `Patrol perimeter of radius 24 blocks around ${coordsStr} and engage hostile entities.`;
      responseSignText = [
        `[${selectedAgent.name}]`,
        "SECURITY POST",
        "PERIMETER: SECURE",
        "THREATS: 0"
      ];
      chatReply = `[${selectedAgent.name}] Read sign at [${sign.x}, ${sign.y}, ${sign.z}]: Sentry post established. Area under AI defense.`;
      break;

    case "scout":
      actionPlan = `Conduct 360-degree radar survey around ${coordsStr} and log discovered waypoints to JSON Map.`;
      responseSignText = [
        `[${selectedAgent.name}]`,
        "SCOUT WAYPOINT",
        "SURVEY COMPLETE",
        "CHUNKS: MAPPED"
      ];
      chatReply = `[${selectedAgent.name}] Read sign at [${sign.x}, ${sign.y}, ${sign.z}]: Recon mission initiated.`;
      break;

    case "regroup":
      actionPlan = `Halt current activity, pathfind directly to rally point ${coordsStr}, and sync inventory with swarm leader.`;
      responseSignText = [
        `[${selectedAgent.name}]`,
        "RALLY POINT",
        "SWARM ASSEMBLED",
        "STANDBY: READY"
      ];
      chatReply = `[${selectedAgent.name}] Read sign at [${sign.x}, ${sign.y}, ${sign.z}]: Rallying to marker coordinates.`;
      break;

    default:
      actionPlan = `Inspect sign content: "${parsed.parsedInstruction}" and update swarm mission log.`;
      responseSignText = [
        `[${selectedAgent.name}]`,
        "SIGN LOGGED",
        "INTENT: PROCESSED",
        "TIME: SYNCHRONIZED"
      ];
      chatReply = `[${selectedAgent.name}] Read sign at [${sign.x}, ${sign.y}, ${sign.z}]: "${parsed.parsedInstruction}" processed.`;
      break;
  }

  return {
    selectedAgent,
    actionPlan,
    responseSignText,
    chatReply
  };
}

/**
 * Seed realistic world signs for instant exploration and testing
 */
export const INITIAL_WORLD_SIGNS: SignData[] = [
  {
    id: "sign_spawn_instruction",
    x: 102,
    y: 64,
    z: 21,
    blockType: "minecraft:oak_sign",
    wood: "oak",
    isWallSign: false,
    facing: "north",
    isWaxed: true,
    front: {
      messages: [
        "[Builder-Bot]",
        "BUILD PORTAL",
        "AT 100 64 20",
        "USE OBSIDIAN"
      ],
      hasGlowingText: true,
      color: "cyan"
    },
    back: {
      messages: [
        "PRIORITY: HIGH",
        "BY: Steve",
        "FLINT & STEEL",
        "READY"
      ]
    },
    placedBy: "Player (Steve)",
    timestamp: Date.now() - 1000 * 60 * 12,
    targetRecipient: "Builder-Bot",
    parsedInstruction: "BUILD PORTAL AT 100 64 20 USE OBSIDIAN",
    reactionStatus: "reacted",
    reactingAgentId: "agent_alpha",
    reactionLog: "Alpha-Builder read sign and initiated Nether Portal assembly frame."
  },
  {
    id: "sign_mining_quarry",
    x: 94,
    y: 63,
    z: 32,
    blockType: "minecraft:spruce_wall_sign",
    wood: "spruce",
    isWallSign: true,
    facing: "west",
    isWaxed: false,
    front: {
      messages: [
        "[Miner-Bot]",
        "MINE IRON & COAL",
        "AT 90 40 30",
        "DEPOSIT IN CHEST"
      ]
    },
    back: {
      messages: ["", "", "", ""]
    },
    placedBy: "Player (Steve)",
    timestamp: Date.now() - 1000 * 60 * 8,
    targetRecipient: "Miner-Bot",
    parsedInstruction: "MINE IRON & COAL AT 90 40 30 DEPOSIT IN CHEST",
    reactionStatus: "executing",
    reactingAgentId: "agent_gamma",
    reactionLog: "Gamma-Miner is excavating cobblestone & iron ore vein at Y=40."
  },
  {
    id: "sign_scout_warning",
    x: 108,
    y: 64,
    z: 24,
    blockType: "minecraft:cherry_sign",
    wood: "cherry",
    isWallSign: false,
    facing: "south",
    isWaxed: true,
    front: {
      messages: [
        "[DANGER ZONE]",
        "ZOMBIE RAIDERS",
        "PATROL: Scout-Bot",
        "KEEP SHIELD UP"
      ],
      hasGlowingText: true,
      color: "red"
    },
    back: {
      messages: [
        "PERIMETER RADIUS: 24",
        "SURVEY FREQ: 5s",
        "AI SENTRY",
        "ACTIVE"
      ]
    },
    placedBy: "Agent (Beta-Scout)",
    timestamp: Date.now() - 1000 * 60 * 5,
    targetRecipient: "Scout-Bot",
    parsedInstruction: "ZOMBIE RAIDERS PATROL: Scout-Bot KEEP SHIELD UP",
    reactionStatus: "reacted",
    reactingAgentId: "agent_beta",
    reactionLog: "Autonomous warning sign placed by Beta-Scout upon detecting hostile zombie entity."
  }
];
