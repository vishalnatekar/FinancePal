// Transaction categorization service
// This implements basic rule-based categorization with the ability to learn from user overrides

interface CategoryResult {
  category: string;
  confidence: number;
}

interface CategoryRule {
  keywords: string[];
  category: string;
  weight: number;
}

// Default categorization rules
const DEFAULT_RULES: CategoryRule[] = [
  // Income
  { keywords: ["salary", "payroll", "deposit", "income", "wage"], category: "Income", weight: 1.0 },
  
  // Groceries
  { keywords: ["whole foods", "trader joe", "safeway", "kroger", "walmart", "target", "grocery"], category: "Groceries", weight: 0.9 },
  
  // Transportation
  { keywords: ["shell", "exxon", "chevron", "gas", "fuel", "uber", "lyft", "metro", "parking"], category: "Transportation", weight: 0.9 },
  
  // Entertainment
  { keywords: ["netflix", "spotify", "hulu", "disney", "movie", "theater", "concert", "entertainment"], category: "Entertainment", weight: 0.9 },
  
  // Dining
  { keywords: ["restaurant", "cafe", "coffee", "starbucks", "mcdonalds", "burger", "pizza", "doordash", "grubhub"], category: "Dining", weight: 0.8 },
  
  // Shopping
  { keywords: ["amazon", "ebay", "mall", "store", "shop", "retail"], category: "Shopping", weight: 0.7 },
  
  // Bills & Utilities
  { keywords: ["electric", "water", "gas", "internet", "phone", "utility", "bill", "insurance"], category: "Bills & Utilities", weight: 0.9 },
  
  // Healthcare
  { keywords: ["hospital", "doctor", "pharmacy", "medical", "health", "dental"], category: "Healthcare", weight: 0.9 },
  
  // Banking
  { keywords: ["fee", "charge", "interest", "transfer", "atm"], category: "Banking", weight: 0.8 },
];

class CategorizationService {
  private rules: CategoryRule[] = [...DEFAULT_RULES];
  private userOverrides: { [key: string]: string } = {};

  async categorizeTransaction(description: string, amount: number): Promise<CategoryResult> {
    const cleanDescription = description.toLowerCase().trim();
    
    // Check for exact user overrides first
    const overrideKey = this.generateOverrideKey(cleanDescription);
    if (this.userOverrides[overrideKey]) {
      return {
        category: this.userOverrides[overrideKey],
        confidence: 1.0,
      };
    }

    // Apply rules-based categorization
    let bestMatch: CategoryResult = {
      category: "Uncategorized",
      confidence: 0.0,
    };

    for (const rule of this.rules) {
      const matchScore = this.calculateMatchScore(cleanDescription, rule);
      
      if (matchScore > bestMatch.confidence) {
        bestMatch = {
          category: rule.category,
          confidence: matchScore,
        };
      }
    }

    // Apply amount-based heuristics
    if (amount > 0) {
      // Positive amounts are likely income
      if (amount > 1000) { // Large deposits are likely salary
        bestMatch = {
          category: "Income",
          confidence: Math.max(bestMatch.confidence, 0.8),
        };
      }
    }

    return bestMatch;
  }

  private calculateMatchScore(description: string, rule: CategoryRule): number {
    let score = 0;
    let matches = 0;

    for (const keyword of rule.keywords) {
      if (description.includes(keyword)) {
        matches++;
        // Exact word matches get higher score than partial matches
        if (description.split(' ').some(word => word === keyword)) {
          score += rule.weight;
        } else {
          score += rule.weight * 0.7;
        }
      }
    }

    // Normalize score based on number of keywords matched
    if (matches > 0) {
      score = score / rule.keywords.length;
    }

    return Math.min(score, 1.0);
  }

  private generateOverrideKey(description: string): string {
    // Generate a normalized key for storing user overrides
    return description
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .trim()
      .split(/\s+/)
      .slice(0, 3) // Use first 3 words
      .join(' ');
  }

  learnFromOverride(description: string, category: string): void {
    const key = this.generateOverrideKey(description);
    this.userOverrides[key] = category;
    
    // Optionally, create or strengthen rules based on user feedback
    this.strengthenRule(description, category);
  }

  private strengthenRule(description: string, category: string): void {
    // Extract potential keywords from the description
    const words = description
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2);

    // Find existing rule for this category
    let existingRule = this.rules.find(rule => rule.category === category);
    
    if (existingRule) {
      // Add new keywords to existing rule if they don't exist
      for (const word of words) {
        if (!existingRule.keywords.includes(word)) {
          existingRule.keywords.push(word);
        }
      }
    } else {
      // Create new rule for this category
      this.rules.push({
        keywords: words,
        category,
        weight: 0.6, // Lower weight for learned rules
      });
    }
  }

  getCategories(): string[] {
    const categories = new Set(this.rules.map(rule => rule.category));
    categories.add("Uncategorized");
    return Array.from(categories).sort();
  }
}

const categorizationService = new CategorizationService();

export async function categorizeTransaction(description: string, amount: number): Promise<CategoryResult> {
  return categorizationService.categorizeTransaction(description, amount);
}

export function learnFromCategoryOverride(description: string, category: string): void {
  categorizationService.learnFromOverride(description, category);
}

export function getAvailableCategories(): string[] {
  return categorizationService.getCategories();
}
