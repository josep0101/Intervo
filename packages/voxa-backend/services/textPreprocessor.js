// Text preprocessing utilities for TTS services

// Currency symbol to spoken name mapping
function preprocessCurrencySymbols(text) {
  const currencyMap = {
    '$': ' dollar ',
    '€': ' euro ',
    '£': ' pound ',
    '¥': ' yen ',
    '₩': ' won ',
    '₹': ' rupee ',
    '₽': ' ruble ',
    '₡': ' colon ',
    '₦': ' naira ',
    '₪': ' shekel ',
    '₫': ' dong ',
    '₴': ' hryvnia ',
    '₨': ' rupee ',
    '₵': ' cedi ',
    '₯': ' drachma ',
    '₮': ' tugrik ',
    '₭': ' kip ',
    '₰': ' pfennig ',
    '¢': ' cent ',
    '₢': ' cruzeiro ',
    '₣': ' franc ',
    '₤': ' lira ',
    '₥': ' mill ',
    '₧': ' peseta ',
    '₱': ' peso ',
    '₲': ' guarani ',
    '₳': ' austral ',
    '₶': ' livre tournois ',
    '₷': ' spesmilo ',
    '₸': ' tenge ',
    '₺': ' lira ',
    '₻': ' nordic mark ',
    '₼': ' manat ',
    '₾': ' lari ',
    '₿': ' bitcoin ',
    '＄': ' dollar '
  };

  let processedText = text;
  
  // Replace each currency symbol with its spoken name
  for (const [symbol, spokenName] of Object.entries(currencyMap)) {
    const regex = new RegExp(symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    processedText = processedText.replace(regex, spokenName);
  }
  
  // Clean up extra spaces
  processedText = processedText.replace(/\s+/g, ' ').trim();
  
  return processedText;
}

// Main preprocessing function that applies all preprocessing steps
function preprocessTextForTTS(text) {
  let processedText = text;
  let changes = [];
  
  // Apply currency symbol preprocessing
  const currencyProcessed = preprocessCurrencySymbols(processedText);
  if (currencyProcessed !== processedText) {
    changes.push('currency_symbols');
    processedText = currencyProcessed;
  }
  
  // Future preprocessing functions can be added here
  // Example:
  // const numbersProcessed = preprocessNumbers(processedText);
  // if (numbersProcessed !== processedText) {
  //   changes.push('numbers');
  //   processedText = numbersProcessed;
  // }
  
  return {
    text: processedText,
    changes: changes,
    hasChanges: changes.length > 0
  };
}

module.exports = {
  preprocessCurrencySymbols,
  preprocessTextForTTS
}; 