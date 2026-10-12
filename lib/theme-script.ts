export const THEME_COOKIE = 'lms-theme';

export const THEME_SCRIPT = `
(function(){
  try {
    var m = document.cookie.match(/(?:^|; )${THEME_COOKIE}=([^;]+)/);
    var userMode = m ? decodeURIComponent(m[1]) : null;
    var orgMode = document.documentElement.dataset.themeMode || 'system';
    var mode = userMode || orgMode;
    var isDark = mode === 'dark' ||
      (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) document.documentElement.classList.add('dark');
  } catch(e) {}
})();
`;