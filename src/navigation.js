import { getPermalink } from './utils/permalinks';

export const textLinks = [
  { text: 'About', href: '/about' },
  { text: 'Acting Resumé', href: '/resume' },
  { text: 'Acting Updates', href: '/category/Acting' },
  { text: 'Blog', href: '/blog' },
  { text: 'Videos', href: '/videos' },
  { text: 'Web Resumé', href: '/web' },
];

export const headerData = {
  links: textLinks,
  // actions: [{ text: 'Download', href: 'https://github.com/onwidget/astrowind', target: '_blank' }],
};
const currentYear = new Date().getFullYear();
export const footerData = {
  links: [],
  secondaryLinks: [
    { text: 'Terms', href: getPermalink('/terms') },
    { text: 'Privacy Policy', href: getPermalink('/privacy') },
  ],
  socialLinks: [
    { ariaLabel: 'Bitbucket', icon: 'tabler:brand-bitbucket', href: 'https://bitbucket.org/kevinashworth' },
    { ariaLabel: 'Facebook', icon: 'tabler:brand-facebook', href: 'https://facebook.com/kevinashworth' },
    { ariaLabel: 'Github', icon: 'tabler:brand-github', href: 'https://github.com/kevinashworth' },
    { ariaLabel: 'IMDb', icon: 'tabler:movie', href: 'https://www.imdb.com/name/nm2825198' },
    { ariaLabel: 'Instagram', icon: 'tabler:brand-instagram', href: 'https://www.instagram.com/iamkevinashworth/' },
    { ariaLabel: 'LinkedIn', icon: 'tabler:brand-linkedin', href: 'https://www.linkedin.com/in/iamkevinashworth/' },
    { ariaLabel: 'Mastodon', icon: 'tabler:brand-mastodon', href: 'https://toot.community/@kevinashworth' },
    {
      ariaLabel: 'Stack Overflow',
      icon: 'tabler:brand-stackoverflow',
      href: 'https://stackoverflow.com/users/7082724/kevin-ashworth',
    },
    { ariaLabel: 'Threads', icon: 'tabler:brand-threads', href: 'https://www.threads.net/@iamkevinashworth' },
    { ariaLabel: 'Twitter', icon: 'tabler:brand-twitter', href: 'https://twitter.com/kevinashworth' },
    { ariaLabel: 'Vimeo', icon: 'tabler:brand-vimeo', href: 'https://vimeo.com/kevinashworth' },
    { ariaLabel: 'YouTube', icon: 'tabler:brand-youtube', href: 'https://www.youtube.com/user/kevinashworth' },
  ],
  footNote: `
    &copy; 2001-${currentYear} Kevin Ashworth
  `,
};
