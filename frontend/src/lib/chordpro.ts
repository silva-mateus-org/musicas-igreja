export type ChordProNodeType = 'chord' | 'text' | 'directive';

export interface ChordProNode {
  type: ChordProNodeType;
  value: string;
  directiveName?: string;
}

export interface ChordProLine {
  nodes: ChordProNode[];
}

export type SectionType = 'verse' | 'chorus' | 'bridge' | 'comment' | 'other';

export interface ChordProSection {
  id: string;
  type: SectionType;
  label?: string;
  lines: ChordProLine[];
}

export interface ChordProDocument {
  metadata: Record<string, string>;
  sections: ChordProSection[];
}

const CHROMA_SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const CHROMA_FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

export function parseChordProLine(line: string): ChordProLine {
  const nodes: ChordProNode[] = [];
  
  // Match directives: {name: value} or {name}
  const directiveMatch = line.match(/^\{([^:}]+)(?::(.*))?\}$/);
  if (directiveMatch) {
    return {
      nodes: [{
        type: 'directive',
        directiveName: directiveMatch[1].trim(),
        value: directiveMatch[2] ? directiveMatch[2].trim() : ''
      }]
    };
  }

  // Parse inline chords: text[Chord]text
  const regex = /\[([^\]]+)\]|([^\[]+)/g;
  let match;
  while ((match = regex.exec(line)) !== null) {
    if (match[1]) {
      // It's a chord
      nodes.push({ type: 'chord', value: match[1] });
    } else if (match[2]) {
      // It's text
      nodes.push({ type: 'text', value: match[2] });
    }
  }

  return { nodes };
}

export function parseChordPro(text: string): ChordProLine[] {
  return text.split(/\r?\n/).map(parseChordProLine);
}

// Parses a full ChordPro text into a structured document with metadata and sections
export function parseChordProDocument(text: string): ChordProDocument {
  const lines = parseChordPro(text);
  const metadata: Record<string, string> = {};
  const sections: ChordProSection[] = [];
  
  let currentSection: ChordProSection | null = null;
  let sectionCounter = 0;
  
  const finishCurrentSection = () => {
    if (currentSection) {
      if (currentSection.lines.length > 0 || currentSection.label) {
        sections.push(currentSection);
      }
      currentSection = null;
    }
  };
  
  const startNewSection = (type: SectionType, label?: string) => {
    finishCurrentSection();
    sectionCounter++;
    currentSection = {
      id: `sec-${sectionCounter}`,
      type,
      label,
      lines: []
    };
  };
  
  for (const line of lines) {
    if (line.nodes.length === 1 && line.nodes[0].type === 'directive') {
      const dirName = line.nodes[0].directiveName?.toLowerCase();
      const dirValue = line.nodes[0].value;
      
      // Metadata
      if (['title', 't', 'subtitle', 'st', 'artist', 'key', 'tempo', 'capo'].includes(dirName || '')) {
        metadata[dirName!] = dirValue;
        continue;
      }
      
      // Section starts
      if (dirName === 'start_of_chorus' || dirName === 'soc') {
        startNewSection('chorus', dirValue || 'Refrão');
        continue;
      }
      if (dirName === 'start_of_verse' || dirName === 'sov') {
        startNewSection('verse', dirValue || 'Verso');
        continue;
      }
      if (dirName === 'start_of_bridge' || dirName === 'sob') {
        startNewSection('bridge', dirValue || 'Ponte');
        continue;
      }
      
      // Section ends
      if (dirName === 'end_of_chorus' || dirName === 'eoc' || 
          dirName === 'end_of_verse' || dirName === 'eov' || 
          dirName === 'end_of_bridge' || dirName === 'eob') {
        finishCurrentSection();
        continue;
      }
      
      // Comments as section headers (common pattern)
      if (dirName === 'comment' || dirName === 'c') {
        startNewSection('comment', dirValue);
        continue;
      }
    }
    
    // If no section is active, start a default one
    if (!currentSection) {
      startNewSection('other');
    }
    
    currentSection.lines.push(line);
  }
  
  finishCurrentSection();
  
  return { metadata, sections };
}

