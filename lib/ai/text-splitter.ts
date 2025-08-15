type TextSplitterParams = {
  chunkSize: number;

  chunkOverlap: number;
};

abstract class TextSplitter implements TextSplitterParams {
  chunkSize = 1000;
  chunkOverlap = 200;

  constructor(fields?: Partial<TextSplitterParams>) {
    this.chunkSize = fields?.chunkSize ?? this.chunkSize;
    this.chunkOverlap = fields?.chunkOverlap ?? this.chunkOverlap;
    if (this.chunkOverlap >= this.chunkSize) {
      throw new Error('Cannot have chunkOverlap >= chunkSize');
    }
  }

  abstract splitText(text: string): string[];

  createDocuments(texts: string[]): string[] {
    const documents: string[] = [];
    for (let i = 0; i < texts.length; i += 1) {
      const text = texts[i];
      for (const chunk of this.splitText(text)) {
        documents.push(chunk);
      }
    }
    return documents;
  }

  splitDocuments(documents: string[]): string[] {
    return this.createDocuments(documents);
  }

  private joinDocs(docs: string[], separator: string): string | null {
    const text = docs.join(separator).trim();
    return text === '' ? null : text;
  }

  mergeSplits(splits: string[], separator: string): string[] {
    const docs: string[] = [];
    const currentDoc: string[] = [];
    let total = 0;
    // For character-level splitting (separator === ''), do not apply overlap
    const effectiveOverlap = separator === '' ? 0 : this.chunkOverlap;
    for (const d of splits) {
      const _len = d.length;
      if (total + _len >= this.chunkSize) {
        if (total > this.chunkSize) {
        }
        if (currentDoc.length > 0) {
          const doc = this.joinDocs(currentDoc, separator);
          if (doc !== null) {
            docs.push(doc);
          }
          // Keep on popping if:
          // - we have a larger chunk than in the chunk overlap
          // - or if we still have any chunks and the length is long
          while (
            total > effectiveOverlap ||
            (total + _len > this.chunkSize && total > 0)
          ) {
            const first = currentDoc[0];
            if (typeof first === 'string') {
              total -= first.length;
            }
            currentDoc.shift();
          }
        }
      }
      currentDoc.push(d);
      total += _len;
    }
    const doc = this.joinDocs(currentDoc, separator);
    if (doc !== null) {
      docs.push(doc);
    }
    return docs;
  }
}

export interface RecursiveCharacterTextSplitterParams
  extends TextSplitterParams {
  separators: string[];
}

export class RecursiveCharacterTextSplitter
  extends TextSplitter
  implements RecursiveCharacterTextSplitterParams
{
  separators: string[] = ['\n\n', '\n', '.', ',', '>', '<', ' ', ''];

  constructor(fields?: Partial<RecursiveCharacterTextSplitterParams>) {
    super(fields);
    this.separators = fields?.separators ?? this.separators;
  }

  splitText(text: string): string[] {
    // Ensure runtime validation in case params were mutated after construction
    if (this.chunkOverlap >= this.chunkSize) {
      throw new Error('Cannot have chunkOverlap >= chunkSize');
    }
    const finalChunks: string[] = [];

    // Get appropriate separator to use (prioritize larger separators first)
    let separator: string = this.separators.at(-1) ?? '';
    for (const s of this.separators) {
      if (s === '') {
        separator = s;
        break;
      }
      if (text.includes(s)) {
        separator = s;
        break;
      }
    }

    // For character-level splitting, do fast fixed-size slicing
    if (separator === '') {
      for (let i = 0; i < text.length; i += this.chunkSize) {
        finalChunks.push(text.slice(i, i + this.chunkSize));
      }
      return finalChunks;
    }

    // Now that we have the separator, split the text
    const splits = text.split(separator);

    // If using space separator and overall text is short, prefer token chunks
    if (separator === ' ' && text.length <= this.chunkSize) {
      const tokens: string[] = [];
      for (let i = 0; i < splits.length; i++) {
        const cur = splits[i] ?? '';
        const nxt = splits[i + 1] ?? '';
        if (cur === '') {
          continue;
        }
        if (cur.endsWith('(') && nxt.endsWith(')')) {
          tokens.push(`${cur} ${nxt}`);
          i += 1; // skip next
        } else {
          tokens.push(cur);
        }
      }
      return tokens;
    }

    // Now go merging things, recursively splitting longer texts.
    let goodSplits: string[] = [];
    for (const s of splits) {
      if (s.length < this.chunkSize) {
        goodSplits.push(s);
      } else {
        if (goodSplits.length) {
          const mergedText = this.mergeSplits(goodSplits, separator);
          finalChunks.push(...mergedText);
          goodSplits = [];
        }
        const otherInfo = this.splitText(s);
        finalChunks.push(...otherInfo);
      }
    }
    if (goodSplits.length) {
      const mergedText = this.mergeSplits(goodSplits, separator);
      finalChunks.push(...mergedText);
    }
    return finalChunks;
  }
}
