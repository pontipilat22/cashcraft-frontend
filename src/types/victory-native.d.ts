declare module 'victory-native' {
  import * as React from 'react';

  export const VictoryChart: React.ComponentType<any>;
  export const VictoryLine: React.ComponentType<any>;
  export const VictoryArea: React.ComponentType<any>;
  export const VictoryBar: React.ComponentType<any>;
  export const VictoryAxis: React.ComponentType<any>;
  export const VictoryPolarAxis: React.ComponentType<any>;
  export const VictoryTooltip: React.ComponentType<any>;
  export const VictoryVoronoiContainer: React.ComponentType<any>;
  export const VictoryZoomContainer: React.ComponentType<any>;
  export const VictoryGroup: React.ComponentType<any>;
  export const VictoryScatter: React.ComponentType<any>;
  export const VictoryPie: React.ComponentType<any>;
  export const VictoryStack: React.ComponentType<any>;
  export const VictoryPortal: React.ComponentType<any>;
  export const VictoryLabel: React.ComponentType<any>;

  export const createContainer: (...containers: string[]) => React.ComponentType<any>;
}
