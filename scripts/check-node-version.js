const requiredMajor = 22;
const current = process.versions.node;
const major = Number(current.split('.')[0]);

if (Number.isNaN(major) || major !== requiredMajor) {
  console.error(
    `[dev] Node ${requiredMajor} is required. You are running ${current}. ` +
      'Run: nvm use 22'
  );
  process.exit(1);
}
