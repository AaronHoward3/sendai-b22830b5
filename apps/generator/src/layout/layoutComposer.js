import {
  listBlockFiles,
  readBlockFile,
  listDividerFiles,
  readDividerFile
} from "../blocks/blockRegistry.js";
import {
  generateHeaderBlock,
  generateFooterBlock
} from "../services/headerFooterBlockService.js";
import { getCachedTemplate, setCachedTemplate } from "../utils/templateCache.js";

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Enhanced randomization with weighted selection for more variation
const pickWeighted = (arr, weights = []) => {
  if (!weights.length || weights.length !== arr.length) {
    return pick(arr); // Fallback to random if no weights provided
  }
  
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let random = Math.random() * totalWeight;
  
  for (let i = 0; i < arr.length; i++) {
    random -= weights[i];
    if (random <= 0) return arr[i];
  }
  
  return arr[arr.length - 1]; // Fallback
};

/**
 * Smart block selection based on content type and context
 */
function analyzeContentContext(brandData, userContext) {
  const context = (userContext || "").toLowerCase();
  const brandName = (brandData?.name || brandData?.brandData?.name || "").toLowerCase();
  
  // Analyze content type
  const isUrgent = /urgent|limited|expires|deadline|flash|quick|now|today|tomorrow/i.test(context);
  const isStory = /story|journey|behind|process|how|why|experience/i.test(context);
  const isFeature = /feature|benefit|advantage|why|because|reason/i.test(context);
  const isSocial = /testimonial|review|customer|love|recommend|trust/i.test(context);
  const isMinimal = /clean|simple|minimal|elegant/i.test(context);
  const isBold = /bold|dramatic|powerful|strong|impact/i.test(context);
  
  // Analyze brand personality
  const isLuxury = /luxury|premium|exclusive|elite|high-end/i.test(brandName + " " + context);
  const isTech = /tech|digital|app|software|innovation/i.test(brandName + " " + context);
  const isFashion = /fashion|style|trend|design|aesthetic/i.test(brandName + " " + context);
  
  return {
    isUrgent,
    isStory,
    isFeature,
    isSocial,
    isMinimal,
    isBold,
    isLuxury,
    isTech,
    isFashion
  };
}

/**
 * Smart block selection based on content analysis
 */
function selectSmartBlocks(availableBlocks, analysis, blockType) {
  if (!availableBlocks.length) return pick(availableBlocks);
  
  // Define block preferences based on analysis
  const preferences = {
    block1: {
      urgent: ["heroOverlayText", "heroBoldStacked"],
      story: ["heroMinimalCentered", "heroNewsletterMinimal"],
      minimal: ["heroMinimalCentered", "heroMinimal1", "heroMinimal2"],
      bold: ["heroBoldStacked", "heroBold1", "heroBold2"],
      luxury: ["heroMinimalCentered", "heroNewsletterMinimal"],
      tech: ["heroSplitImage", "heroOverlayText"],
      fashion: ["heroOverlayText", "heroSplitImage"]
    },
    block2: {
      story: ["contentStoryNarrative", "contentNewsletterStory"],
      feature: ["contentFeatureGrid", "contentBenefitsList"],
      social: ["contentBenefitsList"],
      minimal: ["contentMinimal1", "contentMinimal2"],
      bold: ["contentBold1", "contentBold2"]
    },
    block3: {
      urgent: ["ctaUrgencyTimer", "ctaBold1", "ctaBold2"],
      social: ["ctaSocialProof", "ctaNewsletterSubscribe"],
      minimal: ["ctaMinimal1", "ctaMinimal2"],
      bold: ["ctaBold1", "ctaBold2"],
      dual: ["ctaDualButton"]
    }
  };
  
  const blockPrefs = preferences[blockType] || {};
  
  // Find preferred blocks that exist
  const preferredBlocks = [];
  for (const [key, blocks] of Object.entries(blockPrefs)) {
    if (analysis[key]) {
      preferredBlocks.push(...blocks);
    }
  }
  
  // Filter to only blocks that actually exist
  const availablePreferred = preferredBlocks.filter(block => 
    availableBlocks.some(available => available.includes(block))
  );
  
  // Add more randomization - sometimes use preferred, sometimes explore
  const usePreferred = Math.random() < 0.9; // 70% chance to use preferred blocks
  
  if (availablePreferred.length > 0 && usePreferred) {
    return pick(availablePreferred);
  }
  
  // 30% chance to explore all available blocks for more variation
  return pick(availableBlocks);
}

/**
 * chooseLayout now **does not require block2** for Promotion.
 * Instead, it flags that we'll inject the [[PRODUCT_SECTION]] token in composeBaseMjml.
 */