// Helper to transpose a single chord
export function transposeChord(chord: string, steps: number): string {
  if (steps === 0) return chord;

  // Regex to extract the root note, bass note, and modifiers
  // Matches A-G, optional # or b.
  const chordRegex = /^([A-G][#b]?)(.*?)(\/([A-G][#b]?))?$/;
  const match = chord.match(chordRegex);

  if (!match) return chord; // If it doesn't look like a standard chord, leave it alone

  const rootNote = match[1];
  const modifiers = match[2];
  const hasBass = match[3] !== undefined;
  const bassNote = match[4];

  const shiftNote = (note: string, amount: number) => {
    let index = CHROMA_SHARPS.indexOf(note);
    let useSharps = true;
    
    if (index === -1) {
      index = CHROMA_FLATS.indexOf(note);
      useSharps = false;
    }
    
    if (index === -1) return note; // fallback

    let newIndex = (index + amount) % 12;
    if (newIndex < 0) newIndex += 12;

    // A simple heuristic for choosing sharps vs flats could be improved, 
    // but preserving the original notation style (sharp or flat) is a good start.
    return useSharps ? CHROMA_SHARPS[newIndex] : CHROMA_FLATS[newIndex];
  };

  const newRoot = shiftNote(rootNote, steps);
  const newBass = hasBass ? `/${shiftNote(bassNote, steps)}` : '';

  return `${newRoot}${modifiers}${newBass}`;
}

export function transposeChordProText(text: string, steps: number): string {
  if (steps === 0) return text;

  // Replace [Chord] with [TransposedChord]
  return text.replace(/\[([^\]]+)\]/g, (match, chord) => {
    return `[${transposeChord(chord, steps)}]`;
  });
}

// Check if a line is likely just chords (and spaces)
export function isChordLine(line: string): boolean {
  if (!line.trim()) return false;
  
  // Remove known valid chords and spaces
  // This is a basic heuristic. A more advanced one would check tokens.
  const tokens = line.trim().split(/\s+/);
  const chordPattern = /^([A-G][#b]?)(m|maj|min|sus|dim|aug|[0-9])*(?:\/[A-G][#b]?)?$/;
  
  let validChords = 0;
  for (const token of tokens) {
    if (chordPattern.test(token)) validChords++;
  }
  
  // If more than 50% of tokens look like chords, we treat it as a chord line
  return validChords > 0 && (validChords / tokens.length) >= 0.5;
}

// Converts standard text format (chords above lyrics) to ChordPro
export function convertTextToChordPro(text: string): string {
  const lines = text.split(/\r?\n/);
  const result: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check for directives manually entered by user
    if (line.trim().startsWith('{') && line.trim().endsWith('}')) {
      result.push(line);
      continue;
    }
    
    if (isChordLine(line)) {
      const nextLine = (i + 1 < lines.length && !isChordLine(lines[i + 1])) ? lines[i + 1] : "";
      
      // Find all chords and their indices
      const chordMatches = [...line.matchAll(/(\S+)/g)];
      
      let mergedLine = "";
      let lastIndex = 0;
      
      for (const match of chordMatches) {
        const chord = match[0];
        const index = match.index!;
        
        // Append text from last chord to current chord position
        if (index > lastIndex) {
          mergedLine += nextLine.substring(lastIndex, index);
        } else if (index < lastIndex && nextLine.length > 0) {
            // Should not happen with regex matchAll, but just in case
        }
        
        mergedLine += `[${chord}]`;
        lastIndex = index;
      }
      
      // Append the rest of the lyric line
      if (lastIndex < nextLine.length) {
        mergedLine += nextLine.substring(lastIndex);
      }
      
      result.push(mergedLine);
      
      // Skip the next line since we merged it
      if (nextLine !== "") {
        i++; 
      }
    } else {
      result.push(line);
    }
  }
  
  return result.join("\n");
}

// Converts ChordPro back to text format (chords above lyrics)
export function convertChordProToText(chordPro: string): string {
  const parsedLines = parseChordPro(chordPro);
  const result: string[] = [];
  
  for (const line of parsedLines) {
    if (line.nodes.length === 0) {
      result.push("");
      continue;
    }
    
    if (line.nodes.length === 1 && line.nodes[0].type === 'directive') {
      const dir = line.nodes[0];
      result.push(`{${dir.directiveName}${dir.value ? ': ' + dir.value : ''}}`);
      continue;
    }
    
    const hasChords = line.nodes.some(n => n.type === 'chord');
    
    if (!hasChords) {
      result.push(line.nodes.map(n => n.value).join(""));
      continue;
    }
    
    let chordLine = "";
    let textLine = "";
    
    for (const node of line.nodes) {
      if (node.type === 'chord') {
        // Pad chordLine to match textLine length if textLine is longer
        while (chordLine.length < textLine.length) chordLine += " ";
        chordLine += node.value;
      } else if (node.type === 'text') {
        textLine += node.value;
        // Pad chord line with spaces for the length of the text, so the next chord aligns properly
        // Note: we don't pad if the chord itself is longer than the text below it, 
        // to avoid shifting subsequent lyrics.
      }
    }
    
    // We trim right in case there are trailing spaces
    result.push(chordLine.trimEnd());
    if (textLine.trim().length > 0 || line.nodes.some(n => n.type === 'text' && n.value.length > 0)) {
       result.push(textLine);
    }
  }
  
  return result.join("\n");
}

// Extracts all unique chords from a ChordPro string
export function extractUniqueChords(chordPro: string): string[] {
  const chords = new Set<string>();
  const parsedLines = parseChordPro(chordPro);
  
  for (const line of parsedLines) {
    for (const node of line.nodes) {
      if (node.type === 'chord') {
        chords.add(node.value);
      }
    }
  }
  
  // Sort alphabetically or by root note
  return Array.from(chords).sort();
}

