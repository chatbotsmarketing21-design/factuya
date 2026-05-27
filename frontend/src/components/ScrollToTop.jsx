import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Forces the window to scroll to the top whenever the route (pathname) changes.
 * Skips scrolling if the URL has a hash (anchor) so in-page anchors still work.
 */
const ScrollToTop = () => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname, hash]);

  return null;
};

export default ScrollToTop;
