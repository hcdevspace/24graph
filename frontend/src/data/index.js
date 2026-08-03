// Assembles the split-up reference data into one object, same shape the app
// used to have hardcoded as one giant inline literal. Adding a new airport's
// procedures is now just: drop a new file in procedures/, add one line below.

import airports from "./airports.json";
import waypoints from "./waypoints.json";
import navaids from "./navaids.json";
import runwaysByAirport from "./runways.json";

import IRFD from "./procedures/IRFD.json";
import ITKO from "./procedures/ITKO.json";
import IPPH from "./procedures/IPPH.json";

const PROCEDURES_BY_AIRPORT = { IRFD, ITKO, IPPH };

const sids = {};
const stars = {};
for (const [icao, data] of Object.entries(PROCEDURES_BY_AIRPORT)) {
  sids[icao] = data.sids;
  stars[icao] = data.stars;
}

const RFD_DATA = { sids, stars, waypoints, navaids, airports, runwaysByAirport };

export default RFD_DATA;
