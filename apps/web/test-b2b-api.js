// Test B2B API
const fetch = require('node-fetch');

async function testB2B() {
  console.log('🧪 Testing B2B Search API\n');
  
  try {
    const response = await fetch('http://localhost:3000/api/suppliers/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: 'shimano',
        limit: 20
      })
    });

    console.log('Status:', response.status);
    
    const data = await response.json();
    console.log('\nResponse:', JSON.stringify(data, null, 2));
    
    if (data.results) {
      console.log(`\n✅ Found ${data.results.length} results`);
      console.log(`Suppliers: ${data.suppliers?.map(s => s.name).join(', ')}`);
    } else {
      console.log('\n❌ No results');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testB2B();
