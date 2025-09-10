import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from './router';
import App from './App.vue';
import { registerSW } from 'virtual:pwa-register';
import './index.css';

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount('#app');

// Register service worker for PWA support
registerSW();
