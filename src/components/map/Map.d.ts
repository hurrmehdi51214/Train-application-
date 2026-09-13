/**
 * Type surface for the platform-split map.
 *
 * Metro picks `Map.native.tsx` on iOS and Android and `Map.web.tsx` in the
 * browser. TypeScript cannot follow that resolution, so this declaration is
 * what `import { Map } from './Map'` typechecks against. Keep the two
 * implementations conforming to it - there is no compiler check that they do.
 */
import type { MapProps } from './types';

export declare function Map(props: MapProps): JSX.Element;
