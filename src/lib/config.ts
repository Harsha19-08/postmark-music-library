import path from 'node:path';

export const DATA_DIR = path.resolve(process.env.DATA_DIR || (process.env.VERCEL ? '/tmp/postmark' : './data'));
export const AUDIO_DIR = path.join(DATA_DIR, 'audio');
export const COVER_DIR = path.join(DATA_DIR, 'covers');
export const TMP_DIR = path.join(DATA_DIR, 'tmp');
/** Local SQLite file by default. Point at a Turso/libSQL URL for hosted metadata. */
export const DB_URL = process.env.DATABASE_URL || `file:${path.join(DATA_DIR, 'postmark.db')}`;
export const PASSWORD = process.env.POSTMARK_PASSWORD || '';
export const SECRET = process.env.POSTMARK_SECRET || PASSWORD;
export const AUDIO_EXT = ['.mp3', '.m4a', '.aac', '.wav', '.flac', '.ogg', '.oga', '.opus', '.webm', '.aiff', '.aif'];
