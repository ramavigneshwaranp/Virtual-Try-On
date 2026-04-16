export type BodyStructure = 'Petite' | 'Tall' | 'Athletic' | 'Curvy' | 'Rectangular' | 'Pear' | 'Apple';
export type FacialStructure = 'Oval' | 'Round' | 'Square' | 'Heart' | 'Diamond' | 'Long';

export interface DressSuggestion {
  id: string;
  name: string;
  description: string;
  style: string;
  baseColor: string;
  recommendedFabric: string;
  reasoning: string;
  imageUrl?: string;
}

export interface UserAnalysis {
  bodyType: BodyStructure;
  faceShape: FacialStructure;
  skinTone: string;
  styleProfile: string;
  physicalTraits: string[];
}

export interface CustomizedDress {
  suggestionId: string;
  color: string;
  pattern: string;
  neckline: string;
  length: 'Mini' | 'Midi' | 'Maxi';
}
