import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

// Отключаем Fast Refresh если нужно (раскомментируйте строку ниже)
// global.__DEV__ && (global.__METRO_FAST_REFRESH__ = false);

AppRegistry.registerComponent(appName, () => App); 