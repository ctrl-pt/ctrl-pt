const sharp = require('sharp');
sharp(process.argv[2]).png().toFile(process.argv[3]).catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
