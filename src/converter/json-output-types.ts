export interface EpubExportMetadata {
  title?: string;
  creator?: string;
  creatorFileAs?: string;
  publisher?: string;
  language?: string;
  subject?: string[];
  description?: string;
  date?: string;
  isbn?: string;
  uuid?: string;
  cover?: string;
  "belongs-to-collection"?: string;
  "collection-type"?: string;
  [key: string]: string | string[] | undefined;
}

export interface EpubExportTocEntry {
  title: string;
  level?: number;
  order?: number;
  id: string;
  chapterId: string;
}

export interface EpubExportChapter {
  id: string;
  index: number;
  title: string;
  content?: string;
  file?: string;
}

export interface EpubExportImage {
  mimeType: string;
  data: string;
}

export interface EpubExportJson {
  version: "1.0";
  metadata: EpubExportMetadata;
  toc: EpubExportTocEntry[];
  chapters: EpubExportChapter[];
  images: Record<string, EpubExportImage>;
}
