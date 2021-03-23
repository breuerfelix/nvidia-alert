const fetch = require('node-fetch');
const {sleep} = require('./utils');

function constructLink(locale) {
  const queryParam = `?page=1&limit=9&locale=${locale}&manufacturer=NVIDIA&manufacturer_filter=NVIDIA~5`;

  const websiteLink = `https://www.nvidia.com/${locale}/shop/geforce/` + queryParam;
  const productLink = 'https://api.nvidia.partners/edge/product/search' + queryParam;

  return {productLink, websiteLink};
}

async function getProducts(locales) {
  let allProducts = [];
  for (const locale of Object.keys(locales)) {
    const {productLink, websiteLink} = constructLink(locale);
    const res = await fetch(productLink);
    const data = await res.json();
    const { featuredProduct, productDetails } = data.searchedProducts;

    let products = [ featuredProduct, ...productDetails ];
    products = products.map(prd => ({...prd, locale, websiteLink}));
    allProducts = [...allProducts, ...products];
    await sleep(3);
  }

  return allProducts;
};

module.exports = {
  getProducts,
};
