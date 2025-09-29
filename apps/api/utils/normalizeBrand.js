export function normalizeBrandDevToPumaStyle(brandDev) {
  const brand = brandDev.brand;

  return {
    storeId: brand.domain.replace(/\W/g, "").toLowerCase(),
    brandData: {
      store_name: brand.title || brand.domain,
      customHeroImage: true,
      store_url: `https://${brand.domain}`,
      logo_url: brand.logos?.[0]?.url || "",
      banner_url: brand.backdrops?.[0]?.url || "",
      backdrops: (brand.backdrops || []).map((b) => ({
        url: b.url,
        colors: (b.colors || []).map((c) => c.name),
        desc: "brand backdrop"
      })),
      fonts: {
        title: brand.fonts?.find(f => f.usage === "title")?.name || "Helvetica",
        body: brand.fonts?.find(f => f.usage === "body")?.name || "Helvetica",
        button: brand.fonts?.find(f => f.usage === "body")?.name || "Helvetica"
      },
      stock_info: null,
      address: null,
      social_links: Object.fromEntries(
        (brand.socials || []).map((s) => [s.type, s.url])
      ),
      button_border_style: "Rounded",
      header_color: brand.colors?.[0]?.hex || "#000000",
      body_color: "#ffffff",
      link_color: brand.colors?.[1]?.hex || "#000000",
      text_color: "#141414",
      primary_color: brand.colors?.[0]?.hex || "#000000",
      button_color: brand.colors?.[0]?.hex || "#000000",
      button_text_color: "#ffffff",
      button_border_color: brand.colors?.[1]?.hex || "#000000",
      description: brand.description || "",
      slogan: brand.slogan || "",
      products: []
    },
    emailType: "",
    userContext: "",
    tone: ""
  };
}
