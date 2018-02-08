import {
  loadData, fetch, caches, parseUrl, getProxyUrl, getProxyHeaders, Response
} from '../platform/common.js';

const proxyHandler = (proxyRequest, paths) => {
  const config = loadData(`${paths.dataPath}config.json`).then(r => r.json());

  /*
    Go out to the networks.
  */
  const url = parseUrl(proxyRequest); // The URL we want to fetch.

  return config.then(c => {
    if (c.columns.map(col => col.feedUrl).indexOf(url) < 0 && url.endsWith('/all.rss') == false) {
      // The proxyRequest to proxy is not in the list of configured urls
      return new Response('Proxy feed not configured', {status: '401'});
    }
    // Always hit the network, and update the cache so offline (and the streming) renders are ok.
    return caches.match(proxyRequest).then(cachedResponse => {
      const network = fetch(getProxyUrl(proxyRequest), getProxyHeaders(proxyRequest)).then(fetchResponse => {
        if (fetchResponse.ok) {
          // Update the cache, but return the network response
          return caches.open('data')
              .then(cache => (cache) ? cache.put(proxyRequest, fetchResponse.clone()) : undefined)
              .then(_ => fetchResponse);
        }
      });

      const race = [network];
      if (cachedResponse) race.push(cachedResponse);

      return Promise.race(race);
    }).catch(error => {
      console.log('Proxy Fetch Error', error);
      throw error;
    });
  });
};

export const handler = proxyHandler;
