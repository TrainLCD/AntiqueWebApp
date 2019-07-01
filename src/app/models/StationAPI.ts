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
  __typename: string;
}

export interface Line {
  id: number;
  lineColorC: null;
  name: string;
  __typename: string;
}
