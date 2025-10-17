import fetch from 'node-fetch';

// Test the GeneratorV2 service
async function testGeneratorV2() {
  const testPayload = {
    domain: "example.com",
    emailType: "promotion",
    designAesthetic: "bold-contrasting",
    tone: "bold",
    userContext: "Summer sale promotion with 50% off all items",
    imageContext: "Outdoor lifestyle with people enjoying summer activities",
    products: [
      {
        title: "Summer Collection",
        subtitle: "Lightweight and breathable fabrics",
        price: "$49.99",
        imageUrl: "https://via.placeholder.com/300x300",
        buttonUrl: "https://example.com/summer-collection"
      },
      {
        title: "Beach Essentials",
        subtitle: "Everything you need for the perfect beach day",
        price: "$29.99",
        imageUrl: "https://via.placeholder.com/300x300",
        buttonUrl: "https://example.com/beach-essentials"
      }
    ],
    brandData: {
      brand: {
        title: "SummerStyle Co",
        description: "Premium summer fashion and lifestyle products",
        colors: [
          { hex: "#FF6B35", name: "Sunset Orange" },
          { hex: "#004E89", name: "Ocean Blue" }
        ]
      }
    },
    customHeroImage: true,
    savedHeroImageUrl: null
  };

  try {
    console.log('🧪 Testing GeneratorV2 service...');
    console.log('📤 Sending test payload:', JSON.stringify(testPayload, null, 2));
    
    const response = await fetch('http://localhost:3002/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Request failed:', response.status, errorText);
      return;
    }

    const result = await response.json();
    console.log('✅ GeneratorV2 response:');
    console.log('📧 Email Type:', result.emailType);
    console.log('🎨 Design Aesthetic:', result.designAesthetic);
    console.log('🖼️ Hero Image URL:', result.heroImageUrl);
    console.log('📏 MJML Length:', result.mjml?.length || 0, 'characters');
    console.log('⏰ Generated At:', result.generatedAt);
    
    if (result.mjml) {
      console.log('📄 MJML Preview (first 200 chars):');
      console.log(result.mjml.substring(0, 200) + '...');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testGeneratorV2();
