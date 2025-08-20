const autocannon = require('autocannon');

// Performance test configuration
const performanceTests = [
  {
    name: 'Members API Load Test',
    url: 'http://localhost:3000/api/members',
    method: 'GET',
    headers: {
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' // You'll need to replace with actual token
    },
    connections: 10,
    duration: 30
  },
  {
    name: 'Auth Login Load Test',
    url: 'http://localhost:3000/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: 'test@gym.com',
      password: 'password123'
    }),
    connections: 5,
    duration: 15
  },
  {
    name: 'Equipment API Load Test',
    url: 'http://localhost:3000/api/equipment',
    method: 'GET',
    headers: {
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' // Replace with actual token
    },
    connections: 8,
    duration: 20
  }
];

async function runPerformanceTests() {
  console.log('🚀 Starting Performance Tests...\n');

  for (const test of performanceTests) {
    console.log(`📊 Running: ${test.name}`);
    console.log(`URL: ${test.url}`);
    console.log(`Connections: ${test.connections}, Duration: ${test.duration}s\n`);

    try {
      const result = await autocannon({
        url: test.url,
        method: test.method,
        headers: test.headers,
        body: test.body,
        connections: test.connections,
        duration: test.duration
      });

      console.log('✅ Results:');
      console.log(`   Requests/sec: ${result.requests.mean.toFixed(2)}`);
      console.log(`   Latency (avg): ${result.latency.mean.toFixed(2)}ms`);
      console.log(`   Latency (p95): ${result.latency.p95.toFixed(2)}ms`);
      console.log(`   Total Requests: ${result.requests.total}`);
      console.log(`   Total Errors: ${result.errors}`);
      console.log(`   Throughput: ${(result.throughput.mean / 1024 / 1024).toFixed(2)} MB/sec`);
      
      // Performance thresholds
      const thresholds = {
        requestsPerSec: 50,
        avgLatency: 500,
        errorRate: 0.01
      };

      const errorRate = result.errors / result.requests.total;
      
      console.log('\n🎯 Performance Analysis:');
      console.log(`   Requests/sec: ${result.requests.mean >= thresholds.requestsPerSec ? '✅ PASS' : '❌ FAIL'} (${result.requests.mean.toFixed(2)} >= ${thresholds.requestsPerSec})`);
      console.log(`   Avg Latency: ${result.latency.mean <= thresholds.avgLatency ? '✅ PASS' : '❌ FAIL'} (${result.latency.mean.toFixed(2)}ms <= ${thresholds.avgLatency}ms)`);
      console.log(`   Error Rate: ${errorRate <= thresholds.errorRate ? '✅ PASS' : '❌ FAIL'} (${(errorRate * 100).toFixed(2)}% <= ${(thresholds.errorRate * 100).toFixed(2)}%)`);

    } catch (error) {
      console.error(`❌ Test failed: ${error.message}`);
    }

    console.log('\n' + '='.repeat(80) + '\n');
  }

  console.log('🏁 Performance testing completed!');
}

// Memory and CPU profiling function
async function runProfileTests() {
  console.log('🔍 Starting Memory and CPU Profiling...\n');

  const profileTests = [
    {
      name: 'CPU Profile - Members API',
      url: 'http://localhost:3000/api/members',
      connections: 20,
      duration: 10
    },
    {
      name: 'Memory Profile - Equipment API',
      url: 'http://localhost:3000/api/equipment', 
      connections: 15,
      duration: 15
    }
  ];

  for (const test of profileTests) {
    console.log(`🧠 Running: ${test.name}`);
    
    const startMemory = process.memoryUsage();
    const startTime = process.hrtime();

    try {
      await autocannon({
        url: test.url,
        connections: test.connections,
        duration: test.duration,
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' // Replace with actual token
        }
      });

      const endTime = process.hrtime(startTime);
      const endMemory = process.memoryUsage();

      console.log('📈 Resource Usage:');
      console.log(`   CPU Time: ${endTime[0]}s ${(endTime[1] / 1000000).toFixed(2)}ms`);
      console.log(`   Memory - RSS: ${((endMemory.rss - startMemory.rss) / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Memory - Heap Used: ${((endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Memory - External: ${((endMemory.external - startMemory.external) / 1024 / 1024).toFixed(2)} MB`);

    } catch (error) {
      console.error(`❌ Profile test failed: ${error.message}`);
    }

    console.log('\n' + '-'.repeat(60) + '\n');
  }
}

// Stress testing function
async function runStressTest() {
  console.log('⚡ Starting Stress Test...\n');

  const stressConfig = {
    name: 'High Load Stress Test',
    url: 'http://localhost:3000/api/members',
    method: 'GET',
    headers: {
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' // Replace with actual token
    },
    connections: 100, // High concurrency
    duration: 60 // 1 minute
  };

  console.log(`🔥 Running stress test with ${stressConfig.connections} connections for ${stressConfig.duration}s`);

  try {
    const result = await autocannon(stressConfig);

    console.log('💥 Stress Test Results:');
    console.log(`   Peak Requests/sec: ${result.requests.max}`);
    console.log(`   Average Requests/sec: ${result.requests.mean.toFixed(2)}`);
    console.log(`   Peak Latency: ${result.latency.max}ms`);
    console.log(`   Average Latency: ${result.latency.mean.toFixed(2)}ms`);
    console.log(`   99th Percentile Latency: ${result.latency.p99}ms`);
    console.log(`   Total Requests: ${result.requests.total}`);
    console.log(`   Total Errors: ${result.errors}`);
    console.log(`   Error Rate: ${((result.errors / result.requests.total) * 100).toFixed(2)}%`);

    // Stress test thresholds
    const errorRate = result.errors / result.requests.total;
    console.log('\n🎯 Stress Test Analysis:');
    console.log(`   System Stability: ${errorRate < 0.05 ? '✅ STABLE' : '❌ UNSTABLE'} (${(errorRate * 100).toFixed(2)}% error rate)`);
    console.log(`   Latency Under Load: ${result.latency.p99 < 2000 ? '✅ ACCEPTABLE' : '❌ TOO HIGH'} (${result.latency.p99}ms p99)`);

  } catch (error) {
    console.error(`❌ Stress test failed: ${error.message}`);
  }
}

// Main execution
async function main() {
  console.log('🏋️‍♀️ Gym Manager Performance Testing Suite\n');
  
  try {
    await runPerformanceTests();
    await runProfileTests();
    await runStressTest();
  } catch (error) {
    console.error('❌ Performance testing suite failed:', error.message);
    process.exit(1);
  }

  console.log('✅ All performance tests completed!');
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  runPerformanceTests,
  runProfileTests,
  runStressTest
};