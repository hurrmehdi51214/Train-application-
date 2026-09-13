/**
 * The network, as one import.
 *
 * Split three ways underneath because the pieces have genuinely different
 * dependencies: chainage is a bare table, fares are arithmetic over it, and
 * geometry needs the station coordinates. Keeping them apart is what lets the
 * fare model be tested in plain Node without dragging the whole data layer in.
 */

export * from './chainage';
export * from './fares';
export * from './geometry';
