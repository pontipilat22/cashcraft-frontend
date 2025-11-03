declare module '@rainbow-me/animated-charts' {
  import { ComponentType } from 'react';
  import { ViewStyle, TextStyle } from 'react-native';

  export interface DataPoint {
    x: number;
    y: number;
  }

  export interface ChartPathProviderProps {
    data: DataPoint[];
    children: React.ReactNode;
  }

  export interface ChartPathProps {
    height?: number;
    stroke?: string;
    width?: number;
    strokeWidth?: number;
  }

  export interface ChartDotProps {
    style?: ViewStyle;
  }

  export interface ChartYLabelProps {
    format?: (value: number) => string;
    style?: TextStyle | TextStyle[];
  }

  export const ChartPathProvider: ComponentType<ChartPathProviderProps>;
  export const ChartPath: ComponentType<ChartPathProps>;
  export const ChartDot: ComponentType<ChartDotProps>;
  export const ChartYLabel: ComponentType<ChartYLabelProps>;
  export function monotoneCubicInterpolation(input: {
    data: DataPoint[];
    range?: number;
    includeExtremes?: boolean;
    removePointsSurroundingExtremes?: boolean;
  }): DataPoint[];
}
