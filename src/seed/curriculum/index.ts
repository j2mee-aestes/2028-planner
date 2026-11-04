import type { Track } from '../../lib/types';
import { ENGLISH } from './english';
import { HISTORY } from './history';
import { KOREAN } from './korean';
import { MATH } from './math';
import { SCIENCE } from './science';
import { SOCIETY } from './society';

// 체크리스트 표시 순서 = 이 배열 순서
export const CURRICULUM: Track[] = [...KOREAN, ...MATH, ...ENGLISH, ...SOCIETY, ...SCIENCE, ...HISTORY];
