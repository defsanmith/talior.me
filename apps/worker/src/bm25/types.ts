export interface BulletCandidate {
  bulletId: string;
  content: string;
  score: number;
  parentId: string;
  parentType: string;
  startDate?: string;
  endDate?: string;
  userId?: string;
  tags?: string[];
  skills?: string[];
}

export interface SelectionConstraints {
  maxBulletsPerParent: number;
  similarityThreshold: number;
  targetCount: { min: number; max: number };
}

export type SelectedBullet = BulletCandidate;