export async function chooseLayout(emailType, aesthetic = "minimal_clean", brandData = {}, userContext = "") {
  const isProductType = emailType === "Promotion";

  // Always need block1 & block3
  const [b1, b3] = await Promise.all([
    listBlockFiles(emailType, aesthetic, "block1"),
    listBlockFiles(emailType, aesthetic, "block3"),
  ]);

  if (!b1.length || !b3.length) {
    throw new Error(
      `Missing blocks: block1(${b1.length}) block3(${b3.length}) for ${emailType}/${aesthetic}`
    );
  }

  // For non-product types, we still pick a real block2 from disk
  let b2 = [];
  if (!isProductType) {
    b2 = await listBlockFiles(emailType, aesthetic, "block2");
    if (!b2.length) {
      throw new Error(
        `Missing blocks: block2(${b2.length}) for ${emailType}/${aesthetic}`
      );
    }
  }

  // Smart block selection based on content analysis
  const analysis = analyzeContentContext(brandData, userContext);
  
  const selectedBlock1 = selectSmartBlocks(b1, analysis, "block1");
  const selectedBlock2 = isProductType ? null : selectSmartBlocks(b2, analysis, "block2");
  const selectedBlock3 = selectSmartBlocks(b3, analysis, "block3");

  return {
    layoutId: `${emailType}-${aesthetic}-${Date.now()}`,
    block1: selectedBlock1,
    // if product type, we won't use a physical block2 file
    block2: selectedBlock2,
    block3: selectedBlock3,
    useProductSectionToken: isProductType, // <- important flag
    emailType,
    aesthetic,
    analysis, // Include analysis for debugging
  };
}

/**
 * Dynamic block ordering based on content analysis
 */
function determineBlockOrder(analysis, emailType) {
  // Define different ordering strategies
  const strategies = {
    // For urgent/promotional content: Hero -> Products -> Urgency CTA
    urgent: ["block1", "block2", "block3"],
    
    // For story-driven content: Hero -> Story -> Soft CTA
    story: ["block1", "block2", "block3"],
    
    // For feature-focused content: Hero -> Features -> Benefits CTA
    feature: ["block1", "block2", "block3"],
    
    // For social proof content: Hero -> Social Proof -> Testimonial CTA
    social: ["block1", "block2", "block3"],
    
    // For minimal content: Clean hero -> Simple content -> Subtle CTA
    minimal: ["block1", "block2", "block3"],
    
    // For bold content: Impact hero -> Bold content -> Strong CTA
    bold: ["block1", "block2", "block3"]
  };
  
  // Determine strategy based on analysis
  if (analysis.isUrgent) return strategies.urgent;
  if (analysis.isStory) return strategies.story;
  if (analysis.isFeature) return strategies.feature;
  if (analysis.isSocial) return strategies.social;
  if (analysis.isMinimal) return strategies.minimal;
  if (analysis.isBold) return strategies.bold;
  
  // Default ordering
  return strategies.story;
}

/**
 * composeBaseMjml will:
 *  - Generate header and footer blocks with brand data
 *  - Read block1 + block3 as usual
 *  - For product types, **insert [[PRODUCT_SECTION]]** instead of reading block2
 *  - For other types, read block2 from disk normally
 *  - Insert divider elements between blocks when available
 *  - Use dynamic block ordering based on content analysis
 */
export async function composeBaseMjml(emailType, aesthetic, layout, brandData = {}) {
  const dividerNames = await listDividerFiles(); // filenames only
  // Add more variation in divider selection - sometimes use different dividers, sometimes same
  const useDifferentDividers = Math.random() < 0.6; // 60% chance for different dividers
  const dividerName1 = dividerNames.length ? pick(dividerNames) : null;
  const dividerName2 = dividerNames.length ? 
    (useDifferentDividers ? pick(dividerNames.filter(d => d !== dividerName1)) : dividerName1) : null;

  // Generate header and footer blocks with brand data
  const [headerBlock, footerBlock] = await Promise.all([
    generateHeaderBlock(aesthetic, brandData),
    generateFooterBlock(aesthetic, brandData)
  ]);

  // Read required blocks
  const [b1, b3, divider1, divider2] = await Promise.all([
    readBlockFile(emailType, aesthetic, "block1", layout.block1),
    readBlockFile(emailType, aesthetic, "block3", layout.block3),
    dividerName1 ? readDividerFile(dividerName1) : Promise.resolve(""),
    dividerName2 ? readDividerFile(dividerName2) : Promise.resolve(""),
  ]);

  // Determine block2 content
  let b2Content = "";
  let b2Label = "";
  if (layout.useProductSectionToken) {
    // Always inject token for Promotion
    b2Content = "[[PRODUCT_SECTION]]";
    b2Label = "block2/product-section.txt";
  } else {
    // Non-product types still read a real block2 file
    b2Content = await readBlockFile(emailType, aesthetic, "block2", layout.block2);
    b2Label = layout.block2;
  }

  const mark = (name) => `\n<mj-raw>\n  <!-- Blockfile: ${name} -->\n</mj-raw>\n`;

  // Dynamic block ordering based on analysis
  const blockOrder = determineBlockOrder(layout.analysis || {}, emailType);
  
  // Create block content map
  const blockContents = {
    block1: { content: b1.trim(), label: layout.block1 },
    block2: { content: b2Content.trim(), label: b2Label },
    block3: { content: b3.trim(), label: layout.block3 }
  };

  // Build pieces array based on dynamic ordering
  const pieces = [mark("header-block") + headerBlock.trim()];
  
  blockOrder.forEach((blockType, index) => {
    const blockData = blockContents[blockType];
    if (blockData && blockData.content) {
      pieces.push(mark(blockData.label) + blockData.content);
      
      // Add divider between blocks (but not after the last block)
      if (index < blockOrder.length - 1) {
        const divider = index === 0 ? divider1 : divider2;
        if (divider) {
          pieces.push(mark(`divider/${dividerName1 || dividerName2}`) + divider.trim());
        }
      }
    }
  });
  
  pieces.push(mark("footer-block") + footerBlock.trim());

  return `<mjml>
  <mj-body>
${pieces.join("\n\n")}
  </mj-body>
</mjml>`;
}
