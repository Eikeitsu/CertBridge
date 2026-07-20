import { defineConfig } from 'vitepress';

const repoName =
  process.env.VITEPRESS_BASE?.replace(/^\//, '').replace(/\/$/, '') ||
  'CACertStore';

export default defineConfig({
  title: 'CA 证书管理',
  description: '将 Reqable / ProxyPin / 自定义 CA 安装到 Android 系统信任库',
  base: `/${repoName}/`,
  lang: 'zh-CN',
  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '功能介绍', link: '/guide/features' },
      { text: '安装', link: '/guide/install' },
      { text: '配置说明', link: '/guide/config' }
    ],
    sidebar: [
      {
        text: '使用指南',
        items: [
          { text: '功能介绍', link: '/guide/features' },
          { text: '安装与升级', link: '/guide/install' },
          { text: '配置说明', link: '/guide/config' },
          { text: '常见问题', link: '/guide/faq' },
          { text: '相关软件', link: '/guide/related' }
        ]
      }
    ],
    socialLinks: [
      {
        icon: 'github',
        link: 'https://github.com/Eikeitsu/CACertStore'
      }
    ],
    footer: {
      message: 'CACertStore · CA 证书管理',
      copyright: '许小墨'
    }
  }
});
