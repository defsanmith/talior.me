export interface BulletIndexDocument {
  bulletId: string;
  userId: string;
  content: string;
  tags: string[];
  skills: string[];
  parentType: "experience" | "project";
  parentId: string;
  parentTitle: string;
  parentCompany?: string;
  startDate?: string;
  endDate?: string;
}

export interface BulletSearchHit extends BulletIndexDocument {
  score: number;
}
