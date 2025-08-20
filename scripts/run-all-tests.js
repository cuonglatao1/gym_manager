const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Gym Manager Testing Suite Runner\n');

const testSuites = [
  {
    name: 'Unit Tests',
    command: 'npm',
    args: ['test'],
    description: 'Running unit tests for controllers, services, and routes'
  },
  {
    name: 'Integration Tests', 
    command: 'npm',
    args: ['test', 'tests/integration'],
    description: 'Running API integration tests'
  },
  {
    name: 'Security Tests',
    command: 'npm', 
    args: ['test', 'tests/security'],
    description: 'Running security audit and penetration tests'
  }
];

async function runTestSuite(testSuite) {
  return new Promise((resolve, reject) => {
    console.log(`\n🔍 ${testSuite.name}`);
    console.log(`📋 ${testSuite.description}`);
    console.log('─'.repeat(60));

    const startTime = Date.now();
    const child = spawn(testSuite.command, testSuite.args, {
      stdio: 'pipe',
      shell: true,
      cwd: process.cwd()
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      process.stdout.write(output);
    });

    child.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      process.stderr.write(output);
    });

    child.on('close', (code) => {
      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);

      console.log(`\n⏱️  Duration: ${duration}s`);
      
      if (code === 0) {
        console.log(`✅ ${testSuite.name} PASSED`);
        resolve({ success: true, stdout, stderr, duration, code });
      } else {
        console.log(`❌ ${testSuite.name} FAILED (exit code: ${code})`);
        resolve({ success: false, stdout, stderr, duration, code });
      }
    });

    child.on('error', (error) => {
      console.error(`💥 Failed to start ${testSuite.name}: ${error.message}`);
      reject(error);
    });
  });
}

async function generateTestReport(results) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY REPORT');
  console.log('='.repeat(80));

  let totalDuration = 0;
  let passedCount = 0;
  let failedCount = 0;

  results.forEach((result, index) => {
    const testSuite = testSuites[index];
    totalDuration += parseFloat(result.duration);
    
    if (result.success) {
      passedCount++;
      console.log(`✅ ${testSuite.name}: PASSED (${result.duration}s)`);
    } else {
      failedCount++;
      console.log(`❌ ${testSuite.name}: FAILED (${result.duration}s) - Exit Code: ${result.code}`);
    }
  });

  console.log('-'.repeat(40));
  console.log(`📈 Total Test Suites: ${results.length}`);
  console.log(`✅ Passed: ${passedCount}`);
  console.log(`❌ Failed: ${failedCount}`);
  console.log(`⏱️  Total Duration: ${totalDuration.toFixed(2)}s`);
  console.log(`📊 Success Rate: ${((passedCount / results.length) * 100).toFixed(1)}%`);

  // Generate detailed report
  const reportPath = path.join(__dirname, '..', 'test-report.json');
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: results.length,
      passed: passedCount,
      failed: failedCount,
      successRate: (passedCount / results.length) * 100,
      totalDuration
    },
    suites: testSuites.map((suite, index) => ({
      name: suite.name,
      description: suite.description,
      success: results[index].success,
      duration: results[index].duration,
      exitCode: results[index].code
    }))
  };

  require('fs').writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📄 Detailed report saved to: ${reportPath}`);

  return report;
}

async function runAllTests() {
  try {
    console.log('🚀 Starting comprehensive testing suite...\n');
    
    const results = [];
    
    for (const testSuite of testSuites) {
      try {
        const result = await runTestSuite(testSuite);
        results.push(result);
      } catch (error) {
        console.error(`💥 Critical error in ${testSuite.name}:`, error.message);
        results.push({
          success: false,
          stdout: '',
          stderr: error.message,
          duration: 0,
          code: -1
        });
      }
    }

    const report = await generateTestReport(results);
    
    // Exit with error if any tests failed
    const hasFailures = results.some(r => !r.success);
    
    if (hasFailures) {
      console.log('\n🚨 Some tests failed. Please review the output above.');
      process.exit(1);
    } else {
      console.log('\n🎉 All tests passed successfully!');
      process.exit(0);
    }

  } catch (error) {
    console.error('💥 Critical error running test suite:', error);
    process.exit(1);
  }
}

// Performance test runner (separate)
async function runPerformanceTests() {
  console.log('⚡ Running Performance Tests...\n');
  
  try {
    const perfTest = require('../tests/performance/load-test');
    
    console.log('🔥 Load Testing...');
    await perfTest.runPerformanceTests();
    
    console.log('\n🧠 Memory Profiling...');
    await perfTest.runProfileTests();
    
    console.log('\n💥 Stress Testing...');
    await perfTest.runStressTest();
    
    console.log('\n✅ Performance tests completed!');
  } catch (error) {
    console.error('❌ Performance tests failed:', error.message);
  }
}

// Check command line arguments
const args = process.argv.slice(2);

if (args.includes('--performance') || args.includes('-p')) {
  runPerformanceTests();
} else if (args.includes('--help') || args.includes('-h')) {
  console.log('🧪 Gym Manager Test Runner\n');
  console.log('Usage:');
  console.log('  node scripts/run-all-tests.js          Run all test suites');
  console.log('  node scripts/run-all-tests.js -p       Run performance tests');
  console.log('  node scripts/run-all-tests.js --help   Show this help\n');
} else {
  runAllTests();
}

module.exports = {
  runAllTests,
  runPerformanceTests,
  generateTestReport
};