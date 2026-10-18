import type { Lang } from './types';

export interface CatalogEntry { id: string; title: string; artist: string; album: string; lang: Exclude<Lang, 'Other'> }
type Row = [string, string, string];
const RAW: Record<CatalogEntry['lang'], Row[]> = {
  Telugu: [
    ['Butta Bomma', 'Armaan Malik', 'Ala Vaikunthapurramuloo'], ['Naatu Naatu', 'Rahul Sipligunj, Kaala Bhairava', 'RRR'], ['Srivalli', 'Sid Sriram', 'Pushpa: The Rise'],
    ['Ramuloo Ramulaa', 'Anurag Kulkarni, Mangli', 'Ala Vaikunthapurramuloo'], ['Samajavaragamana', 'Sid Sriram', 'Ala Vaikunthapurramuloo'], ['Inkem Inkem Inkem Kaavaale', 'Sid Sriram', 'Geetha Govindam'],
    ['Oo Antava', 'Indravathi Chauhan', 'Pushpa: The Rise'], ['Saami Saami', 'Mounika Yadav', 'Pushpa: The Rise'], ['Neeli Neeli Aakasam', 'Sid Sriram', '30 Rojullo Preminchadam Ela'],
    ['Chuttamalle', 'Shilpa Rao', 'Devara'], ['Kurchi Madathapetti', 'Sahithi Chaganti, Sri Krishna', 'Guntur Kaaram'], ['Nee Kannu Neeli Samudram', 'Javed Ali', 'Uppena'],
  ],
  Hindi: [
    ['Tum Hi Ho', 'Arijit Singh', 'Aashiqui 2'], ['Kesariya', 'Arijit Singh', 'Brahmāstra'], ['Channa Mereya', 'Arijit Singh', 'Ae Dil Hai Mushkil'], ['Raataan Lambiyan', 'Jubin Nautiyal, Asees Kaur', 'Shershaah'],
    ['Kal Ho Naa Ho', 'Sonu Nigam', 'Kal Ho Naa Ho'], ['Tera Ban Jaunga', 'Akhil Sachdeva, Tulsi Kumar', 'Kabir Singh'], ['Apna Bana Le', 'Arijit Singh', 'Bhediya'], ['Chaleya', 'Arijit Singh, Shilpa Rao', 'Jawan'],
    ['Pehle Bhi Main', 'Vishal Mishra', 'Animal'], ['Kabira', 'Tochi Raina, Rekha Bhardwaj', 'Yeh Jawaani Hai Deewani'], ['Tum Se Hi', 'Mohit Chauhan', 'Jab We Met'], ['Maan Meri Jaan', 'King', 'Maan Meri Jaan'],
  ],
  English: [
    ['Blinding Lights', 'The Weeknd', 'After Hours'], ['Shape of You', 'Ed Sheeran', '÷ (Divide)'], ['Someone Like You', 'Adele', '21'], ['Levitating', 'Dua Lipa', 'Future Nostalgia'],
    ['Bohemian Rhapsody', 'Queen', 'A Night at the Opera'], ['As It Was', 'Harry Styles', "Harry's House"], ['Perfect', 'Ed Sheeran', '÷ (Divide)'], ['Believer', 'Imagine Dragons', 'Evolve'],
    ['Starboy', 'The Weeknd, Daft Punk', 'Starboy'], ['Counting Stars', 'OneRepublic', 'Native'], ['Viva La Vida', 'Coldplay', 'Viva la Vida or Death and All His Friends'], ['Lose Yourself', 'Eminem', '8 Mile'],
  ],
};

export const norm = (s: string) =>
  s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[([].*?[)\]]/g, ' ').replace(/[^a-z0-9ऀ-ॿఀ-౿]+/g, '');

export const CATALOG: CatalogEntry[] = (Object.keys(RAW) as CatalogEntry['lang'][]).flatMap(lang =>
  RAW[lang].map(([title, artist, album]) => ({ id: `${lang.slice(0, 2).toLowerCase()}-${norm(title).slice(0, 24)}`, title, artist, album, lang })));

/** Match a file's tags against the starter catalogue (title must match; artist is checked when present). */
export function matchCatalog(title: string, artist = ''): CatalogEntry | null {
  const t = norm(title);
  if (t.length < 4) return null;
  const a = norm(artist);
  for (const e of CATALOG) {
    const et = norm(e.title);
    if (t !== et && !(et.length >= 6 && t.includes(et))) continue;
    if (!a || e.artist.split(',').some(x => { const n = norm(x); return n && (a.includes(n) || n.includes(a)); }) || t === et) return e;
  }
  return null;
}

export function detectLang(title: string, artist: string, entry?: CatalogEntry | null): Lang {
  if (entry) return entry.lang;
  const s = `${title} ${artist}`;
  if (/[ఀ-౿]/.test(s)) return 'Telugu';
  if (/[ऀ-ॿ]/.test(s)) return 'Hindi';
  return 'Other';
}
