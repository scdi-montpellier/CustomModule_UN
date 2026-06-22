export interface Doc {
  pnx: {
    display?: {
      title?: string[];
      creator?: string[];
      creationdate?: string[];  // Add this line
      [key: string]: any;
    };
    control?: {
      recordid?: string[];
      sourcerecordid?: string[];
      [key: string]: any;
    };
    addata?: {
      doi?: string[];
      issn?: string[];
      isbn?: string[];
      identifier?: string[];
      rft_id?: string[];
      date?: string[];
      [key: string]: any;
    };
    search?: {
      isbn?: string[];
      issn?: string[];
      [key: string]: any;
    };
    [key: string]: any;
  };
  [key: string]: any;
}