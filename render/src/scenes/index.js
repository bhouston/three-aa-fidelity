import * as aoRoom from './ao-room.js';
import * as morphField from './morph-field.js';
import * as ssgiBox from './ssgi-box.js';
import * as thinLines from './thin-lines.js';
import * as traaChallenge from './traa-challenge.js';

/** Scene modules by registry `params.scene`. */
export const SCENES = {
  'traa-challenge': traaChallenge,
  'thin-lines': thinLines,
  'morph-field': morphField,
  'ao-room': aoRoom,
  'ssgi-box': ssgiBox,
};
