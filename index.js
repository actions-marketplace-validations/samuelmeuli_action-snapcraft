const { execSync } = require("child_process");

/**
 * Logs to the console
 */
const log = (msg) => console.log(`\n${msg}`); // eslint-disable-line no-console

/**
 * Executes the provided shell command and redirects stdout/stderr to the console
 */
const run = (cmd, printStdio = true) =>
	execSync(cmd, { encoding: "utf8", stdio: printStdio ? "inherit" : "pipe" });

/**
 * Determines the current operating system (one of ["mac", "windows", "linux"])
 */
const getPlatform = () => {
	switch (process.platform) {
		case "darwin":
			return "mac";
		case "win32":
			return "windows";
		default:
			return "linux";
	}
};

/**
 * Installs Snapcraft on Linux
 */
const runLinuxInstaller = () => {
	// TODO: Remove setting up lxd once the `use-lxd` input is removed
	// as lxd is available on the latest ubuntu by default
	// tag: deprecate_use_lxd
	const useLxd = process.env.INPUT_USE_LXD === "true";
	const lxdNotInstalled = process.env.ImageOS === "ubuntu18";
	const setupLxd = useLxd && lxdNotInstalled;

	run(`sudo snap install snapcraft --classic --channel ${process.env.INPUT_CHANNEL}`);
	if (setupLxd) {
		run("sudo snap install lxd");
		run(`sudo usermod --append --groups lxd ${process.env.USER}`);
	}
	run(`echo /snap/bin >> ${process.env.GITHUB_PATH}`); // Add `/snap/bin` to PATH for subsequent actions
	run("sudo chown root:root /"); // Fix root ownership
	if (setupLxd) {
		run("sudo /snap/bin/lxd.migrate -yes");
		run("sudo /snap/bin/lxd waitready");
		run("sudo /snap/bin/lxd init --auto");
	}
};

/**
 * Installs Snapcraft on macOS
 */
const runMacInstaller = () => {
	run("brew install snapcraft");
};

/**
 * Installs Snapcraft and logs the user in
 */
const runAction = () => {
	const platform = getPlatform();

	// Install Snapcraft
	if (platform === "windows") {
		log("Snapcraft is not yet available for Windows. Skipping");
		process.exit(0);
	} else if (process.env.INPUT_SKIP_INSTALL === "true") {
		log("Skipping install");
	} else if (platform === "linux") {
		log("Installing Snapcraft for Linux…");
		runLinuxInstaller();
	} else if (platform === "mac") {
		log("Installing Snapcraft for macOS…");
		runMacInstaller();
	} else {
		log("Unknown platform");
		process.exit(1);
	}

	const snapcraftPath =
		platform === "linux" ? "/snap/bin/snapcraft" : run("which snapcraft", false).trim();
	log(`Snapcraft is installed at ${snapcraftPath}`);
};

runAction();
