// The lattice boards in each of their looks (Q510), for the tests that hold every lattice board to a contract: the
// type itself at Curved, its start, and the same type built at Straight, its id saying which.
import { type AnyBoardType, LIGHTENED, SKELETON } from '../src/board-types/index.js';
import { LOOKS } from '../src/board-types/lightened.js';

/** A lattice board type built at one look whatever its values say, its id `<id> <look>`. */
function atLook<T extends AnyBoardType>(type: T, look: string): T {
  const build = ((engine, values) => type.build(engine, { ...values, look })) as T['build'];
  return { ...type, id: `${type.id} ${look}`, build };
}

/** The lightened and the skeleton boards, each Curved and Straight. */
export const LATTICE_LOOKS = [LIGHTENED, SKELETON].flatMap((type) => [type, atLook(type, LOOKS.straight.value)]);
