export interface StationData {
  station: Station;
}

export interface StationByCoordsData {
  stationByCoords: Station;
}

export interface StationsByLineIdData {
  stationsByLineId: Station[];
}

export interface LineByIdData {
  line: Line;
}

export interface Station {
  groupId: number;
  name: string;
  address: string;
  lines: Line[];
  latitude: number;
  longitude: number;
  distance: number;
  __typename: string;
}

export interface Line {
  id: string;
  lineColorC: null;
  name: string;
  __typename: string;
}
