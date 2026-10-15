import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-svelte'],
  manifest: {
    name: 'Acitya Notes - AI Web & Video Notetaker',
    description: 'Privacy-first contextual notetaker for Web, PDF, and YouTube with local & hybrid AI.',
    permissions: [
      'sidePanel',
      'storage',
      'activeTab',
      'tabs',
      'scripting',
      'contextMenus',
    ],
    host_permissions: [
      '<all_urls>',
    ],
    action: {
      default_title: 'Open Acitya Notes',
    },
    side_panel: {
      default_path: 'sidepanel.html',
    },
  },
});

