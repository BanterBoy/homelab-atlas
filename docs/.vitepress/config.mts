import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: 'en-US',
  title: 'Homelab Atlas Docs',
  titleTemplate: ':title | Homelab Atlas Docs',
  description: 'Build, save, and share clear homelab diagrams with Homelab Atlas.',
  base: '/homelab-atlas/',
  appearance: 'dark',
  cleanUrls: true,
  lastUpdated: true,
  sitemap: { hostname: 'https://aiden0rchad.github.io/homelab-atlas/' },
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/homelab-atlas/atlas-mark.svg' }],
    ['meta', { name: 'theme-color', content: '#0b1117' }],
  ],
  markdown: { lineNumbers: true },
  themeConfig: {
    logo: { src: '/atlas-mark.svg', alt: 'Homelab Atlas' },
    siteTitle: 'Homelab Atlas Docs',
    nav: [
      { text: 'Guides', link: '/getting-started' },
      { text: 'Reference', link: '/project-format' },
      { text: 'GitHub', link: 'https://github.com/aiden0rchad/homelab-atlas' },
    ],
    sidebar: [
      {
        text: 'Start here',
        items: [
          { text: 'Getting started', link: '/getting-started' },
          { text: 'Privacy and deployment', link: '/privacy' },
        ],
      },
      {
        text: 'Build a diagram',
        items: [
          { text: 'Editor', link: '/editor' },
          { text: 'Networking', link: '/networking' },
        ],
      },
      {
        text: 'Save and share',
        items: [
          { text: 'Sharing and backup', link: '/sharing' },
        ],
      },
      {
        text: 'Reference',
        items: [
          { text: 'Troubleshooting', link: '/troubleshooting' },
          { text: 'Project format', link: '/project-format' },
          { text: 'Development', link: '/development' },
        ],
      },
    ],
    search: { provider: 'local' },
    outline: { level: [2, 3], label: 'On this page' },
    editLink: {
      pattern: 'https://github.com/aiden0rchad/homelab-atlas/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },
    lastUpdated: { text: 'Last updated', formatOptions: { dateStyle: 'medium' } },
    socialLinks: [{ icon: 'github', link: 'https://github.com/aiden0rchad/homelab-atlas' }],
    footer: {
      message: 'MIT licensed · <a href="https://github.com/aiden0rchad/homelab-atlas/blob/main/THIRD_PARTY_NOTICES.md">Logo attribution</a>',
      copyright: 'Homelab Atlas contributors',
    },
    darkModeSwitchLabel: 'Theme',
    sidebarMenuLabel: 'Menu',
    returnToTopLabel: 'Back to top',
    externalLinkIcon: true,
  },
})
