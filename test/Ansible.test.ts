const child_proces = require("node:child_process");

child_proces.execSync('ansible all -u ec2-user -i "54.167.217.114," -a date', {
  encoding: "utf-8",
  stdio: "inherit",
});
