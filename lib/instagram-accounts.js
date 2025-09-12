// instagram-accounts.js
// Server-only. Do NOT send access_token to the client.

const ACCOUNTS = [
    // 🔴 Paste YOUR real tokens here. I'm truncating them in this example.
    { page_id: '660631430474925', ig_user_id: '17841475979833277', name: 'Printerpix India',       username: 'Printerpix.in', access_token: 'EAASxlr8UDJMBPLjPZB25PJr2Ivw6sZCwEZBQ1YW7wcfELFSQO9mZCLPjxWbUrnS76LyCfDt7ZBm7IeoSBCTqOGVchVvn0VO9m8c8XZA8KqX0I3fLPHf4ZC6xfy7CCjEZCkhZAVa6I0R4XTWRFi7TUrL0T3agfXUZCbuYSdmrixjIm0pcdFBZBozvUK0pKZA9EDmphlVHOw8O', is_default: false },
    { page_id: '597366670121953', ig_user_id: '17841473394863543', name: 'Printerpix Germany',    username: 'Printerpix',    access_token: 'EAASxlr8UDJMBPNns1NNpO72tD63a4ZAr8JKT0gKn44wxN4SoeVRZAfltPaZAIxgr2RLae62j1xZA7DtVFuR7SUIX8KvXi79oX6atpVTyoY8f8n4QGo7GNIetQodS3GDTEWvumFGfKv0BHSNBwNkoolZAxJK6ZAXE9Nr47GgrC5zZCPKjMZCFl04cIlxzZCcpUWtABl0Rf', is_default: false },
    { page_id: '268591326644275', ig_user_id: '17841473023057160', name: 'Printerpix Italy',      username: 'Printerpix',    access_token: 'EAASxlr8UDJMBPPhMQ6RdOyZB6QICCueRAxkvDVcxxJjZCSZBEY040FNLZAxsamvtmSLa5wzfPCJtCIZCQiiQH6YBgVec7izA6k1M95OlNCCYBRqHxJC8aY1ZBEth2jcZAydbqbKD60isXJhleVDWebLbeO7z013e6CwBuQQ2JM5kfd4ZCt5KSYZBlHivjSaMAbLZCZBaf4ZD', is_default: false },
    { page_id: '418092741573000', ig_user_id: null,               name: 'Printerpix France',     username: 'Printerpix',    access_token: 'EAASxlr8UDJMBPDjaNd1FDwlXXuyOzlulhqgfr87F465hoJ0EXU9DU6A4IhXAzOOE9SWjZA46CHHcs3HNo0XxZAZAU7bqyuyyG5PVo09jQioaiBZAi332vbF0BTwfXmLWLRtWFidRZCiU15MZAQ4PQwJ9hUUBaZBBV2KVf31ZBd180kgH5J3gANZC3BrP1GrLydZBTJjbPv',    is_default: false },
    { page_id: '127030084070740', ig_user_id: '17841407189368118', name: 'Printerpix USA',        username: 'Printerpix',    access_token: 'EAASxlr8UDJMBPBMNEnBCezJZBuAJK42Y76AZABs5M2DJMuHa3YOWBf7oYExrNWkNZBVSHVt57RZAgHUlvOYwDRd2avKjm2aFxrFObEZBC1ciXa0W9ZCoF7ZAMz1VVRpJA4Y6obqAdBhzc7vsDBBRvXePbLSO0blcjHbCNxz7K0VwCwbWWwZCpztZCJ6JLYdUaY7TjblUZD',  is_default: false },
    { page_id: '201456846558639', ig_user_id: '17841401459625954', name: 'Printerpix UK',         username: 'Printerpix',    access_token: 'EAASxlr8UDJMBPPFnGg0aZCnF1tvHsjcG2wFaN0HhWVZAdc9ZAsf0hMwEPdRSTQmShHHZC62b07a8vEvx8326d8KZA2EZBjO2oDAmX0zuNE8xF4Mhbknwqa6fiEsuTMCdkm7bAxeM21yXavr0wCuS032NQydMU0cZBVJOyB3QMc9S73jiXPpETPDJUGuvFmKVbT7Kq8ZD',    is_default: true  },
    { page_id: '756754841001746', ig_user_id: '17841473781701086', name: 'Printerpix Spain',      username: 'Printerpix',    access_token: 'EAASxlr8UDJMBPAarkZAZCt7xMXuheWdbtQJDFoZCbjMgtdkuqZCzBRdlK5Pnou3eRsUQbKZCtlgJBdWgxmIN6uFLxZBGcm3ZB1cd86FSOokmUryjT6DVA0Xw4o1ZA90QZBHOwgNcRT985xO7765YHwFZCRoBktCmd7R0qXy5LqX9i5JVpu4KSODUxU3HMZCw5CA2vnjuaYX',    is_default: false },
    { page_id: '642238709183461', ig_user_id: null,               name: 'Printerpix Netherlands', username: 'Printerpix',    access_token: 'EAASxlr8UDJMBPPD1Vov64u8ysUcNCLaomOU8b156sedkKPZB8htLNDDsHQyNh2xP00MZAvkBQZBc97sTZAZBv7Un4qZCS8i5dgHkRPrjZAN6DiS5aNiZAdmZBKrSF5nsxCfGI7Qs1KVaqOSZCcF4B5nBWZAiCr2iNS1jcb8ylNcWMF4xZAOB8PTmp0uRHzm43WIDxU5rSYgA',    is_default: false }
  ];
  
  function getAccountsPublic() {
    // Strip tokens before returning to client
    return ACCOUNTS.map(({ access_token, ...rest }) => rest);
  }
  
  function getAccountByPageId(pageId) {
    return ACCOUNTS.find(a => a.page_id.toString() === pageId.toString());
  }
  
  function pickAccount(rawId) {
    // Accept page_id, ig_user_id, username, or name; be lenient.
    const key = (rawId ?? '').toString().trim();
  
    if (!key) {
      const def = ACCOUNTS.find(a => a.is_default);
      return def || null;
    }
  
    let acc = ACCOUNTS.find(a => a.page_id.toString() === key);
    if (acc) return acc;
  
    acc = ACCOUNTS.find(a => (a.ig_user_id || '').toString() === key);
    if (acc) return acc;
  
    const low = key.toLowerCase();
    acc = ACCOUNTS.find(a =>
      (a.username || '').toLowerCase() === low ||
      (a.name || '').toLowerCase() === low
    );
    if (acc) return acc;
  
    // Last-resort fallback to default to keep things working
    const def = ACCOUNTS.find(a => a.is_default);
    return def || null;
  }
  
  export { getAccountsPublic, getAccountByPageId, pickAccount };
