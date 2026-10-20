import { registerStripeHeadlessTask } from './src/app/stripe/registerStripeHeadlessTask';
import { registerRootComponent } from 'expo';

import App from './App';
import { wrapRootComponent } from './src/services/monitoring/initSentry';

registerStripeHeadlessTask();

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(wrapRootComponent(App));
