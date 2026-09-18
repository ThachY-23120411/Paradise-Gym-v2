const { runSeed } = require('./seed');

if (require.main === module) {
  runSeed();
}

module.exports = { runInit: runSeed };

