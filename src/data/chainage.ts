/**
 * Where every station sits along its line.
 *
 * Chainage (distance from Karachi Cantt) is anchored on two figures Pakistan
 * Railways publishes and which everything else has to agree with: the Green
 * Line covers 1,518 km from Karachi Cantt to Islamabad, and ML-1 runs 1,687 km
 * from Karachi to Peshawar. Every intermediate value is interpolated between
 * real station positions so those two anchors hold exactly.
 *
 * Deliberately free of imports. Fares and search both depend on it, and
 * neither should have to drag the station table in behind it.
 */

/** Kilometres from Karachi Cantt, along the station's own line. */
export const CHAINAGE_KM: Record<string, number> = {
  'stn-khi-cantt': 0,
  'stn-khi-city': 5,
  'stn-kotri': 158,
  'stn-hyd': 165,
  'stn-nawabshah': 277,
  'stn-larkana': 430,
  'stn-rohri': 480,
  'stn-sukkur': 487,
  'stn-jacobabad': 560,
  'stn-rykhan': 656,
  'stn-sibi': 830,
  'stn-bwp': 790,
  'stn-mux-cantt': 920,
  'stn-khanewal': 968,
  'stn-quetta': 1000,
  'stn-sahiwal': 1063,
  'stn-fsd': 1090,
  'stn-lhr': 1214,
  'stn-gujranwala': 1281,
  'stn-gujrat': 1330,
  'stn-sialkot': 1332,
  'stn-jhelum': 1383,
  'stn-rwp': 1490,
  'stn-isb': 1518,
  'stn-taxila': 1525,
  'stn-attock': 1570,
  'stn-havelian': 1588,
  'stn-nowshera': 1655,
  'stn-pew': 1687,
};

export function chainage(stationId: string): number {
  return CHAINAGE_KM[stationId] ?? 0;
}

/** Rail distance between two stations on the same corridor. */
export function distanceBetween(fromId: string, toId: string): number {
  return Math.abs(chainage(toId) - chainage(fromId));
}
