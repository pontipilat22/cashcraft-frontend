// Based on shader https://reactbits.dev/backgrounds/iridescence
// From official Expo with-skia template
import React from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import {
  Canvas,
  Skia,
  Shader,
  Fill,
  useClock,
} from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';

interface SpiderWebLoaderProps {
  size?: number;
  isDark?: boolean;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const source = Skia.RuntimeEffect.Make(`
uniform vec3 uResolution;
uniform float uTime;
uniform vec3 uColor;
uniform float uAmplitude;
uniform float uSpeed;

vec4 main(vec2 fragCoord) {
  // Convert fragCoord to normalized coordinates
  vec2 vUv = fragCoord / uResolution.xy;

  float mr = min(uResolution.x, uResolution.y);
  vec2 uv = (vUv.xy * 2.0 - 1.0) * uResolution.xy / mr;
  float d = -uTime * 0.5 * uSpeed;
  float a = 0.0;
  for (float i = 0.0; i < 8.0; ++i) {
    a += cos(i - d - a * uv.x);
    d += sin(uv.y * i + a);
  }

  d += uTime * 0.5 * uSpeed;

  vec3 col = vec3(cos(uv * vec2(d, a)) * 0.6 + 0.4, cos(a + d) * 0.5 + 0.5);
  col = cos(col * cos(vec3(d, a, 2.5)) * 0.5 + 0.5) * uColor;

  return vec4(col, 1.0);
}
`);

export const SpiderWebLoader: React.FC<SpiderWebLoaderProps> = ({
  size,
  isDark = false
}) => {
  const clock = useClock();

  // Если size не передан, используем размеры экрана
  const width = size || SCREEN_WIDTH;
  const height = size || SCREEN_HEIGHT;

  // Цвета для светлой и темной темы
  const color: [number, number, number] = isDark
    ? [1, 1, 1] // Белый для темной темы
    : [1, 1, 1]; // Белый для светлой темы

  const speed = 1.0;
  const amplitude = 0.1;

  // Create uniforms using useDerivedValue from reanimated
  const uniforms = useDerivedValue(() => {
    return {
      uResolution: [width, height, 1],
      uTime: clock.value / 1000,
      uColor: color,
      uAmplitude: amplitude,
      uSpeed: speed,
    };
  }, [clock, width, height]);

  if (!source) {
    return null;
  }

  return (
    <Canvas style={StyleSheet.absoluteFill}>
      <Fill>
        <Shader source={source} uniforms={uniforms} />
      </Fill>
    </Canvas>
  );
};

SpiderWebLoader.displayName = 'SpiderWebLoader';
