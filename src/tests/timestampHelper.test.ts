import { describe, it, expect } from 'vitest';
import { formatTimestamp, parseTimestamp, calculateCompensatedTime } from '../modules/video/timestampHelper';

describe('Video Timestamp Utilities', () => {
  it('formats seconds into mm:ss format for sub-hour durations', () => {
    expect(formatTimestamp(0)).toBe('00:00');
    expect(formatTimestamp(65)).toBe('01:05');
    expect(formatTimestamp(3599)).toBe('59:59');
  });

  it('formats seconds into hh:mm:ss format for durations exceeding 1 hour', () => {
    expect(formatTimestamp(3600)).toBe('1:00:00');
    expect(formatTimestamp(3665)).toBe('1:01:05');
    expect(formatTimestamp(7325)).toBe('2:02:05');
  });

  it('parses timestamps in mm:ss or hh:mm:ss strings into seconds', () => {
    expect(parseTimestamp('01:05')).toBe(65);
    expect(parseTimestamp('1:00:00')).toBe(3600);
    expect(parseTimestamp('[02:30]')).toBe(150);
  });

  it('calculates human reaction compensation offset accurately', () => {
    // 120s with 5s reaction offset -> 115s
    expect(calculateCompensatedTime(120, 5)).toBe(115);

    // Never returns negative time
    expect(calculateCompensatedTime(3, 5)).toBe(0);

    // Clamps to video duration
    expect(calculateCompensatedTime(100, 5, 80)).toBe(80);
  });
});
