import type { NSFWPrediction } from './NSFWPrediction';

export interface AnalysisResult {
  predictions: NSFWPrediction[];
  nsfw: boolean;
  highestNSFWProbability: number;
  timestamp: number;
}
