import axios from "axios";
import * as cheerio from "cheerio";

export async function scrapeProductsFromDomain(domain) {
  try {
    const scrapingbeeApiKey = process.env.SCRAPINGBEE_API_KEY;
    const url = `https://${domain}`;

    console.log("Scraping from:", url);

    const response = await axios.get(
      `https://app.scrapingbee.com/api/v1/`,
      {
        params: {
          api_key: scrapingbeeApiKey,
          url: url,
          render_js: false
        },
        headers: {
          "User-Agent": "Mozilla/5.0"
        }
      }
    );

    const html = response.data;
    const $ = cheerio.load(html);

    let products = [];

    const generatorMeta = $('meta[name="generator"]').attr("content") || "";
    const isShopify = generatorMeta.toLowerCase().includes("shopify");
    const isWoo = generatorMeta.toLowerCase().includes("woocommerce");

    console.log(
      `Detected platform: ${
        isShopify ? "Shopify" : isWoo ? "WooCommerce" : "Unknown"
      }`
    );

    function absolute(urlPart) {
      if (!urlPart) return "";
      if (urlPart.startsWith("http")) return urlPart;
      if (urlPart.startsWith("//")) return "https:" + urlPart;
      if (urlPart.startsWith("/")) return `https://${domain}${urlPart}`;
      return urlPart;
    }

    if (isShopify) {
      $('a[href*="/products/"]').each((i, el) => {
        if (products.length >= 3) return;

        const link = absolute($(el).attr("href"));
        const name =
          $(el).find("img").attr("alt") || $(el).text().trim();

        // fix: get the best possible product image
        let image = absolute($(el).find("img").attr("src"));
        const srcset = $(el).find("img").attr("srcset");
        if (srcset) {
          const candidates = srcset
            .split(",")
            .map((x) => x.trim().split(" ")[0]);
          image = absolute(candidates[candidates.length - 1]); // largest
        }
        if (image.includes("_")) {
          image = image.replace(/_\d+x\d+\./, ".");
        }

        let description = $(el)
          .closest(".product-card")
          .find(".product-description")
          .text()
          .trim();

        if (!description) {
          description =
            $('meta[property="og:description"]').attr("content") || "";
        }

        if (link && image && name && name.length > 2) {
          products.push({
            name,
            url: link,
            image_url: image,
            description,
          });
        }
      });
    } else if (isWoo) {
      $(".product").each((i, el) => {
        if (products.length >= 3) return;

        const link = absolute($(el).find("a").attr("href"));
        const name =
          $(el).find("h2").text().trim() || $(el).text().trim();

        // fix: get the best possible product image
        let image = absolute($(el).find("img").attr("src"));
        const srcset = $(el).find("img").attr("srcset");
        if (srcset) {
          const candidates = srcset
            .split(",")
            .map((x) => x.trim().split(" ")[0]);
          image = absolute(candidates[candidates.length - 1]); // largest
        }
        if (image.includes("_")) {
          image = image.replace(/_\d+x\d+\./, ".");
        }

        let description = $(el)
          .find(".woocommerce-product-details__short-description")
          .text()
          .trim();

        if (!description) {
          description =
            $('meta[property="og:description"]').attr("content") || "";
        }

        if (link && image && name && name.length > 2) {
          products.push({
            name,
            url: link,
            image_url: image,
            description,
          });
        }
      });
    }

    if (products.length === 0) {
      $("a:has(img)").each((i, el) => {
        if (products.length >= 3) return;

        const link = absolute($(el).attr("href"));
        const name =
          $(el).find("img").attr("alt") || $(el).text().trim();

        let image = absolute($(el).find("img").attr("src"));
        const srcset = $(el).find("img").attr("srcset");
        if (srcset) {
          const candidates = srcset
            .split(",")
            .map((x) => x.trim().split(" ")[0]);
          image = absolute(candidates[candidates.length - 1]);
        }
        if (image.includes("_")) {
          image = image.replace(/_\d+x\d+\./, ".");
        }

        let description =
          $('meta[property="og:description"]').attr("content") || "";

        if (link && image && name && name.length > 2) {
          products.push({
            name,
            url: link,
            image_url: image,
            description,
          });
        }
      });
    }

    console.log("Final products:", products);
    return products;
  } catch (err) {
    console.error("Scraper error:", err.message);
    return [];
  }
}
